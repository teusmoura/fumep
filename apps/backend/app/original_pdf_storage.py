"""Isolated private MinIO adapter for validated editorial PDFs."""

import re
from dataclasses import dataclass
from io import BytesIO
from uuid import uuid4

from minio import Minio

from .original_image_storage import PRIVATE_BUCKET, InvalidStorageKeyError, StorageReadLimitError
from .pdf_upload_validation import MAX_PDF_BYTES, ValidatedPdfUpload, validate_pdf_upload

_PDF_KEY_PATTERN = re.compile(r"documents/[0-9a-f]{32}\.pdf\Z")


@dataclass(frozen=True, slots=True)
class StoredPdf:
    storage_key: str
    document: ValidatedPdfUpload


def _require_pdf_key(key: str) -> None:
    if not isinstance(key, str) or _PDF_KEY_PATTERN.fullmatch(key) is None:
        raise InvalidStorageKeyError("Invalid PDF storage key")


class OriginalPdfStorage:
    def __init__(self, client: Minio) -> None:
        self._client = client

    def put_pdf(
        self, *, original_filename: str, declared_mime: str, content: bytes
    ) -> StoredPdf:
        document = validate_pdf_upload(
            original_filename=original_filename, declared_mime=declared_mime, content=content
        )
        key = f"documents/{uuid4().hex}.pdf"
        self._client.put_object(
            bucket_name=PRIVATE_BUCKET,
            object_name=key,
            data=BytesIO(content),
            length=len(content),
            content_type=document.mime_type,
        )
        return StoredPdf(storage_key=key, document=document)

    def read(self, key: str) -> bytes:
        _require_pdf_key(key)
        response = self._client.get_object(bucket_name=PRIVATE_BUCKET, object_name=key)
        chunks: list[bytes] = []
        size = 0
        try:
            while size <= MAX_PDF_BYTES:
                chunk = response.read(min(64 * 1024, MAX_PDF_BYTES + 1 - size))
                if not chunk:
                    return b"".join(chunks)
                size += len(chunk)
                if size > MAX_PDF_BYTES:
                    raise StorageReadLimitError("Original exceeds PDF read limit")
                chunks.append(chunk)
            raise StorageReadLimitError("Original exceeds PDF read limit")
        finally:
            response.close()
            response.release_conn()

    def remove(self, key: str) -> None:
        _require_pdf_key(key)
        self._client.remove_object(bucket_name=PRIVATE_BUCKET, object_name=key)
