"""Bounded pre-storage image signature checks; not a full image decoder."""

import hashlib
from dataclasses import dataclass

MAX_IMAGE_BYTES = 15 * 1024 * 1024
_MIME_BY_EXTENSION = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
}


class InvalidImageUploadError(Exception):
    def __init__(self) -> None:
        super().__init__("Invalid image upload")


@dataclass(frozen=True, slots=True)
class ValidatedImageUpload:
    original_filename: str
    mime_type: str
    size_bytes: int
    checksum_sha256: str


def _detected_mime(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff") and len(content) >= 4:
        return "image/jpeg"
    if (
        content.startswith(b"\x89PNG\r\n\x1a\n")
        and content[8:12] == b"\x00\x00\x00\x0d"
        and content[12:16] == b"IHDR"
    ):
        return "image/png"
    if (
        len(content) >= 20
        and content[:4] == b"RIFF"
        and content[8:12] == b"WEBP"
        and content[12:16] in {b"VP8 ", b"VP8L", b"VP8X"}
    ):
        return "image/webp"
    if len(content) >= 16 and content[4:8] == b"ftyp":
        box_size = int.from_bytes(content[:4], "big")
        if 16 <= box_size <= min(len(content), 1024) and box_size % 4 == 0:
            brands = [content[8:12]] + [
                content[index : index + 4] for index in range(16, box_size, 4)
            ]
            if b"avif" in brands or b"avis" in brands:
                return "image/avif"
    return None


def validate_image_upload(
    *, original_filename: str, declared_mime: str, content: bytes
) -> ValidatedImageUpload:
    if (
        not isinstance(original_filename, str)
        or not original_filename
        or len(original_filename) > 255
        or original_filename in {".", ".."}
        or any(
            char in "/\\" or ord(char) < 32 or ord(char) == 127
            for char in original_filename
        )
        or not isinstance(content, bytes)
        or not content
        or len(content) > MAX_IMAGE_BYTES
    ):
        raise InvalidImageUploadError()
    extension = "." + original_filename.rsplit(".", 1)[-1].lower()
    expected_mime = _MIME_BY_EXTENSION.get(extension)
    if expected_mime is None or declared_mime != expected_mime:
        raise InvalidImageUploadError()
    if _detected_mime(content) != expected_mime:
        raise InvalidImageUploadError()
    return ValidatedImageUpload(
        original_filename=original_filename,
        mime_type=expected_mime,
        size_bytes=len(content),
        checksum_sha256=hashlib.sha256(content).hexdigest(),
    )
