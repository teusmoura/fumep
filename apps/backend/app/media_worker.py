"""RQ media Worker checkpoint: inspect originals, without database writes."""

import hmac
from contextvars import ContextVar
from dataclasses import dataclass
from io import BytesIO
from typing import Protocol
from uuid import UUID

from PIL import Image, ImageOps, UnidentifiedImageError
from redis import Redis
from rq import Queue, SimpleWorker
from rq import get_current_job

from .image_upload_validation import validate_image_upload
from .media_metadata import MediaMetadata
from .media_queue import MediaQueueConfig
from .original_image_storage import OriginalImageStorage

MAX_IMAGE_PIXELS = 40_000_000
_FORMAT_BY_MIME = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/avif": "AVIF",
}


class InvalidMediaOriginalError(ValueError):
    pass


class MediaProcessingError(RuntimeError):
    pass


class MediaReader(Protocol):
    def get(self, media_id: UUID) -> MediaMetadata | None: ...


@dataclass(frozen=True, slots=True)
class ImageInspection:
    media_id: UUID
    width: int
    height: int
    content: bytes
    mime_type: str


class MediaOriginalProcessor:
    def __init__(self, media_reader: MediaReader, storage: OriginalImageStorage) -> None:
        self._media_reader = media_reader
        self._storage = storage

    def inspect(self, media_id: UUID) -> ImageInspection:
        media = self._media_reader.get(media_id)
        if (
            media is None
            or media.id != media_id
            or media.type != "IMAGE"
            or media.deletion_status != "NONE"
            or media.processing_status not in {"PENDING", "PROCESSING"}
        ):
            raise InvalidMediaOriginalError("MEDIA_NOT_ELIGIBLE")
        content = self._storage.read(media.storage_key)
        validated = validate_image_upload(
            original_filename=media.original_filename,
            declared_mime=media.mime_type,
            content=content,
        )
        if (
            len(content) != media.size_bytes
            or not hmac.compare_digest(
                validated.checksum_sha256, media.checksum_sha256
            )
        ):
            raise InvalidMediaOriginalError("MEDIA_INTEGRITY_FAILED")
        try:
            with Image.open(BytesIO(content)) as image:
                if (
                    image.format != _FORMAT_BY_MIME.get(media.mime_type)
                    or image.width <= 0
                    or image.height <= 0
                    or image.width * image.height > MAX_IMAGE_PIXELS
                ):
                    raise InvalidMediaOriginalError("MEDIA_DECODE_REJECTED")
                image.load()
                displayed = ImageOps.exif_transpose(image)
                try:
                    return ImageInspection(
                        media_id=media_id,
                        width=displayed.width,
                        height=displayed.height,
                        content=content,
                        mime_type=media.mime_type,
                    )
                finally:
                    displayed.close()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise InvalidMediaOriginalError("MEDIA_DECODE_REJECTED") from exc


class MediaJobResult(Protocol):
    media_id: UUID
    width: int
    height: int


class MediaJobProcessor(Protocol):
    def process(self, media_id: UUID) -> MediaJobResult: ...

    def mark_failed(self, media_id: UUID) -> None: ...


_active_processor: ContextVar[MediaJobProcessor | None] = ContextVar(
    "active_media_processor", default=None
)


def process_media(media_id: str) -> dict[str, int | str]:
    """RQ entrypoint; only a canonical UUID crosses the queue boundary."""
    processor = _active_processor.get()
    if processor is None:
        raise MediaProcessingError("MEDIA_WORKER_NOT_CONFIGURED")
    try:
        parsed_id = UUID(media_id)
        if str(parsed_id) != media_id:
            raise ValueError("non-canonical UUID")
        inspection = processor.process(parsed_id)
    except Exception:
        job = get_current_job()
        if "parsed_id" in locals() and (job is None or not job.retries_left):
            try:
                processor.mark_failed(parsed_id)
            except Exception:
                pass  # A falha do registro não pode virar sucesso do job.
        raise MediaProcessingError("MEDIA_INSPECTION_FAILED") from None
    return {
        "media_id": str(inspection.media_id),
        "width": inspection.width,
        "height": inspection.height,
    }


def run_worker(
    client: Redis,
    processor: MediaJobProcessor,
    *,
    config: MediaQueueConfig | None = None,
    burst: bool = False,
) -> bool:
    """Run in a dedicated process; close Redis even on worker failure."""
    queue_config = config or MediaQueueConfig()
    token = _active_processor.set(processor)
    try:
        queue = Queue(queue_config.queue_name, connection=client, serializer="json")
        worker = SimpleWorker([queue], connection=client, serializer="json")
        return worker.work(burst=burst, with_scheduler=True, logging_level="WARNING")
    finally:
        _active_processor.reset(token)
        client.close()
