"""Isolated processing lifecycle; state repository is injected, not PostgreSQL."""

from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from .media_metadata import MediaMetadata
from .media_variants import (
    PrivateVariantStorage,
    StoredVariant,
    render_variants,
    thumbnail_key,
    variant_widths,
)
from .media_worker import InvalidMediaOriginalError, MediaOriginalProcessor


class ProcessingRepository(Protocol):
    def get(self, media_id: UUID) -> MediaMetadata | None: ...

    def claim(self, media_id: UUID) -> bool: ...

    def upsert_variant(self, variant: StoredVariant) -> None: ...

    def mark_ready(
        self,
        media_id: UUID,
        width: int,
        height: int,
        expected_keys: tuple[str, ...],
        thumbnail_storage_key: str,
    ) -> None: ...

    def mark_failed(self, media_id: UUID, error_code: str) -> None: ...


@dataclass(frozen=True, slots=True)
class ProcessedImage:
    media_id: UUID
    width: int
    height: int


class MediaPipeline:
    def __init__(
        self,
        repository: ProcessingRepository,
        original_processor: MediaOriginalProcessor,
        variant_storage: PrivateVariantStorage,
    ) -> None:
        self._repository = repository
        self._original_processor = original_processor
        self._variant_storage = variant_storage

    def process(self, media_id: UUID) -> ProcessedImage:
        media = self._repository.get(media_id)
        if media is None or media.id != media_id or media.type != "IMAGE" or media.deletion_status != "NONE":
            raise InvalidMediaOriginalError("MEDIA_NOT_ELIGIBLE")
        if media.processing_status == "READY":
            if media.width is None or media.height is None:
                raise InvalidMediaOriginalError("MEDIA_NOT_ELIGIBLE")
            return ProcessedImage(media_id, media.width, media.height)
        if not self._repository.claim(media_id):
            raise InvalidMediaOriginalError("MEDIA_NOT_ELIGIBLE")
        inspected = self._original_processor.inspect(media_id)
        expected_keys: list[str] = []
        for variant in render_variants(inspected.content, inspected.width, inspected.height):
            stored = self._variant_storage.put(media_id, variant)
            self._repository.upsert_variant(stored)
            expected_keys.append(stored.storage_key)
        if len(expected_keys) != 2 * len(variant_widths(inspected.width)):
            raise RuntimeError("Incomplete media variants")
        thumbnail_storage_key = thumbnail_key(media_id, inspected.width)
        if thumbnail_storage_key not in expected_keys:
            raise RuntimeError("Missing media thumbnail")
        self._repository.mark_ready(
            media_id,
            inspected.width,
            inspected.height,
            tuple(expected_keys),
            thumbnail_storage_key,
        )
        return ProcessedImage(media_id, inspected.width, inspected.height)

    def mark_failed(self, media_id: UUID) -> None:
        self._repository.mark_failed(media_id, "MEDIA_PROCESSING_FAILED")
