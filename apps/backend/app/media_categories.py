"""Isolated media-category rules; repository and current user are backend-provided."""

from typing import Protocol
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

from .authorization import CurrentUserAccess, require_admin, require_institutions
from .sessions import SessionData


class CategoryNotFoundError(Exception):
    pass


class InstitutionNotFoundError(Exception):
    pass


class CategoryConflictError(Exception):
    pass


class CreateMediaCategory(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    institution_id: UUID | None
    name: str = Field(min_length=1, max_length=120)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class MediaCategory(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: UUID
    institution_id: UUID | None
    name: str
    slug: str
    created_by: UUID | None
    created_at: AwareDatetime
    updated_at: AwareDatetime


class MediaCategoryRepository(Protocol):
    def institution_exists(self, institution_id: UUID) -> bool: ...

    def create(self, category: CreateMediaCategory, *, created_by: UUID) -> MediaCategory: ...

    def list_all(self) -> list[MediaCategory]: ...

    def get(self, category_id: UUID) -> MediaCategory | None: ...


class MediaCategoryService:
    def __init__(self, repository: MediaCategoryRepository) -> None:
        self._repository = repository

    @staticmethod
    def _authenticate(session: SessionData, current: CurrentUserAccess) -> None:
        if current.role == "ADMIN":
            require_admin(session, current)
        else:
            require_institutions(session, current, current.institution_ids)

    @staticmethod
    def _visible(category: MediaCategory, current: CurrentUserAccess) -> bool:
        return current.role == "ADMIN" or (
            category.institution_id is not None
            and category.institution_id in current.institution_ids
        )

    def create(
        self, session: SessionData, current: CurrentUserAccess, payload: object
    ) -> MediaCategory:
        self._authenticate(session, current)
        category = CreateMediaCategory.model_validate(payload)
        if category.institution_id is None:
            require_admin(session, current)
        else:
            require_institutions(session, current, frozenset({category.institution_id}))
            if not self._repository.institution_exists(category.institution_id):
                raise InstitutionNotFoundError()
        return self._repository.create(category, created_by=current.id)

    def list_authorized(
        self, session: SessionData, current: CurrentUserAccess
    ) -> list[MediaCategory]:
        self._authenticate(session, current)
        return sorted(
            (row for row in self._repository.list_all() if self._visible(row, current)),
            key=lambda row: (row.name.casefold(), str(row.id)),
        )

    def select(
        self, session: SessionData, current: CurrentUserAccess, category_id: UUID
    ) -> MediaCategory:
        self._authenticate(session, current)
        category = self._repository.get(category_id)
        if category is None or not self._visible(category, current):
            raise CategoryNotFoundError()
        return category
