"""Contract tests; real MinIO is opt-in through FUMEP_MINIO_TEST_* variables."""

import hashlib
import os
from io import BytesIO

import pytest
from minio import Minio
from minio.error import S3Error

from app.image_upload_validation import MAX_IMAGE_BYTES, InvalidImageUploadError
from app.original_image_storage import (
    PRIVATE_BUCKET,
    InvalidStorageKeyError,
    OriginalImageStorage,
    StorageReadLimitError,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\x0dIHDR" + b"\x00" * 13


class FakeResponse:
    def __init__(self, content: bytes) -> None:
        self.stream = BytesIO(content)
        self.closed = False
        self.released = False

    def read(self, amount: int) -> bytes:
        return self.stream.read(amount)

    def close(self) -> None:
        self.closed = True
        self.stream.close()

    def release_conn(self) -> None:
        self.released = True


class FakeMinio:
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}
        self.response: FakeResponse | None = None
        self.fail_on: str | None = None

    def put_object(
        self, *, bucket_name: str, object_name: str, data: BytesIO, length: int, content_type: str
    ) -> None:
        if self.fail_on == "put":
            raise RuntimeError("storage unavailable")
        assert bucket_name == PRIVATE_BUCKET
        assert content_type == "image/png"
        self.objects[(bucket_name, object_name)] = data.read(length)

    def get_object(self, *, bucket_name: str, object_name: str) -> FakeResponse:
        if self.fail_on == "get":
            raise RuntimeError("storage unavailable")
        self.response = FakeResponse(self.objects[(bucket_name, object_name)])
        return self.response

    def remove_object(self, *, bucket_name: str, object_name: str) -> None:
        if self.fail_on == "remove":
            raise RuntimeError("storage unavailable")
        del self.objects[(bucket_name, object_name)]


def _put(storage: OriginalImageStorage, content: bytes = PNG):
    return storage.put_image(
        original_filename="foto.png", declared_mime="image/png", content=content
    )


def test_validated_original_round_trips_in_private_bucket() -> None:
    client = FakeMinio()
    storage = OriginalImageStorage(client)  # type: ignore[arg-type]
    saved = _put(storage)
    assert saved.storage_key.startswith("images/originals/")
    assert saved.storage_key.endswith(".png")
    assert "foto" not in saved.storage_key
    assert saved.image.checksum_sha256 == hashlib.sha256(PNG).hexdigest()
    assert storage.read(saved.storage_key) == PNG
    assert client.response is not None
    assert client.response.closed and client.response.released


def test_invalid_image_never_calls_storage() -> None:
    client = FakeMinio()
    storage = OriginalImageStorage(client)  # type: ignore[arg-type]
    with pytest.raises(InvalidImageUploadError):
        storage.put_image(
            original_filename="fake.svg", declared_mime="image/svg+xml", content=b"<svg/>"
        )
    assert client.objects == {}


def test_remove_only_target_key_and_reject_unsafe_keys() -> None:
    client = FakeMinio()
    storage = OriginalImageStorage(client)  # type: ignore[arg-type]
    first = _put(storage)
    second = _put(storage)
    assert first.storage_key != second.storage_key
    for key in ["../other.png", "images/originals/other.png", second.storage_key + "/../x"]:
        with pytest.raises(InvalidStorageKeyError):
            storage.read(key)
        with pytest.raises(InvalidStorageKeyError):
            storage.remove(key)
    storage.remove(first.storage_key)
    assert (PRIVATE_BUCKET, first.storage_key) not in client.objects
    assert storage.read(second.storage_key) == PNG


def test_read_is_bounded_and_releases_connection() -> None:
    client = FakeMinio()
    storage = OriginalImageStorage(client)  # type: ignore[arg-type]
    saved = _put(storage)
    client.objects[(PRIVATE_BUCKET, saved.storage_key)] = PNG + b"x" * MAX_IMAGE_BYTES
    with pytest.raises(StorageReadLimitError):
        storage.read(saved.storage_key)
    assert client.response is not None
    assert client.response.closed and client.response.released


@pytest.mark.parametrize("operation", ["put", "get", "remove"])
def test_storage_failures_propagate(operation: str) -> None:
    client = FakeMinio()
    storage = OriginalImageStorage(client)  # type: ignore[arg-type]
    saved = _put(storage) if operation != "put" else None
    client.fail_on = operation
    with pytest.raises(RuntimeError, match="storage unavailable"):
        if operation == "put":
            _put(storage)
        elif operation == "get":
            assert saved is not None
            storage.read(saved.storage_key)
        else:
            assert saved is not None
            storage.remove(saved.storage_key)


def test_real_minio_round_trip_when_configured() -> None:
    endpoint = os.getenv("FUMEP_MINIO_TEST_ENDPOINT")
    access_key = os.getenv("FUMEP_MINIO_TEST_ACCESS_KEY")
    secret_key = os.getenv("FUMEP_MINIO_TEST_SECRET_KEY")
    if not all([endpoint, access_key, secret_key]):
        pytest.skip("real MinIO test credentials not configured")
    client = Minio(
        endpoint=endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=os.getenv("FUMEP_MINIO_TEST_SECURE", "false") == "true",
    )
    assert client.bucket_exists(PRIVATE_BUCKET)
    storage = OriginalImageStorage(client)
    saved = _put(storage)
    try:
        assert storage.read(saved.storage_key) == PNG
        storage.remove(saved.storage_key)
        with pytest.raises(S3Error) as error:
            client.stat_object(bucket_name=PRIVATE_BUCKET, object_name=saved.storage_key)
        assert error.value.code == "NoSuchKey"
    finally:
        # Only the key generated by this test is touched; cleanup tolerates prior removal.
        client.remove_object(bucket_name=PRIVATE_BUCKET, object_name=saved.storage_key)
