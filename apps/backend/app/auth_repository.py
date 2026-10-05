"""Read existing Drizzle-owned users without changing their schema."""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.authorization import CurrentUserAccess
from app.login import LoginUser


class PostgresUserRepository:
    def __init__(self, engine: Engine) -> None:
        self.engine = engine

    def _row(self, *, email: str | None = None, user_id: UUID | None = None):
        if (email is None) == (user_id is None):
            raise ValueError("Exactly one user lookup key is required")
        query = (
            "SELECT id, email, password_hash, role, is_active FROM users WHERE lower(email) = :value"
            if email is not None else
            "SELECT id, email, password_hash, role, is_active FROM users WHERE id = :value"
        )
        with self.engine.connect() as connection:
            row = connection.execute(
                text(query), {"value": email if email is not None else user_id},
            ).mappings().first()
            if row is None:
                return None
            assignments = tuple(
                connection.execute(
                    text("SELECT institution_id FROM user_institutions WHERE user_id = :user_id ORDER BY institution_id"),
                    {"user_id": row["id"]},
                ).scalars()
            )
        return row, assignments

    def find_by_email(self, normalized_email: str) -> LoginUser | None:
        result = self._row(email=normalized_email)
        if result is None:
            return None
        row, assignments = result
        return LoginUser(
            id=row["id"], email=row["email"], password_hash=row["password_hash"],
            role=row["role"], is_active=row["is_active"], institution_ids=assignments,
        )

    def current_access(self, user_id: UUID) -> CurrentUserAccess | None:
        result = self._row(user_id=user_id)
        if result is None:
            return None
        row, assignments = result
        return CurrentUserAccess(
            id=row["id"], role=row["role"], is_active=row["is_active"],
            institution_ids=frozenset(assignments),
        )
