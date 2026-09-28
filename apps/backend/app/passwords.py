"""Credential validation and Argon2id hashing, without a login endpoint."""

from typing import Any

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError
from pydantic import BaseModel, ConfigDict, EmailStr, SecretStr, field_validator, model_validator

MIN_PASSWORD_LENGTH = 10

# Explicit parameters keep newly produced PHC hashes stable across library updates.
# 64 MiB, three iterations and four lanes follow the low-memory RFC 9106 profile.
_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)


class ProtectedPasswordModel(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    @model_validator(mode="before")
    @classmethod
    def mask_password_before_validation(cls, data: Any) -> Any:
        # ValidationError.errors() may include field input, not just its message.
        if isinstance(data, dict) and isinstance(data.get("password"), str):
            return {**data, "password": SecretStr(data["password"])}
        return data


class LoginCredentials(ProtectedPasswordModel):

    email: EmailStr
    password: SecretStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> Any:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("password")
    @classmethod
    def require_nonempty_password(cls, value: SecretStr) -> SecretStr:
        # Login must still verify an existing account with an older short password.
        if not value.get_secret_value():
            raise ValueError("Password is required")
        return value


class NewPasswordInput(ProtectedPasswordModel):

    password: SecretStr

    @field_validator("password")
    @classmethod
    def require_minimum_length(cls, value: SecretStr) -> SecretStr:
        # Never strip or normalize a password: spaces and Unicode are significant.
        if len(value.get_secret_value()) < MIN_PASSWORD_LENGTH:
            raise ValueError("Password must contain at least 10 characters")
        return value


def hash_new_password(value: NewPasswordInput) -> str:
    """Return only an encoded Argon2id PHC hash for persistence."""
    return _hasher.hash(value.password.get_secret_value())


def verify_password(value: LoginCredentials, encoded_hash: str) -> bool:
    if not encoded_hash.startswith("$argon2id$"):
        return False
    try:
        return _hasher.verify(encoded_hash, value.password.get_secret_value())
    except (VerificationError, InvalidHashError):
        return False
