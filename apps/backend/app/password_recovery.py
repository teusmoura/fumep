"""Password recovery contracts; adapters for DB, mail and revocation come later."""

import hashlib
import re
import secrets
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, SecretStr, field_validator, model_validator

from app.passwords import NewPasswordInput, hash_new_password

RESET_TOKEN_SECONDS = 30 * 60
NEUTRAL_RESPONSE = "Se existir uma conta associada a esse e-mail, enviaremos as instruções."
_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")


class RecoveryEmail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> Any:
        return value.strip().lower() if isinstance(value, str) else value


class ResetTokenInput(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    token: SecretStr

    @model_validator(mode="before")
    @classmethod
    def mask_token_before_validation(cls, data: Any) -> Any:
        if isinstance(data, dict) and isinstance(data.get("token"), str):
            return {**data, "token": SecretStr(data["token"])}
        return data

    @field_validator("token")
    @classmethod
    def require_token_shape(cls, value: SecretStr) -> SecretStr:
        if not _TOKEN_PATTERN.fullmatch(value.get_secret_value()):
            raise ValueError("Invalid reset token")
        return value


class RecoveryAccounts(Protocol):
    def find_active_user_id_by_email(self, normalized_email: str) -> UUID | None: ...


class ResetTokenWriter(Protocol):
    def create(self, *, user_id: UUID, token_hash: str, expires_at: datetime) -> None: ...


class RecoverySender(Protocol):
    def send(self, *, email: str, raw_token: str) -> None: ...


class SessionRevoker(Protocol):
    def revoke_all_for_user(self, user_id: UUID) -> None: ...


class ResetExecutor(Protocol):
    """Atomically validate/lock token+user, revoke, update, consume and audit."""

    def reset(
        self,
        *,
        token_hash: str,
        password_hash: str,
        revoke_sessions: Callable[[UUID], None],
    ) -> bool: ...


def hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("ascii")).hexdigest()


class RecoveryRequestService:
    def __init__(
        self,
        accounts: RecoveryAccounts,
        tokens: ResetTokenWriter,
        sender: RecoverySender,
        *,
        clock: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ) -> None:
        self.accounts = accounts
        self.tokens = tokens
        self.sender = sender
        self.clock = clock

    def request(self, data: RecoveryEmail) -> str:
        try:
            user_id = self.accounts.find_active_user_id_by_email(str(data.email))
            # Generate the same high-entropy material even for unknown accounts.
            raw_token = secrets.token_urlsafe(32)
            token_hash = hash_reset_token(raw_token)
            if user_id is not None:
                self.tokens.create(
                    user_id=user_id,
                    token_hash=token_hash,
                    expires_at=self.clock() + timedelta(seconds=RESET_TOKEN_SECONDS),
                )
                self.sender.send(email=str(data.email), raw_token=raw_token)
        except Exception:
            # The public response must not expose account existence or delivery state.
            # A production adapter must observe failures without logging secrets.
            pass
        return NEUTRAL_RESPONSE


class InvalidResetTokenError(Exception):
    def __init__(self) -> None:
        super().__init__("Invalid or expired reset token")


class PasswordResetService:
    def __init__(self, executor: ResetExecutor, sessions: SessionRevoker) -> None:
        self.executor = executor
        self.sessions = sessions

    def reset(self, token: ResetTokenInput, password: NewPasswordInput) -> None:
        password_hash = hash_new_password(password)
        success = self.executor.reset(
            token_hash=hash_reset_token(token.token.get_secret_value()),
            password_hash=password_hash,
            revoke_sessions=self.sessions.revoke_all_for_user,
        )
        if not success:
            raise InvalidResetTokenError()
