"""Session read/logout use cases, without HTTP routes or user persistence."""

from uuid import UUID

from fastapi import Response
from pydantic import BaseModel, ConfigDict

from app.sessions import RedisSessionStore, Role, clear_session_cookie


class SessionView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    role: Role
    institution_ids: list[UUID]


class SessionUseCases:
    def __init__(self, sessions: RedisSessionStore) -> None:
        self.sessions = sessions

    def read(self, token: str | None) -> SessionView | None:
        if token is None:
            return None
        session = self.sessions.read_and_refresh(token)
        if session is None:
            return None
        return SessionView(
            user_id=session.user_id,
            role=session.role,
            institution_ids=session.institution_ids,
        )

    def logout(self, token: str | None, response: Response, *, production: bool) -> None:
        if token is not None:
            self.sessions.invalidate(token)
        clear_session_cookie(response, production=production)
