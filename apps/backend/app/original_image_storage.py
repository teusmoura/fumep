"""Isolated MinIO adapter for validated originals; no HTTP or database access."""

import re
from dataclasses import dataclass
from io import BytesIO
from uuid import uuid4

from minio import Minio

from .image_upload_validation import (
    MAX_IMAGE_BYTES,
    ValidatedImageUpload,
    validate_image_upload,
)

PRIVATE_BUCKET = "portal-private"
_KEY_PATTERN = re.compile(r"images/originals/[0-9a-f]{32}\.(?:jpg|png|webp|avif)\Z")
_EXTENSION_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
}


class InvalidStorageKeyError(ValueError):
    pass


class StorageReadLimitError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class StoredOriginal:
    storage_key: str
    image: ValidatedImageUpload


def _require_original_key(key: str) -> None:
    if not isinstance(key, str) or _KEY_PATTERN.fullmatch(key) is None:
        raise InvalidStorageKeyError("Invalid original storage key")


class OriginalImageStorage:
    def __init__(self, client: Minio) -> None:
        self._client = client

    def put_image(
        self, *, original_filename: str, declared_mime: str, content: bytes
    ) -> StoredOriginal:
        image = validate_image_upload(
            original_filename=original_filename, declared_mime=declared_mime, content=content
        )
        key = f"images/originals/{uuid4().hex}{_EXTENSION_BY_MIME[image.mime_type]}"
        self._client.put_object(
            bucket_name=PRIVATE_BUCKET,
            object_name=key,
            data=BytesIO(content),
            length=len(content),
            content_type=image.mime_type,
        )
        return StoredOriginal(storage_key=key, image=image)

    def read(self, key: str) -> bytes:
        _require_original_key(key)
        response = self._client.get_object(bucket_name=PRIVATE_BUCKET, object_name=key)
        chunks: list[bytes] = []
        size = 0
        try:
            while size <= MAX_IMAGE_BYTES:
                chunk = response.read(min(64 * 1024, MAX_IMAGE_BYTES + 1 - size))
                if not chunk:
                    return b"".join(chunks)
                size += len(chunk)
                if size > MAX_IMAGE_BYTES:
                    raise StorageReadLimitError("Original exceeds image read limit")
                chunks.append(chunk)
            raise StorageReadLimitError("Original exceeds image read limit")
        finally:
            response.close()
            response.release_conn()

    def remove(self, key: str) -> None:
        _require_original_key(key)
        self._client.remove_object(bucket_name=PRIVATE_BUCKET, object_name=key)
