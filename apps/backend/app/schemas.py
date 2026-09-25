from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]


class PublicInstitutionTheme(BaseModel):
    """Public-only contract. Fixture values are not persisted institutions."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100)
    primary: str = Field(pattern=r"^#[0-9a-f]{6}$")
    primaryForeground: str = Field(pattern=r"^#[0-9a-f]{6}$")
    accent: str = Field(pattern=r"^#[0-9a-f]{6}$")
    accentForeground: str = Field(pattern=r"^#[0-9a-f]{6}$")
    appearanceDefault: Literal["SYSTEM", "LIGHT", "DARK"]
