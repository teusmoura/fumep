"""Read-only demonstration; fixtures are not PostgreSQL or MinIO persistence."""

import hashlib
from dataclasses import replace
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest

from app.authorization import AccessDeniedError, CurrentUserAccess
from app.image_upload_validation import InvalidImageUploadError
from app.media_categories import MediaCategory
from app.media_metadata import MediaMetadata
from app.media_reuse import MediaNotSelectableError, MediaReuseService
from app.sessions import Role, SessionData

ETMSL = UUID("00000000-0000-4000-8000-000000000002")
CRAMAM = UUID("00000000-0000-4000-8000-000000000003")
USER = UUID("00000000-0000-4000-8000-000000000004")
NOW = datetime(2026, 9, 29, tzinfo=timezone.utc)
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\x0dIHDR" + b"\x00" * 13
CHECKSUM = hashlib.sha256(PNG).hexdigest()


def subject(
    role: Role = "EDITOR", institutions: frozenset[UUID] = frozenset({ETMSL})
) -> tuple[SessionData, CurrentUserAccess]:
    session = SessionData(
        user_id=USER,
        role=role,
        institution_ids=sorted(institutions),
        csrf_token="x" * 43,
        created_at=1,
        last_activity_at=1,
        absolute_expires_at=100,
    )
    current = CurrentUserAccess(
        id=USER, role=role, is_active=True, institution_ids=institutions
    )
    return session, current


def category(institution_id: UUID | None) -> MediaCategory:
    return MediaCategory(
        id=uuid4(),
        institution_id=institution_id,
        name="Fotos",
        slug="fotos",
        created_by=USER,
        created_at=NOW,
        updated_at=NOW,
    )


def media(category_id: UUID | None, **changes: object) -> MediaMetadata:
    media_id = uuid4()
    data: dict[str, object] = {
        "id": media_id,
        "type": "IMAGE",
        "original_filename": "foto.png",
        "stored_filename": f"{media_id}.png",
        "mime_type": "image/png",
        "size_bytes": len(PNG),
        "storage_key": f"images/originals/{media_id}.png",
        "checksum_sha256": CHECKSUM,
        "processing_status": "READY",
        "processing_error": None,
        "deletion_status": "NONE",
        "category_id": category_id,
        "uploaded_by": USER,
        "created_at": NOW,
    }
    data.update(changes)
    return MediaMetadata.model_validate(data)


class MemoryReuseRepository:
    def __init__(self, rows: list[MediaMetadata], categories: list[MediaCategory]) -> None:
        self.rows = {row.id: row for row in rows}
        self.categories = {row.id: row for row in categories}
        self.lookup_count = 0

    def find_by_checksum(self, checksum_sha256: str) -> list[MediaMetadata]:
        self.lookup_count += 1
        return [row for row in self.rows.values() if row.checksum_sha256 == checksum_sha256]

    def get_media(self, media_id: UUID) -> MediaMetadata | None:
        return self.rows.get(media_id)

    def get_category(self, category_id: UUID) -> MediaCategory | None:
        return self.categories.get(category_id)


def review(service: MediaReuseService, session: SessionData, current: CurrentUserAccess, **options):
    return service.review_image(
        session,
        current,
        original_filename="foto.png",
        declared_mime="image/png",
        content=PNG,
        **options,
    )


def test_authorized_duplicate_is_offered_without_exposing_storage_details() -> None:
    own = category(ETMSL)
    existing = media(own.id)
    repository = MemoryReuseRepository([existing], [own])
    service = MediaReuseService(repository)
    session, current = subject()
    offer = review(service, session, current)
    assert offer.kind == "DUPLICATE"
    assert offer.checksum_sha256 == CHECKSUM
    assert offer.existing is not None and offer.existing.id == existing.id
    assert not hasattr(offer.existing, "storage_key")
    assert not hasattr(offer.existing, "uploaded_by")
    assert service.select(session, current, existing.id) == offer.existing


def test_new_upload_and_explicit_upload_anyway_are_distinct_read_only_decisions() -> None:
    own = category(ETMSL)
    existing = media(own.id)
    repository = MemoryReuseRepository([existing], [own])
    service = MediaReuseService(repository)
    session, current = subject()
    assert review(service, session, current, upload_anyway=True).kind == "UPLOAD_ANYWAY"
    assert repository.lookup_count == 0
    repository.rows.clear()
    assert review(service, session, current).kind == "NEW"
    assert repository.rows == {}


