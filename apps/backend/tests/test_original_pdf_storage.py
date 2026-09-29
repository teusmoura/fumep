"""Contract tests for private PDF storage; real MinIO is opt-in."""

import hashlib
import os
from io import BytesIO

import pytest
from minio import Minio
from minio.error import S3Error

from app.original_image_storage import PRIVATE_BUCKET, InvalidStorageKeyError, StorageReadLimitError
from app.original_pdf_storage import OriginalPdfStorage
from app.pdf_upload_validation import MAX_PDF_BYTES, InvalidPdfUploadError

PDF = b"%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"


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
        assert content_type == "application/pdf"
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


def _put(storage: OriginalPdfStorage, content: bytes = PDF):
    return storage.put_pdf(
        original_filename="edital.pdf", declared_mime="application/pdf", content=content
    )


def test_valid_pdf_round_trips_in_private_bucket() -> None:
    client = FakeMinio()
    storage = OriginalPdfStorage(client)  # type: ignore[arg-type]
    saved = _put(storage)
    assert saved.storage_key.startswith("documents/")
    assert saved.storage_key.endswith(".pdf")
    assert "edital" not in saved.storage_key
    assert saved.document.checksum_sha256 == hashlib.sha256(PDF).hexdigest()
    assert storage.read(saved.storage_key) == PDF
    assert client.response is not None
    assert client.response.closed and client.response.released


def test_invalid_pdf_never_calls_storage() -> None:
    client = FakeMinio()
    storage = OriginalPdfStorage(client)  # type: ignore[arg-type]
    with pytest.raises(InvalidPdfUploadError):
        storage.put_pdf(
            original_filename="fake.pdf", declared_mime="application/pdf", content=b"<svg/>"
        )
    assert client.objects == {}


def test_remove_only_target_key_and_reject_unsafe_keys() -> None:
    client = FakeMinio()
    storage = OriginalPdfStorage(client)  # type: ignore[arg-type]
    first = _put(storage)
    second = _put(storage)
    assert first.storage_key != second.storage_key
    for key in ["../other.pdf", "documents/other.pdf", second.storage_key + "/../x"]:
        with pytest.raises(InvalidStorageKeyError):
            storage.read(key)
        with pytest.raises(InvalidStorageKeyError):
            storage.remove(key)
    storage.remove(first.storage_key)
    assert (PRIVATE_BUCKET, first.storage_key) not in client.objects
    assert storage.read(second.storage_key) == PDF


def test_read_is_bounded_and_releases_connection() -> None:
    client = FakeMinio()
    storage = OriginalPdfStorage(client)  # type: ignore[arg-type]
    saved = _put(storage)
    client.objects[(PRIVATE_BUCKET, saved.storage_key)] = PDF + b"x" * MAX_PDF_BYTES
    with pytest.raises(StorageReadLimitError):
        storage.read(saved.storage_key)
    assert client.response is not None
    assert client.response.closed and client.response.released


@pytest.mark.parametrize("operation", ["put", "get", "remove"])
def test_storage_failures_propagate(operation: str) -> None:
    client = FakeMinio()
    storage = OriginalPdfStorage(client)  # type: ignore[arg-type]
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
    storage = OriginalPdfStorage(client)
    saved = _put(storage)
    try:
        assert storage.read(saved.storage_key) == PDF
        storage.remove(saved.storage_key)
        with pytest.raises(S3Error) as error:
            client.stat_object(bucket_name=PRIVATE_BUCKET, object_name=saved.storage_key)
        assert error.value.code == "NoSuchKey"
    finally:
        client.remove_object(bucket_name=PRIVATE_BUCKET, object_name=saved.storage_key)
