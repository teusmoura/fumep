"""Institution-scoped editorial category catalog, backed by PostgreSQL."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from redis.exceptions import RedisError
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth_http import AuthContext, _current_session, auth_context
from app.authorization import AccessDeniedError, CurrentUserAccess, require_admin, require_institutions
from app.category_model import CategoryRow
from app.csrf import CsrfRejectedError
from app.sessions import COOKIE_NAME, SessionData

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


@dataclass(frozen=True)
class Actor:
    context: AuthContext
    session: SessionData
    current: CurrentUserAccess


def _actor(request: Request, context: AuthContext) -> Actor:
    try:
        view = _current_session(request, context)
        token = request.cookies[COOKIE_NAME]
        session = context.sessions.read_and_refresh(token)
        current = context.users.current_access(view.user_id)
        if session is None or current is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        if (
            not current.is_active or session.user_id != current.id
            or session.role != current.role
            or set(session.institution_ids) != current.institution_ids
        ):
            context.sessions.invalidate(token)
            raise HTTPException(status_code=401, detail="Authentication required")
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            context.csrf.validate_mutation(
                method=request.method, session_token=token,
                csrf_token=request.headers.get("x-csrf-token"),
                origin=request.headers.get("origin"), referer=request.headers.get("referer"),
            )
        return Actor(context, session, current)
    except CsrfRejectedError as error:
        raise HTTPException(status_code=403, detail="CSRF validation failed") from error
    except (RedisError, SQLAlchemyError) as error:
        raise HTTPException(status_code=503, detail="Category service unavailable") from error


def actor(request: Request, context: AuthContext = Depends(auth_context)) -> Actor:
    return _actor(request, context)


def _scope(principal: Actor, institution_id: UUID | None) -> None:
    try:
        if institution_id is None:
            require_admin(principal.session, principal.current)
        else:
            require_institutions(principal.session, principal.current, frozenset({institution_id}))
    except AccessDeniedError as error:
        raise HTTPException(status_code=403, detail="Category access denied") from error


def _get(db: Session, category_id: UUID, principal: Actor, *, write: bool = False) -> CategoryRow:
    row = db.get(CategoryRow, category_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Category not found")
    if write or row.institution_id is not None:
        _scope(principal, row.institution_id)
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
    _scope(principal, payload.institution_id)
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
