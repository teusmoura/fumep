"""Authenticated draft read/save contract for the migration test database."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator
from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from typing import Annotated

from app.admin_access import Actor, actor, require_scope
from app.page_template_service import TemplateReferenceConflict, add_media_usages, validate_references
from app.page_templates_http import _engine
from app.template_blocks import BlockSnapshot, validate_snapshot

router = APIRouter(prefix="/api/v1/admin/pages", tags=["page drafts"])

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", min_length=1, max_length=200)]


class DraftSave(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title
    slug: Slug
    blocks: list[BlockSnapshot] = Field(max_length=100)

    @model_validator(mode="after")
    def valid_blocks(self):
        if self.blocks:
            validate_snapshot(self.blocks)
        return self


class DraftView(DraftSave):
    id: UUID
    institution_id: UUID
    status: str


def _page(db: Session, page_id: UUID, *, lock: bool = False):
    query = "SELECT id, institution_id, title, slug, status FROM pages WHERE id = :id"
    if lock:
        query += " FOR UPDATE"
    row = db.execute(text(query), {"id": page_id}).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Page not found")
    return row


def _view(db: Session, page) -> DraftView:
    rows = db.execute(
        text("SELECT id, type, position, is_visible, schema_version, background, "
             "background_media_id, anchor, data FROM content_blocks "
             "WHERE owner_type = 'PAGE' AND owner_id = :id ORDER BY position"),
        {"id": page.id},
    ).all()
    blocks = [BlockSnapshot.model_validate({
        "id": row.id, "type": row.type, "position": row.position,
        "isVisible": row.is_visible, "schemaVersion": row.schema_version,
        "background": row.background, "backgroundMediaId": row.background_media_id,
        "anchor": row.anchor, "data": row.data,
    }) for row in rows]
    return DraftView(id=page.id, institution_id=page.institution_id,
                     title=page.title, slug=page.slug, status=page.status, blocks=blocks)


@router.get("/{page_id}", response_model=DraftView)
def get_draft(page_id: UUID, response: Response, principal: Actor = Depends(actor)) -> DraftView:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            page = _page(db, page_id)
            require_scope(principal, page.institution_id)
            if page.status != "DRAFT":
                raise HTTPException(status_code=409, detail="Page is not a draft")
            return _view(db, page)
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Page draft service unavailable") from error


@router.put("/{page_id}", response_model=DraftView)
def save_draft(page_id: UUID, payload: DraftSave, response: Response,
               principal: Actor = Depends(actor)) -> DraftView:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            page = _page(db, page_id, lock=True)
            require_scope(principal, page.institution_id)
            if page.status != "DRAFT":
                raise HTTPException(status_code=409, detail="Page is not a draft")
            if payload.blocks:
                validate_references(db, payload.blocks, page.institution_id)
            db.execute(text("DELETE FROM media_usages WHERE entity_type = 'CONTENT_BLOCK' "
                            "AND entity_id IN (SELECT id FROM content_blocks WHERE owner_type = 'PAGE' "
                            "AND owner_id = :id)"), {"id": page_id})
            db.execute(text("DELETE FROM content_blocks WHERE owner_type = 'PAGE' AND owner_id = :id"), {"id": page_id})
            insert = text(
                "INSERT INTO content_blocks (id, owner_type, owner_id, type, position, is_visible, "
                "schema_version, background, background_media_id, anchor, data) VALUES "
                "(:id, 'PAGE', :page_id, :type, :position, :visible, :version, "
                ":background, :background_media_id, :anchor, :data)"
            ).bindparams(bindparam("data", type_=JSONB))
            for block in payload.blocks:
                db.execute(insert, {
                    "id": block.id, "page_id": page_id, "type": block.type,
                    "position": block.position, "visible": block.isVisible,
                    "version": block.schemaVersion, "background": block.background,
                    "background_media_id": block.backgroundMediaId,
                    "anchor": block.anchor, "data": block.data,
                })
                add_media_usages(db, "CONTENT_BLOCK", block.id, block)
            db.execute(text("UPDATE pages SET title = :title, slug = :slug, updated_by = :user_id, "
                            "updated_at = now() WHERE id = :id"),
                       {"title": payload.title, "slug": payload.slug,
                        "user_id": principal.current.id, "id": page_id})
            db.flush()
            saved = _view(db, _page(db, page_id))
            db.commit()
            return saved
    except TemplateReferenceConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Page slug or block conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Page draft service unavailable") from error
