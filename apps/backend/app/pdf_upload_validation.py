"""Bounded PDF signature validation; not a full PDF parser or malware scan."""

import hashlib
import re
from dataclasses import dataclass

MAX_PDF_BYTES = 30 * 1024 * 1024
_PDF_HEADER = re.compile(rb"\A%PDF-(?:1\.[0-7]|2\.0)[\r\n]")


class InvalidPdfUploadError(Exception):
    def __init__(self) -> None:
        super().__init__("Invalid PDF upload")


@dataclass(frozen=True, slots=True)
class ValidatedPdfUpload:
    original_filename: str
    mime_type: str
    size_bytes: int
    checksum_sha256: str


def validate_pdf_upload(
    *, original_filename: str, declared_mime: str, content: bytes
) -> ValidatedPdfUpload:
    if (
        not isinstance(original_filename, str)
        or not original_filename
        or len(original_filename) > 255
        or original_filename in {".", ".."}
        or any(
            char in "/\\" or ord(char) < 32 or ord(char) == 127
            for char in original_filename
        )
        or not original_filename.lower().endswith(".pdf")
        or not original_filename[:-4].strip()
        or declared_mime != "application/pdf"
        or not isinstance(content, bytes)
        or not content
        or len(content) > MAX_PDF_BYTES
        or _PDF_HEADER.match(content) is None
    ):
        raise InvalidPdfUploadError()
    return ValidatedPdfUpload(
        original_filename=original_filename,
        mime_type="application/pdf",
        size_bytes=len(content),
        checksum_sha256=hashlib.sha256(content).hexdigest(),
    )
