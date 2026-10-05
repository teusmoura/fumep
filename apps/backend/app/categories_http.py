"""Institution-scoped editorial category catalog, backed by PostgreSQL."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.admin_access import Actor, actor, require_scope
from app.category_model import CategoryRow

router = APIRouter(prefix="/api/v1/admin/categories", tags=["editorial categories"])


class CategoryFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = None

    @field_validator("name")
    @classmethod
    def nonblank_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Category name cannot be blank")
        return value


class CategoryCreate(CategoryFields):
    institution_id: UUID | None


class CategoryView(CategoryCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime


def _get(db: Session, category_id: UUID, principal: Actor, *, write: bool = False) -> CategoryRow:
    row = db.get(CategoryRow, category_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Category not found")
    if write or row.institution_id is not None:
        require_scope(principal, row.institution_id)
    return row


def _database(principal: Actor):
    return principal.context.users.engine


@router.get("", response_model=list[CategoryView])
def list_categories(response: Response, principal: Actor = Depends(actor)) -> list[CategoryView]:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_database(principal)) as db:
            query = select(CategoryRow).order_by(CategoryRow.slug, CategoryRow.id)
            if principal.current.role != "ADMIN":
                query = query.where(or_(CategoryRow.institution_id.is_(None), CategoryRow.institution_id.in_(principal.current.institution_ids)))
            return [CategoryView.model_validate(row) for row in db.scalars(query)]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Category service unavailable") from error


@router.get("/{category_id}", response_model=CategoryView)
def get_category(category_id: UUID, response: Response, principal: Actor = Depends(actor)) -> CategoryView:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_database(principal)) as db:
            return CategoryView.model_validate(_get(db, category_id, principal))
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Category service unavailable") from error


@router.post("", response_model=CategoryView, status_code=201)
def create_category(payload: CategoryCreate, response: Response, principal: Actor = Depends(actor)) -> CategoryView:
    response.headers["Cache-Control"] = "no-store"
    require_scope(principal, payload.institution_id)
    try:
        with Session(_database(principal)) as db:
            row = CategoryRow(**payload.model_dump(), created_by=principal.current.id)
            db.add(row)
            db.commit()
            db.refresh(row)
            return CategoryView.model_validate(row)
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Category slug or institution conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Category service unavailable") from error


@router.put("/{category_id}", response_model=CategoryView)
def update_category(category_id: UUID, payload: CategoryFields, response: Response, principal: Actor = Depends(actor)) -> CategoryView:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_database(principal)) as db:
            row = _get(db, category_id, principal, write=True)
            for key, value in payload.model_dump().items():
                setattr(row, key, value)
            db.commit()
            db.refresh(row)
            return CategoryView.model_validate(row)
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Category slug conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Category service unavailable") from error


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: UUID, response: Response, principal: Actor = Depends(actor)) -> None:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_database(principal)) as db:
            db.delete(_get(db, category_id, principal, write=True))
            db.commit()
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Category is in use") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Category service unavailable") from error
