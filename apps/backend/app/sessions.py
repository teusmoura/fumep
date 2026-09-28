"""Isolated Redis session primitive; login and authorization are later slices."""

import re
import secrets
import time
from collections.abc import Callable, Sequence
from typing import Literal
from uuid import UUID

from fastapi import Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from redis import Redis
from redis.exceptions import WatchError

COOKIE_NAME = "fumep_session"
IDLE_SECONDS = 30 * 60
ABSOLUTE_SECONDS = 8 * 60 * 60
_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")

Role = Literal["ADMIN", "EDITOR"]


class SessionData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    role: Role
    institution_ids: list[UUID]
    csrf_token: str = Field(repr=False, min_length=43, max_length=43, pattern=r"^[A-Za-z0-9_-]{43}$")
    created_at: int
    last_activity_at: int
    absolute_expires_at: int


class RedisSessionStore:
    def __init__(
        self,
        client: Redis,
        *,
        key_prefix: str = "migration:session:",
        clock: Callable[[], int] = lambda: int(time.time()),
    ) -> None:
        if not key_prefix.startswith("migration:"):
            raise ValueError("Migration sessions require an isolated Redis prefix")
        self.client = client
        self.key_prefix = key_prefix
        self.clock = clock

    def _key(self, token: str) -> str:
        if not _TOKEN_PATTERN.fullmatch(token):
            raise ValueError("Invalid session token")
        return f"{self.key_prefix}{token}"

    def create(
        self, *, user_id: UUID, role: Role, institution_ids: Sequence[UUID] = ()
    ) -> str:
        now = self.clock()
        data = SessionData(
            user_id=user_id,
            role=role,
            institution_ids=list(institution_ids),
            csrf_token=secrets.token_urlsafe(32),
            created_at=now,
            last_activity_at=now,
            absolute_expires_at=now + ABSOLUTE_SECONDS,
        )
        for _ in range(3):
            token = secrets.token_urlsafe(32)
            if self.client.set(self._key(token), data.model_dump_json(), ex=IDLE_SECONDS, nx=True):
                return token
        raise RuntimeError("Could not allocate a unique session")

    def read_and_refresh(self, token: str) -> SessionData | None:
        if not _TOKEN_PATTERN.fullmatch(token):
            return None
        key = self._key(token)
        for _ in range(5):
            with self.client.pipeline() as pipe:
                try:
                    pipe.watch(key)
                    raw = pipe.get(key)
                    if raw is None:
                        return None
                    try:
                        data = SessionData.model_validate_json(raw)
                    except ValidationError:
                        pipe.multi()
                        pipe.delete(key)
                        pipe.execute()
                        return None
                    now = self.clock()
                    if (
                        now >= data.last_activity_at + IDLE_SECONDS
                        or now >= data.absolute_expires_at
                    ):
                        pipe.multi()
                        pipe.delete(key)
                        pipe.execute()
                        return None
                    refreshed = data.model_copy(update={"last_activity_at": now})
                    ttl = min(IDLE_SECONDS, data.absolute_expires_at - now)
                    pipe.multi()
                    pipe.set(key, refreshed.model_dump_json(), ex=ttl)
                    pipe.execute()
                    return refreshed
                except WatchError:
                    continue
        raise RuntimeError("Session update contention")

    def invalidate(self, token: str) -> None:
        if _TOKEN_PATTERN.fullmatch(token):
            self.client.delete(self._key(token))


def set_session_cookie(response: Response, token: str, *, production: bool) -> None:
    if not _TOKEN_PATTERN.fullmatch(token):
        raise ValueError("Invalid session token")
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=ABSOLUTE_SECONDS,
        path="/",
        httponly=True,
        secure=production,
        samesite="lax",
    )


def clear_session_cookie(response: Response, *, production: bool) -> None:
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=production,
        httponly=True,
        samesite="lax",
    )
