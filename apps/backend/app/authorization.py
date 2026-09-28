"""Backend authorization policy independent of HTTP and persistence adapters."""

from dataclasses import dataclass
from uuid import UUID

from app.sessions import Role, SessionData


class AccessDeniedError(Exception):
    def __init__(self) -> None:
        super().__init__("Access denied")


@dataclass(frozen=True, slots=True)
class CurrentUserAccess:
    """Latest user state supplied by a trusted backend repository."""

    id: UUID
    role: Role
    is_active: bool
    institution_ids: frozenset[UUID]


def _require_current_session(session: SessionData, current: CurrentUserAccess) -> None:
    # Permission changes and account deactivation invalidate the old snapshot.
    # A future guard must load current from PostgreSQL, never from the browser.
    if (
        not current.is_active
        or session.user_id != current.id
        or session.role != current.role
        or set(session.institution_ids) != current.institution_ids
    ):
        raise AccessDeniedError()


def require_admin(session: SessionData, current: CurrentUserAccess) -> None:
    """Gate operations reserved for a global administrator."""
    _require_current_session(session, current)
    if current.role != "ADMIN":
        raise AccessDeniedError()


def require_institutions(
    session: SessionData,
    current: CurrentUserAccess,
    required_institution_ids: frozenset[UUID],
) -> None:
    """Gate an institution-scoped operation, including shared content."""
    _require_current_session(session, current)
    if not required_institution_ids:
        raise AccessDeniedError()
    if current.role == "ADMIN":
        return
    if not required_institution_ids.issubset(current.institution_ids):
        raise AccessDeniedError()
