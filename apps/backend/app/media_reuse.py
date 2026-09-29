"""Read-only duplicate offer and media selection, independent of HTTP/storage."""

from dataclasses import dataclass
from typing import Literal, Protocol
from uuid import UUID

from .authorization import CurrentUserAccess, require_admin, require_institutions
from .image_upload_validation import validate_image_upload
from .media_categories import MediaCategory
from .media_metadata import MediaMetadata
from .sessions import SessionData


class MediaNotSelectableError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class SelectedMedia:
    id: UUID
    type: Literal["IMAGE", "DOCUMENT"]
    original_filename: str
    mime_type: str
    size_bytes: int
    category_id: UUID | None


@dataclass(frozen=True, slots=True)
class DuplicateDecision:
    kind: Literal["NEW", "DUPLICATE", "UPLOAD_ANYWAY"]
    checksum_sha256: str
    existing: SelectedMedia | None


class MediaReuseRepository(Protocol):
    def find_by_checksum(self, checksum_sha256: str) -> list[MediaMetadata]: ...

    def get_media(self, media_id: UUID) -> MediaMetadata | None: ...

    def get_category(self, category_id: UUID) -> MediaCategory | None: ...


class MediaReuseService:
    def __init__(self, repository: MediaReuseRepository) -> None:
        self._repository = repository

    @staticmethod
    def _authenticate(session: SessionData, current: CurrentUserAccess) -> None:
        if current.role == "ADMIN":
            require_admin(session, current)
        else:
            require_institutions(session, current, current.institution_ids)

    def _eligible(self, media: MediaMetadata, current: CurrentUserAccess) -> bool:
        if media.deletion_status != "NONE" or media.processing_status != "READY":
            return False
        if media.type != "IMAGE" and not (
            media.type == "DOCUMENT" and media.mime_type == "application/pdf"
        ):
            return False
        if media.category_id is None:
            return current.role == "ADMIN"
        category = self._repository.get_category(media.category_id)
        if category is None:
            return False
        return current.role == "ADMIN" or (
            category.institution_id is not None
            and category.institution_id in current.institution_ids
        )

    @staticmethod
    def _selection(media: MediaMetadata) -> SelectedMedia:
        if media.type not in {"IMAGE", "DOCUMENT"}:
            raise MediaNotSelectableError()
        return SelectedMedia(
            id=media.id,
            type=media.type,
            original_filename=media.original_filename,
            mime_type=media.mime_type,
            size_bytes=media.size_bytes,
            category_id=media.category_id,
        )

    def review_image(
        self,
        session: SessionData,
        current: CurrentUserAccess,
        *,
        original_filename: str,
        declared_mime: str,
        content: bytes,
        upload_anyway: bool = False,
    ) -> DuplicateDecision:
        self._authenticate(session, current)
        if type(upload_anyway) is not bool:
            raise ValueError("upload_anyway must be boolean")
        image = validate_image_upload(
            original_filename=original_filename,
            declared_mime=declared_mime,
            content=content,
        )
        checksum = image.checksum_sha256
        if upload_anyway:
            return DuplicateDecision("UPLOAD_ANYWAY", checksum, None)
        candidates = sorted(
            self._repository.find_by_checksum(checksum),
            key=lambda media: (media.created_at, str(media.id)),
        )
        for media in candidates:
            if (
                media.type == "IMAGE"
                and media.mime_type == image.mime_type
                and media.size_bytes == image.size_bytes
                and self._eligible(media, current)
            ):
                return DuplicateDecision("DUPLICATE", checksum, self._selection(media))
        return DuplicateDecision("NEW", checksum, None)

    def select(
        self, session: SessionData, current: CurrentUserAccess, media_id: UUID
    ) -> SelectedMedia:
        self._authenticate(session, current)
        media = self._repository.get_media(media_id)
        if media is None or not self._eligible(media, current):
            raise MediaNotSelectableError()
        return self._selection(media)
