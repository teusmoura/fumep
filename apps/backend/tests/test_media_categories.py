"""In-memory demonstration of category rules, not PostgreSQL persistence."""

from dataclasses import replace
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from app.authorization import AccessDeniedError, CurrentUserAccess
from app.media_categories import (
    CategoryConflictError,
    CategoryNotFoundError,
    CreateMediaCategory,
    InstitutionNotFoundError,
    MediaCategory,
    MediaCategoryService,
)
from app.sessions import Role, SessionData

ETMSL = UUID("00000000-0000-4000-8000-000000000002")
CRAMAM = UUID("00000000-0000-4000-8000-000000000003")
UNKNOWN = UUID("00000000-0000-4000-8000-000000000099")
USER = UUID("00000000-0000-4000-8000-000000000004")
NOW = datetime(2026, 9, 29, tzinfo=timezone.utc)


class MemoryCategoryRepository:
    def __init__(self) -> None:
        self.institutions = {ETMSL, CRAMAM}
        self.rows: dict[UUID, MediaCategory] = {}
        self.writes = 0

    def institution_exists(self, institution_id: UUID) -> bool:
        return institution_id in self.institutions

    def create(self, category: CreateMediaCategory, *, created_by: UUID) -> MediaCategory:
        # Mirrors UNIQUE(institution_id, slug) for non-null institutional scopes.
        if category.institution_id is not None and any(
            row.institution_id == category.institution_id and row.slug == category.slug
            for row in self.rows.values()
        ):
            raise CategoryConflictError()
        row = MediaCategory(
            id=uuid4(),
            institution_id=category.institution_id,
            name=category.name,
            slug=category.slug,
            created_by=created_by,
            created_at=NOW,
            updated_at=NOW,
        )
        self.rows[row.id] = row
        self.writes += 1
        return row

    def list_all(self) -> list[MediaCategory]:
        return list(self.rows.values())

    def get(self, category_id: UUID) -> MediaCategory | None:
        return self.rows.get(category_id)


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


def payload(institution_id: UUID | None, **changes: object) -> dict[str, object]:
    data: dict[str, object] = {
        "institution_id": institution_id,
        "name": " Laboratórios ",
        "slug": "laboratorios",
    }
    data.update(changes)
    return data


def test_admin_creates_global_and_institutional_categories() -> None:
    repo = MemoryCategoryRepository()
    service = MediaCategoryService(repo)
    session, current = subject("ADMIN", frozenset())
    global_category = service.create(session, current, payload(None))
    institutional = service.create(session, current, payload(CRAMAM, slug="cramam"))
    assert global_category.name == "Laboratórios"
    assert global_category.created_by == USER
    assert institutional.institution_id == CRAMAM
    assert {row.id for row in service.list_authorized(session, current)} == {
        global_category.id,
        institutional.id,
    }
    assert service.select(session, current, institutional.id) == institutional


def test_editor_only_creates_lists_and_selects_own_institution() -> None:
    repo = MemoryCategoryRepository()
    service = MediaCategoryService(repo)
    admin, admin_current = subject("ADMIN", frozenset())
    global_category = service.create(admin, admin_current, payload(None))
    foreign = service.create(admin, admin_current, payload(CRAMAM))
    editor, editor_current = subject()
    own = service.create(editor, editor_current, payload(ETMSL))
    assert service.list_authorized(editor, editor_current) == [own]
    assert service.select(editor, editor_current, own.id) == own
    for row in [global_category, foreign]:
        with pytest.raises(CategoryNotFoundError):
            service.select(editor, editor_current, row.id)
    with pytest.raises(CategoryNotFoundError):
        service.select(editor, editor_current, uuid4())


def test_editor_cannot_create_global_or_foreign_category() -> None:
    repo = MemoryCategoryRepository()
    service = MediaCategoryService(repo)
    session, current = subject()
    for institution_id in [None, CRAMAM]:
        with pytest.raises(AccessDeniedError):
            service.create(session, current, payload(institution_id))
    assert repo.writes == 0


@pytest.mark.parametrize(
    "changes",
    [
        {"name": "  "},
        {"name": "x" * 121},
        {"slug": "Invalid Slug"},
        {"slug": "a--b"},
        {"slug": "x" * 121},
        {"institution_id": "not-a-uuid"},
        {"unexpected": True},
    ],
)
def test_invalid_category_is_rejected_without_write(changes: dict[str, object]) -> None:
    repo = MemoryCategoryRepository()
    service = MediaCategoryService(repo)
    session, current = subject()
    data = payload(ETMSL)
    data.update(changes)
    with pytest.raises(ValidationError):
        service.create(session, current, data)
    assert repo.writes == 0


def test_unknown_institution_and_duplicate_scoped_slug_are_rejected() -> None:
    repo = MemoryCategoryRepository()
    service = MediaCategoryService(repo)
    admin, current = subject("ADMIN", frozenset())
    with pytest.raises(InstitutionNotFoundError):
        service.create(admin, current, payload(UNKNOWN))
    service.create(admin, current, payload(ETMSL))
    with pytest.raises(CategoryConflictError):
        service.create(admin, current, payload(ETMSL, name="Outro nome"))
    service.create(admin, current, payload(CRAMAM))
    assert repo.writes == 2


@pytest.mark.parametrize(
    "change",
    [
        {"is_active": False},
        {"id": UNKNOWN},
        {"role": "ADMIN"},
        {"institution_ids": frozenset({ETMSL, CRAMAM})},
    ],
)
def test_stale_or_disabled_user_cannot_access_categories(change: dict[str, object]) -> None:
    repo = MemoryCategoryRepository()
    service = MediaCategoryService(repo)
    session, current = subject()
    changed = replace(current, **change)
    with pytest.raises(AccessDeniedError):
        service.create(session, changed, payload(ETMSL))
    with pytest.raises(AccessDeniedError):
        service.list_authorized(session, changed)
    with pytest.raises(AccessDeniedError):
        service.select(session, changed, uuid4())
    assert repo.writes == 0


def test_editor_without_institutions_fails_closed() -> None:
    repo = MemoryCategoryRepository()
    service = MediaCategoryService(repo)
    session, current = subject(institutions=frozenset())
    with pytest.raises(AccessDeniedError):
        service.list_authorized(session, current)
    with pytest.raises(AccessDeniedError):
        service.create(session, current, payload(ETMSL))
