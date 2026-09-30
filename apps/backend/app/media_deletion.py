"""Isolated media usage/deletion flow; repository operations require atomic implementations."""

import re
from dataclasses import dataclass
from typing import Literal, Protocol
from uuid import UUID

from minio import Minio

from .authorization import CurrentUserAccess, require_admin
from .original_image_storage import PRIVATE_BUCKET, _require_original_key
from .original_pdf_storage import _require_pdf_key
from .sessions import SessionData

DeletionDecision = Literal["REQUESTED", "MISSING", "USAGE_CONFLICT", "PROCESSING_CONFLICT", "FAILED"]
_VARIANT_KEY = re.compile(r"images/variants/([0-9a-f-]{36})-(?:[1-9][0-9]*)\.(?:webp|avif)\Z")


class MediaDeletionBlockedError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class DeletionPlan:
    media_id: UUID
    original_key: str
    variant_keys: tuple[str, ...]
    attempt: int


@dataclass(frozen=True, slots=True)
class DeletionRequestResult:
    media_id: UUID
    status: Literal["REQUESTED"]
    queued: bool


class DeletionRepository(Protocol):
    """Methods must serialize by media and commit intention before returning."""

    def link_usage(self, media_id: UUID, owner_type: str, owner_id: UUID) -> bool: ...

    def unlink_usage(self, media_id: UUID, owner_type: str, owner_id: UUID) -> None: ...

    def request(self, media_id: UUID) -> DeletionDecision: ...

    def retry_failed(self, media_id: UUID) -> DeletionDecision: ...

    def reserve(self, media_id: UUID) -> DeletionPlan | None: ...

    def complete(self, media_id: UUID) -> None: ...

    def fail(self, media_id: UUID, error_code: str) -> None: ...

    def requested_ids(self) -> tuple[UUID, ...]: ...


class DeletionPublisher(Protocol):
    def enqueue_delete_media(self, media_id: UUID) -> object: ...


class PrivateMediaDeletionStorage:
    def __init__(self, client: Minio) -> None:
        self._client = client

    def remove(self, plan: DeletionPlan) -> None:
        """Validate *all* persisted keys before the first destructive operation."""
        if not isinstance(plan.media_id, UUID):
            raise ValueError("Invalid media identity")
        if plan.original_key.startswith("images/"):
            _require_original_key(plan.original_key)
        else:
            _require_pdf_key(plan.original_key)
        for key in plan.variant_keys:
            match = _VARIANT_KEY.fullmatch(key)
            if match is None or match.group(1) != str(plan.media_id):
                raise ValueError("Invalid variant key")
        for key in dict.fromkeys(plan.variant_keys):
            self._client.remove_object(PRIVATE_BUCKET, key)
        self._client.remove_object(PRIVATE_BUCKET, plan.original_key)


class MediaDeletionService:
    def __init__(
        self,
        repository: DeletionRepository,
        publisher: DeletionPublisher,
        storage: PrivateMediaDeletionStorage,
    ) -> None:
        self._repository = repository
        self._publisher = publisher
        self._storage = storage

    def link_usage(self, media_id: UUID, owner_type: str, owner_id: UUID) -> None:
        if not isinstance(media_id, UUID) or not isinstance(owner_id, UUID) or not owner_type:
            raise ValueError("Invalid media usage")
        if not self._repository.link_usage(media_id, owner_type, owner_id):
            raise MediaDeletionBlockedError("MEDIA_NOT_SELECTABLE")

    def unlink_usage(self, media_id: UUID, owner_type: str, owner_id: UUID) -> None:
        self._repository.unlink_usage(media_id, owner_type, owner_id)

    def request(self, media_id: UUID) -> DeletionRequestResult:
        return self._request(media_id, retry=False)

    def retry_failed(
        self, session: SessionData, current: CurrentUserAccess, media_id: UUID
    ) -> DeletionRequestResult:
        """Require a fresh ADMIN identity for an explicit new deletion cycle."""
        require_admin(session, current)
        return self._request(media_id, retry=True)

    def _request(self, media_id: UUID, *, retry: bool) -> DeletionRequestResult:
        if not isinstance(media_id, UUID):
            raise ValueError("Invalid media ID")
        decision = (
            self._repository.retry_failed(media_id) if retry else self._repository.request(media_id)
        )
        if decision != "REQUESTED":
            raise MediaDeletionBlockedError(decision)
        try:
            self._publisher.enqueue_delete_media(media_id)
        except Exception:
            # The committed intention is intentionally retained for reconciliation.
            return DeletionRequestResult(media_id, "REQUESTED", False)
        return DeletionRequestResult(media_id, "REQUESTED", True)

    def reconcile(self) -> tuple[UUID, ...]:
        """Best-effort replay of fixture intentions; durable scheduling belongs to integration."""
        queued: list[UUID] = []
        for media_id in self._repository.requested_ids():
            try:
                self._publisher.enqueue_delete_media(media_id)
            except Exception:
                continue
            queued.append(media_id)
        return tuple(queued)

    def delete(self, media_id: UUID) -> None:
        plan = self._repository.reserve(media_id)
        if plan is None:
            return
        try:
            self._storage.remove(plan)
            self._repository.complete(media_id)
        except Exception:
            self._repository.fail(media_id, "STORAGE_UNAVAILABLE")
            raise RuntimeError("MEDIA_DELETE_FAILED") from None
