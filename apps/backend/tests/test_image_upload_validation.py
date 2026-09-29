import hashlib

import pytest

from app.image_upload_validation import (
    MAX_IMAGE_BYTES,
    InvalidImageUploadError,
    validate_image_upload,
)

# Header-level fixtures: this stage checks signatures, not full image decoding.
JPEG = b"\xff\xd8\xff\xe0" + b"JFIF\x00" + b"\xff\xd9"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\x0dIHDR" + b"\x00" * 13
WEBP = b"RIFF" + (12).to_bytes(4, "little") + b"WEBPVP8 " + b"\x00" * 4
AVIF = (20).to_bytes(4, "big") + b"ftypavif" + b"\x00" * 4 + b"miaf"


@pytest.mark.parametrize(
    "filename,mime,content",
    [
        ("foto.jpg", "image/jpeg", JPEG),
        ("foto.JPEG", "image/jpeg", JPEG),
        ("foto.png", "image/png", PNG),
        ("foto.webp", "image/webp", WEBP),
        ("foto.avif", "image/avif", AVIF),
    ],
)
def test_allowed_format_signatures_produce_checksum(
    filename: str, mime: str, content: bytes
) -> None:
    result = validate_image_upload(
        original_filename=filename, declared_mime=mime, content=content
    )
    assert result.original_filename == filename
    assert result.mime_type == mime
    assert result.size_bytes == len(content)
    assert result.checksum_sha256 == hashlib.sha256(content).hexdigest()


@pytest.mark.parametrize(
    "filename,mime,content",
    [
        ("foto.png", "image/png", JPEG),
        ("foto.jpg", "image/png", JPEG),
        ("foto.jpg", "image/jpeg", b"not-jpeg"),
        ("foto.svg", "image/svg+xml", b"<svg></svg>"),
        ("foto.png", "image/png", b"\x89PNG\r\n\x1a\n"),
        ("foto.webp", "image/webp", b"RIFF" + b"\x00" * 4 + b"WAVE" + b"\x00" * 8),
        ("foto.avif", "image/avif", (20).to_bytes(4, "big") + b"ftypheic" + b"\x00" * 4),
        ("arquivo.pdf", "application/pdf", b"%PDF-1.7"),
        ("../../foto.png", "image/png", PNG),
        ("folder\\foto.png", "image/png", PNG),
        ("foto\x00.png", "image/png", PNG),
        ("foto\t.png", "image/png", PNG),
        ("foto\x7f.png", "image/png", PNG),
        ("a" * 252 + ".png", "image/png", PNG),
        ("foto.png", "application/octet-stream", PNG),
        ("foto.png", "image/png", PNG[:8]),
        ("foto.png", "image/png", PNG[:8] + b"\x00\x00\x00\x0c" + PNG[12:]),
        ("foto.png", "image/png", b""),
    ],
)
def test_mismatched_unsafe_or_unrecognized_upload_is_rejected(
    filename: str, mime: str, content: bytes
) -> None:
    with pytest.raises(InvalidImageUploadError, match="Invalid image upload"):
        validate_image_upload(
            original_filename=filename, declared_mime=mime, content=content
        )


def test_exactly_fifteen_mib_is_accepted_and_one_byte_more_is_rejected() -> None:
    maximum = PNG + b"\x00" * (MAX_IMAGE_BYTES - len(PNG))
    result = validate_image_upload(
        original_filename="foto.png", declared_mime="image/png", content=maximum
    )
    assert result.size_bytes == MAX_IMAGE_BYTES
    assert result.checksum_sha256 == hashlib.sha256(maximum).hexdigest()
    with pytest.raises(InvalidImageUploadError):
        validate_image_upload(
            original_filename="foto.png",
            declared_mime="image/png",
            content=maximum + b"\x00",
        )


def test_avif_compatible_brand_is_detected_without_accepting_unrelated_brand() -> None:
    compatible = (20).to_bytes(4, "big") + b"ftypmif1" + b"\x00" * 4 + b"avif"
    result = validate_image_upload(
        original_filename="foto.avif", declared_mime="image/avif", content=compatible
    )
    assert result.mime_type == "image/avif"
    animated = (16).to_bytes(4, "big") + b"ftypavis" + b"\x00" * 4
    assert (
        validate_image_upload(
            original_filename="animacao.avif",
            declared_mime="image/avif",
            content=animated,
        ).mime_type
        == "image/avif"
    )


@pytest.mark.parametrize("box_size", [0, 1, 12, 17, 24, 1028])
def test_avif_rejects_invalid_or_truncated_ftyp_boxes(box_size: int) -> None:
    malformed = box_size.to_bytes(4, "big") + AVIF[4:]
    if box_size == 1028:
        malformed = malformed.ljust(box_size, b"\x00")
    with pytest.raises(InvalidImageUploadError):
        validate_image_upload(
            original_filename="foto.avif", declared_mime="image/avif", content=malformed
        )


def test_checksum_differs_when_bytes_differ() -> None:
    first = validate_image_upload(
        original_filename="foto.jpg", declared_mime="image/jpeg", content=JPEG
    )
    second = validate_image_upload(
        original_filename="foto.jpg", declared_mime="image/jpeg", content=JPEG + b"\x00"
    )
    assert first.checksum_sha256 != second.checksum_sha256
