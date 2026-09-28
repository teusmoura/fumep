"""Media metadata contracts only; no storage access or database mapping."""

import re
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator

MediaType = Literal["IMAGE", "DOCUMENT", "VIDEO", "OTHER"]
ProcessingStatus = Literal["PENDING", "PROCESSING", "READY", "FAILED"]
DeletionStatus = Literal["NONE", "REQUESTED", "FAILED"]


class MediaMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: UUID
    type: MediaType
    original_filename: str = Field(min_length=1, max_length=255)
    stored_filename: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(min_length=3, max_length=150)
    size_bytes: int = Field(ge=0)
    storage_key: str = Field(min_length=1)
    checksum_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    width: int | None = Field(default=None, gt=0)
    height: int | None = Field(default=None, gt=0)
    alt_text: str | None = None
    caption: str | None = None
    is_decorative: bool = False
    processing_status: ProcessingStatus
    processing_error: str | None = None
    deletion_status: DeletionStatus = "NONE"
    category_id: UUID | None = None
    uploaded_by: UUID | None = None
    created_at: AwareDatetime

    @field_validator("original_filename", "stored_filename")
    @classmethod
    def require_safe_basename(cls, value: str) -> str:
        if value in {".", ".."} or any(char in value for char in "/\\\x00\r\n"):
            raise ValueError("Filename must be a basename")
        return value

    @field_validator("stored_filename")
    @classmethod
    def require_generated_filename(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", value):
            raise ValueError("Stored filename must be generated and path-safe")
        return value

    @field_validator("storage_key")
    @classmethod
    def require_relative_storage_key(cls, value: str) -> str:
        if (
            value.startswith("/")
            or ":" in value
            or "\\" in value
            or any(part in {"", ".", ".."} for part in value.split("/"))
            or any(ord(char) < 32 for char in value)
            or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._/-]*", value)
        ):
            raise ValueError("Storage key must be a safe relative path")
        return value

    @model_validator(mode="after")
    def require_matching_stored_name(self) -> "MediaMetadata":
        if self.storage_key.rsplit("/", 1)[-1] != self.stored_filename:
            raise ValueError("Storage key basename must match stored filename")
        return self


class PublicMediaMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    type: MediaType
    mime_type: str
    width: int | None
    height: int | None
    alt_text: str | None
    caption: str | None
    is_decorative: bool


def to_public_metadata(media: MediaMetadata) -> PublicMediaMetadata:
    if media.processing_status != "READY" or media.deletion_status != "NONE":
        raise ValueError("Media is not publicly available")
    return PublicMediaMetadata(
        id=media.id,
        type=media.type,
        mime_type=media.mime_type,
        width=media.width,
        height=media.height,
        alt_text=None if media.is_decorative else media.alt_text,
        caption=media.caption,
        is_decorative=media.is_decorative,
    )