def test_editor_cannot_discover_foreign_global_or_uncategorized_duplicate() -> None:
    foreign = category(CRAMAM)
    global_category = category(None)
    rows = [media(foreign.id), media(global_category.id), media(None)]
    service = MediaReuseService(MemoryReuseRepository(rows, [foreign, global_category]))
    session, current = subject()
    assert review(service, session, current).kind == "NEW"
    for row in rows:
        with pytest.raises(MediaNotSelectableError):
            service.select(session, current, row.id)
    admin, admin_current = subject("ADMIN", frozenset())
    assert review(service, admin, admin_current).kind == "DUPLICATE"
    assert {service.select(admin, admin_current, row.id).id for row in rows} == {
        row.id for row in rows
    }


@pytest.mark.parametrize(
    "changes",
    [
        {"processing_status": "PENDING"},
        {"processing_status": "PROCESSING"},
        {"processing_status": "FAILED"},
        {"deletion_status": "REQUESTED"},
        {"deletion_status": "FAILED"},
        {"type": "VIDEO"},
    ],
)
def test_unavailable_media_is_neither_offered_nor_selectable(changes: dict[str, object]) -> None:
    own = category(ETMSL)
    row = media(own.id, **changes)
    service = MediaReuseService(MemoryReuseRepository([row], [own]))
    session, current = subject()
    assert review(service, session, current).kind == "NEW"
    with pytest.raises(MediaNotSelectableError):
        service.select(session, current, row.id)


def test_selection_rechecks_processing_deletion_and_category_after_offer() -> None:
    own = category(ETMSL)
    row = media(own.id)
    repository = MemoryReuseRepository([row], [own])
    service = MediaReuseService(repository)
    session, current = subject()
    assert review(service, session, current).kind == "DUPLICATE"
    repository.rows[row.id] = row.model_copy(update={"deletion_status": "REQUESTED"})
    with pytest.raises(MediaNotSelectableError):
        service.select(session, current, row.id)
    repository.rows[row.id] = row
    repository.categories[own.id] = own.model_copy(update={"institution_id": CRAMAM})
    with pytest.raises(MediaNotSelectableError):
        service.select(session, current, row.id)


def test_missing_category_fails_closed_even_for_admin() -> None:
    row = media(uuid4())
    service = MediaReuseService(MemoryReuseRepository([row], []))
    session, current = subject("ADMIN", frozenset())
    assert review(service, session, current).kind == "NEW"
    with pytest.raises(MediaNotSelectableError):
        service.select(session, current, row.id)


def test_only_ready_pdf_documents_are_selectable_besides_images() -> None:
    own = category(ETMSL)
    pdf = media(
        own.id,
        type="DOCUMENT",
        original_filename="guia.pdf",
        stored_filename="guia.pdf",
        storage_key="documents/guia.pdf",
        mime_type="application/pdf",
    )
    wrong_document = media(own.id, type="DOCUMENT", mime_type="application/octet-stream")
    service = MediaReuseService(MemoryReuseRepository([pdf, wrong_document], [own]))
    session, current = subject()
    assert review(service, session, current).kind == "NEW"
    assert service.select(session, current, pdf.id).type == "DOCUMENT"
    with pytest.raises(MediaNotSelectableError):
        service.select(session, current, wrong_document.id)


def test_invalid_image_and_non_boolean_override_fail_without_lookup() -> None:
    repository = MemoryReuseRepository([], [])
    service = MediaReuseService(repository)
    session, current = subject()
    with pytest.raises(InvalidImageUploadError):
        service.review_image(
            session, current, original_filename="foto.png", declared_mime="image/png", content=b"bad"
        )
    with pytest.raises(ValueError):
        review(service, session, current, upload_anyway="false")
    assert repository.lookup_count == 0


@pytest.mark.parametrize(
    "change",
    [
        {"is_active": False},
        {"id": uuid4()},
        {"role": "ADMIN"},
        {"institution_ids": frozenset({ETMSL, CRAMAM})},
    ],
)
def test_stale_access_is_denied_before_lookup_or_selection(change: dict[str, object]) -> None:
    repository = MemoryReuseRepository([], [])
    service = MediaReuseService(repository)
    session, current = subject()
    changed = replace(current, **change)
    with pytest.raises(AccessDeniedError):
        review(service, session, changed)
    with pytest.raises(AccessDeniedError):
        service.select(session, changed, uuid4())
    assert repository.lookup_count == 0
