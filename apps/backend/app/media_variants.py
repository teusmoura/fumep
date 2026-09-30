"""Deterministic responsive derivatives for an already validated original."""

import hashlib
from dataclasses import dataclass
from io import BytesIO
from uuid import UUID

from minio import Minio
from minio.error import S3Error
from PIL import Image, ImageOps

from .original_image_storage import PRIVATE_BUCKET

SUGGESTED_WIDTHS = (320, 640, 960, 1280, 1920)
_MIME = {"WEBP": "image/webp", "AVIF": "image/avif"}


@dataclass(frozen=True, slots=True)
class RenderedVariant:
    format: str
    width: int
    height: int
    content: bytes
    checksum_sha256: str


@dataclass(frozen=True, slots=True)
class StoredVariant:
    media_id: UUID
    format: str
    width: int
    height: int
    size_bytes: int
    storage_key: str
    checksum_sha256: str


def variant_widths(original_width: int) -> tuple[int, ...]:
    if type(original_width) is not int or original_width <= 0:
        raise ValueError("Invalid image width")
    return tuple(sorted({*(width for width in SUGGESTED_WIDTHS if width <= original_width), min(original_width, 1920)}))


def thumbnail_key(media_id: UUID, original_width: int) -> str:
    if not isinstance(media_id, UUID):
        raise ValueError("Invalid media ID")
    return f"images/variants/{media_id}-{variant_widths(original_width)[0]}.webp"


def render_variants(original: bytes, expected_width: int, expected_height: int):
    """Yield WEBP then AVIF for each width; smallest WEBP is the thumbnail."""
    with Image.open(BytesIO(original)) as source:
        source.load()
        oriented = ImageOps.exif_transpose(source)
        try:
            if oriented.size != (expected_width, expected_height):
                raise ValueError("Unexpected image dimensions")
            mode = "RGBA" if "A" in oriented.getbands() or "transparency" in oriented.info else "RGB"
            base = oriented.convert(mode)
            try:
                for width in variant_widths(expected_width):
                    height = max(1, round(expected_height * width / expected_width))
                    resized = base.resize((width, height), Image.Resampling.LANCZOS)
                    try:
                        for image_format in ("WEBP", "AVIF"):
                            output = BytesIO()
                            options = {"quality": 80} if image_format == "WEBP" else {"quality": 50, "speed": 6}
                            resized.save(output, format=image_format, **options)
                            content = output.getvalue()
                            yield RenderedVariant(
                                format=image_format,
                                width=width,
                                height=height,
                                content=content,
                                checksum_sha256=hashlib.sha256(content).hexdigest(),
                            )
                    finally:
                        resized.close()
            finally:
                base.close()
        finally:
            oriented.close()


class PrivateVariantStorage:
    def __init__(self, client: Minio) -> None:
        self._client = client

    def put(self, media_id: UUID, variant: RenderedVariant) -> StoredVariant:
        if not isinstance(media_id, UUID) or variant.format not in _MIME:
            raise ValueError("Invalid variant identity")
        key = f"images/variants/{media_id}-{variant.width}.{variant.format.lower()}"
        checksum = variant.checksum_sha256
        try:
            existing = self._client.stat_object(PRIVATE_BUCKET, key)
        except S3Error as error:
            if error.code != "NoSuchKey":
                raise
        else:
            metadata = existing.metadata or {}
            if existing.size == len(variant.content) and metadata.get("x-amz-meta-sha256") == checksum:
                return self._record(media_id, variant, key)
        self._client.put_object(
            bucket_name=PRIVATE_BUCKET,
            object_name=key,
            data=BytesIO(variant.content),
            length=len(variant.content),
            content_type=_MIME[variant.format],
            metadata={"sha256": checksum},
        )
        return self._record(media_id, variant, key)

    @staticmethod
    def _record(media_id: UUID, variant: RenderedVariant, key: str) -> StoredVariant:
        return StoredVariant(
            media_id=media_id,
            format=variant.format,
            width=variant.width,
            height=variant.height,
            size_bytes=len(variant.content),
            storage_key=key,
            checksum_sha256=variant.checksum_sha256,
        )
