from dataclasses import replace
from uuid import UUID

import fakeredis
import pytest

from app.authorization import (
    AccessDeniedError,
    CurrentUserAccess,
    require_admin,
    require_institutions,
)
from app.sessions import RedisSessionStore, Role, SessionData

FUMEP = UUID("00000000-0000-4000-8000-000000000001")
ETMSL = UUID("00000000-0000-4000-8000-000000000002")
CRAMAM = UUID("00000000-0000-4000-8000-000000000003")
USER = UUID("00000000-0000-4000-8000-000000000004")


def subject(
    role: Role = "EDITOR", institutions: frozenset[UUID] = frozenset({ETMSL})
) -> tuple[SessionData, CurrentUserAccess]:
    store = RedisSessionStore(fakeredis.FakeRedis(), clock=lambda: 1_000_000)
    token = store.create(user_id=USER, role=role, institution_ids=sorted(institutions))
    session = store.read_and_refresh(token)
    assert session is not None
    current = CurrentUserAccess(
        id=USER, role=role, is_active=True, institution_ids=institutions
    )
    return session, current


def test_admin_can_manage_global_and_any_institution() -> None:
    session, current = subject("ADMIN", frozenset())
    require_admin(session, current)
    require_institutions(session, current, frozenset({FUMEP, ETMSL, CRAMAM}))


def test_editor_cannot_manage_global_resources() -> None:
    session, current = subject()
    with pytest.raises(AccessDeniedError, match="Access denied"):
        require_admin(session, current)


def test_editor_etmsl_can_access_only_etmsl() -> None:
    session, current = subject()
    require_institutions(session, current, frozenset({ETMSL}))
    with pytest.raises(AccessDeniedError):
        require_institutions(session, current, frozenset({CRAMAM}))


def test_shared_content_requires_every_institution_for_editor() -> None:
    session, current = subject(institutions=frozenset({FUMEP, ETMSL}))
    require_institutions(session, current, frozenset({FUMEP, ETMSL}))
    with pytest.raises(AccessDeniedError):
        require_institutions(session, current, frozenset({ETMSL, CRAMAM}))


@pytest.mark.parametrize(
    "change",
    [
        {"is_active": False},
        {"id": UUID("00000000-0000-4000-8000-000000000099")},
        {"role": "ADMIN"},
        {"institution_ids": frozenset({ETMSL, CRAMAM})},
    ],
)
def test_disabled_or_stale_session_cannot_authorize(change: dict[str, object]) -> None:
    session, current = subject()
    changed = replace(current, **change)
    with pytest.raises(AccessDeniedError):
        require_institutions(session, changed, frozenset({ETMSL}))


def test_empty_target_institutions_fail_closed() -> None:
    for role in ("ADMIN", "EDITOR"):
        session, current = subject(role)
        with pytest.raises(AccessDeniedError):
            require_institutions(session, current, frozenset())
