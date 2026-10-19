"""Authenticated gallery management and a safe GALLERY_FEED preview contract."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.admin_access import Actor, actor, require_scope
from app.gallery_model import GalleryItemRow, GalleryRow
from app.gallery_service import (
    GalleryConflict, MediaNotSelectable, add_item, locked_gallery,
    ordered_items, remove_gallery, remove_item, reorder_items,
)

router = APIRouter(prefix="/api/v1/admin/galleries", tags=["galleries"])


class GalleryFields(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=180)
    description: str | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Gallery title cannot be blank")
        return value


class GalleryCreate(GalleryFields):
    institution_id: UUID | None


class GalleryView(GalleryCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime


class ItemFields(BaseModel):
    model_config = ConfigDict(extra="forbid")
    alt_text: str = Field(min_length=1)
    caption: str | None = None

    @field_validator("alt_text")
    @classmethod
    def alt_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Informative gallery image requires alt text")
        return value


class ItemCreate(ItemFields):
    media_id: UUID


class ItemView(ItemCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    gallery_id: UUID
    position: int
    created_at: datetime


class ItemOrder(BaseModel):
    model_config = ConfigDict(extra="forbid")
    item_ids: list[UUID]


class FeedPreview(BaseModel):
    gallery_id: UUID
    institution_id: UUID | None
    items: list[ItemView]


def _engine(principal: Actor):
    return principal.context.users.engine


def _gallery(db: Session, gallery_id: UUID, principal: Actor, *, write: bool = False) -> GalleryRow:
    row = locked_gallery(db, gallery_id) if write else db.get(GalleryRow, gallery_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Gallery not found")
    require_scope(principal, row.institution_id)
    return row


def _item(db: Session, gallery_id: UUID, item_id: UUID) -> GalleryItemRow:
    item = db.get(GalleryItemRow, item_id)
    if item is None or item.gallery_id != gallery_id:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    return item


@router.get("", response_model=list[GalleryView])
def list_galleries(response: Response, principal: Actor = Depends(actor)) -> list[GalleryView]:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            query = select(GalleryRow).order_by(GalleryRow.created_at, GalleryRow.id)
            if principal.current.role != "ADMIN":
                query = query.where(GalleryRow.institution_id.in_(principal.current.institution_ids))
            return [GalleryView.model_validate(row) for row in db.scalars(query)]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error


@router.post("", response_model=GalleryView, status_code=201)
def create_gallery(payload: GalleryCreate, response: Response, principal: Actor = Depends(actor)) -> GalleryView:
    response.headers["Cache-Control"] = "no-store"
    require_scope(principal, payload.institution_id)
    try:
        with Session(_engine(principal)) as db:
            row = GalleryRow(**payload.model_dump(), created_by=principal.current.id)
            db.add(row)
            db.commit()
            db.refresh(row)
            return GalleryView.model_validate(row)
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Gallery institution conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error


@router.get("/{gallery_id}", response_model=GalleryView)
def get_gallery(gallery_id: UUID, response: Response, principal: Actor = Depends(actor)) -> GalleryView:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            return GalleryView.model_validate(_gallery(db, gallery_id, principal))
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error


@router.put("/{gallery_id}", response_model=GalleryView)
def update_gallery(gallery_id: UUID, payload: GalleryFields, response: Response, principal: Actor = Depends(actor)) -> GalleryView:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            row = _gallery(db, gallery_id, principal, write=True)
            row.title, row.description = payload.title, payload.description
            db.commit()
            db.refresh(row)
            return GalleryView.model_validate(row)
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error


@router.delete("/{gallery_id}", status_code=204)
def delete_gallery(gallery_id: UUID, response: Response, principal: Actor = Depends(actor)) -> None:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            remove_gallery(db, _gallery(db, gallery_id, principal, write=True))
            db.commit()
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Gallery is in use") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error


@router.get("/{gallery_id}/items", response_model=list[ItemView])
def list_items(gallery_id: UUID, response: Response, principal: Actor = Depends(actor)) -> list[ItemView]:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            _gallery(db, gallery_id, principal)
            return [ItemView.model_validate(item) for item in ordered_items(db, gallery_id)]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error


@router.post("/{gallery_id}/items", response_model=ItemView, status_code=201)
def create_item(gallery_id: UUID, payload: ItemCreate, response: Response, principal: Actor = Depends(actor)) -> ItemView:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            gallery = _gallery(db, gallery_id, principal, write=True)
            if principal.current.role != "ADMIN":
                media_scope = db.execute(text(
                    "SELECT mc.institution_id FROM media m "
                    "LEFT JOIN media_categories mc ON mc.id = m.category_id "
                    "WHERE m.id = :media_id"
                ), {"media_id": payload.media_id}).scalar_one_or_none()
                if media_scope is None or media_scope != gallery.institution_id:
                    raise HTTPException(status_code=403, detail="Media institution access denied")
            item = add_item(db, gallery, **payload.model_dump())
            db.commit()
            db.refresh(item)
            return ItemView.model_validate(item)
    except MediaNotSelectable as error:
        raise HTTPException(status_code=409, detail="Image is not selectable") from error
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Gallery item conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error


@router.put("/{gallery_id}/items/{item_id}", response_model=ItemView)
def update_item(gallery_id: UUID, item_id: UUID, payload: ItemFields, response: Response, principal: Actor = Depends(actor)) -> ItemView:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            _gallery(db, gallery_id, principal, write=True)
            item = _item(db, gallery_id, item_id)
            item.alt_text, item.caption = payload.alt_text, payload.caption
            db.commit()
            db.refresh(item)
            return ItemView.model_validate(item)
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error


@router.delete("/{gallery_id}/items/{item_id}", status_code=204)
def delete_item(gallery_id: UUID, item_id: UUID, response: Response, principal: Actor = Depends(actor)) -> None:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            gallery = _gallery(db, gallery_id, principal, write=True)
            if not remove_item(db, gallery, item_id):
                raise HTTPException(status_code=404, detail="Gallery item not found")
            db.commit()
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error


@router.put("/{gallery_id}/order", response_model=list[ItemView])
def set_item_order(gallery_id: UUID, payload: ItemOrder, response: Response, principal: Actor = Depends(actor)) -> list[ItemView]:
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            gallery = _gallery(db, gallery_id, principal, write=True)
            result = reorder_items(db, gallery, payload.item_ids)
            db.commit()
            return [ItemView.model_validate(item) for item in result]
    except GalleryConflict as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Gallery order conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error


@router.get("/{gallery_id}/feed", response_model=FeedPreview)
def gallery_feed_preview(gallery_id: UUID, response: Response, limit: int = Query(default=12, ge=1, le=12), principal: Actor = Depends(actor)) -> FeedPreview:
    """Authenticated projection only; public rendering awaits publication integration."""
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            gallery = _gallery(db, gallery_id, principal)
            items = ordered_items(db, gallery_id)[:limit]
            for item in items:
                media = db.execute(
                    text("SELECT type, processing_status, deletion_status FROM media WHERE id = :id"),
                    {"id": item.media_id},
                ).mappings().first()
                if media is None or media["type"] != "IMAGE" or media["processing_status"] != "READY" or media["deletion_status"] != "NONE":
                    raise HTTPException(status_code=409, detail="Gallery contains unavailable media")
            return FeedPreview(
                gallery_id=gallery.id, institution_id=gallery.institution_id,
                items=[ItemView.model_validate(item) for item in items],
            )
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Gallery service unavailable") from error
