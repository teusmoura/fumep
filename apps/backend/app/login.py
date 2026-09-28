"""Isolated login use case; HTTP, persistence and rate limits are later slices."""

import secrets
from dataclasses import dataclass, field
from typing import Protocol
from uuid import UUID

from app.passwords import LoginCredentials, NewPasswordInput, hash_new_password, verify_password
from app.sessions import RedisSessionStore, Role


@dataclass(frozen=True, slots=True)
class LoginUser:
    id: UUID
    email: str
    password_hash: str = field(repr=False)
    role: Role = "EDITOR"
    is_active: bool = True
    institution_ids: tuple[UUID, ...] = ()


class UserRepository(Protocol):
    def find_by_email(self, normalized_email: str) -> LoginUser | None: ...


class InvalidCredentialsError(Exception):
    def __init__(self) -> None:
        super().__init__("Invalid credentials")


# The random decoy is generated in memory, never committed or persisted. Missing
# users still exercise Argon2id so the response is not an immediate lookup oracle.
_DECOY_HASH = hash_new_password(NewPasswordInput(password=secrets.token_urlsafe(32)))


class LoginService:
    def __init__(self, users: UserRepository, sessions: RedisSessionStore) -> None:
        self.users = users
        self.sessions = sessions

    def login(self, credentials: LoginCredentials) -> str:
        user = self.users.find_by_email(str(credentials.email))
        valid_password = verify_password(
            credentials, user.password_hash if user is not None else _DECOY_HASH
        )
        if (
            user is None
            or not valid_password
            or not user.is_active
            or (user.role == "EDITOR" and not user.institution_ids)
        ):
            raise InvalidCredentialsError()
        return self.sessions.create(
            user_id=user.id,
            role=user.role,
            institution_ids=user.institution_ids,
        )
