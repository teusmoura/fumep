"""Session read/logout use cases, without HTTP routes or user persistence."""

from uuid import UUID

from fastapi import Response
from pydantic import BaseModel, ConfigDict, Field

from app.csrf import CsrfService
from app.sessions import RedisSessionStore, Role, clear_session_cookie


class SessionView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    role: Role
    institution_ids: list[UUID]
    csrf_token: str = Field(repr=False)


class SessionUseCases:
    def __init__(self, sessions: RedisSessionStore, csrf: CsrfService) -> None:
        self.sessions = sessions
        self.csrf = csrf

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
            csrf_token=session.csrf_token,
        )

    def logout(
        self,
        token: str | None,
        response: Response,
        *,
        production: bool,
        csrf_token: str | None = None,
        origin: str | None = None,
        referer: str | None = None,
    ) -> None:
        if token is not None:
            if self.sessions.read_and_refresh(token) is not None:
                self.csrf.validate_mutation(
                    method="POST",
                    session_token=token,
                    csrf_token=csrf_token,
                    origin=origin,
                    referer=referer,
                )
            self.sessions.invalidate(token)
        clear_session_cookie(response, production=production)
