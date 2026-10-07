"""ADMIN-only PageTemplate API over the audited migration test database."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StringConstraints, model_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from typing import Annotated

from app.admin_access import Actor, actor, require_scope
from app.page_template_model import PageTemplateRow
from app.page_template_service import TemplateReferenceConflict, apply_template, create_template
from app.template_blocks import BlockSnapshot, validate_snapshot

router = APIRouter(prefix="/api/v1/admin/page-templates", tags=["page templates"])

RequiredName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
RequiredTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class TemplateCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    institution_id: UUID | None
    name: RequiredName
    description: str | None = None
    blocks_snapshot: list[BlockSnapshot] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def valid_snapshot(self):
        validate_snapshot(self.blocks_snapshot)
        return self


class TemplateMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: RequiredName
    description: str | None = None


class TemplateActivation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: StrictBool


class TemplateView(TemplateCreate):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: UUID
    is_active: bool
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime


class ApplyTemplate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    institution_id: UUID
    title: RequiredTitle
    slug: str = Field(min_length=1, max_length=200, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class PageDraftView(ApplyTemplate):
    id: UUID
    status: str
    blocks: list[BlockSnapshot]


def _engine(principal: Actor):
    engine = principal.context.users.engine
    if engine.url.database != "portal_fumep_mig58_test" or engine.url.host not in {"localhost", "127.0.0.1", "::1"}:
        raise HTTPException(status_code=503, detail="PageTemplate migration test database required")
    return engine


def _get(db: Session, template_id: UUID) -> PageTemplateRow:
    row = db.get(PageTemplateRow, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="PageTemplate not found")
    return row


def _view(row: PageTemplateRow) -> TemplateView:
    return TemplateView.model_validate(row)


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


@router.get("", response_model=list[TemplateView])
def list_templates(response: Response, principal: Actor = Depends(actor)) -> list[TemplateView]:
    require_scope(principal, None)
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            return [_view(row) for row in db.scalars(select(PageTemplateRow).order_by(PageTemplateRow.name, PageTemplateRow.id))]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="PageTemplate service unavailable") from error


@router.get("/{template_id}", response_model=TemplateView)
def get_template(template_id: UUID, response: Response, principal: Actor = Depends(actor)) -> TemplateView:
    require_scope(principal, None)
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            return _view(_get(db, template_id))
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="PageTemplate service unavailable") from error


@router.post("", response_model=TemplateView, status_code=201)
def post_template(payload: TemplateCreate, response: Response, principal: Actor = Depends(actor)) -> TemplateView:
    require_scope(principal, None)
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            row = create_template(
                db, institution_id=payload.institution_id, name=payload.name,
                description=payload.description, blocks=payload.blocks_snapshot,
                created_by=principal.current.id,
            )
            db.commit()
            db.refresh(row)
            return _view(row)
    except TemplateReferenceConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="PageTemplate reference conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="PageTemplate service unavailable") from error


@router.put("/{template_id}", response_model=TemplateView)
def put_template(template_id: UUID, payload: TemplateMetadata, response: Response,
                 principal: Actor = Depends(actor)) -> TemplateView:
    require_scope(principal, None)
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            row = _get(db, template_id)
            row.name = payload.name
            row.description = payload.description
            row.updated_at = func.now()
            db.commit()
            db.refresh(row)
            return _view(row)
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="PageTemplate service unavailable") from error


@router.patch("/{template_id}/active", response_model=TemplateView)
def set_template_active(template_id: UUID, payload: TemplateActivation, response: Response,
                        principal: Actor = Depends(actor)) -> TemplateView:
    require_scope(principal, None)
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            row = _get(db, template_id)
            row.is_active = payload.is_active
            row.updated_at = func.now()
            db.commit()
            db.refresh(row)
            return _view(row)
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="PageTemplate service unavailable") from error


@router.post("/{template_id}/apply", response_model=PageDraftView, status_code=201)
def post_template_apply(template_id: UUID, payload: ApplyTemplate, response: Response,
                        principal: Actor = Depends(actor)) -> PageDraftView:
    require_scope(principal, None)
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            page_id, blocks = apply_template(
                db, template_id=template_id, institution_id=payload.institution_id,
                title=payload.title, slug=payload.slug, user_id=principal.current.id,
            )
            db.commit()
            return PageDraftView(id=page_id, status="DRAFT", blocks=blocks, **payload.model_dump())
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except TemplateReferenceConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Page slug or block conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="PageTemplate service unavailable") from error
