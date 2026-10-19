"""Uncached public projection of published migration-test page snapshots."""

from functools import lru_cache
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from minio.error import S3Error
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import database_engine
from app.template_blocks import BlockSnapshot
from app.media_http import _storage
from app.image_upload_validation import MAX_IMAGE_BYTES
from app.original_image_storage import PRIVATE_BUCKET, _require_original_key

router = APIRouter(prefix="/api/v1/public/institutions", tags=["published pages"])


@lru_cache(maxsize=1)
def migration_public_engine():
    try:
        engine = database_engine()
    except (ValueError, RuntimeError) as error:
        raise HTTPException(status_code=503, detail="Migration test database required") from error
    if engine.url.database != "portal_fumep_mig58_test" or engine.url.host not in {"localhost", "127.0.0.1", "::1"}:
        engine.dispose()
        raise HTTPException(status_code=503, detail="Migration test database required")
    return engine


class PublicGalleryItem(BaseModel):
    media_id: UUID
    alt_text: str
    caption: str | None


class PublicPage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    institution_slug: str
    title: str
    slug: str
    version_number: int
    blocks: list[BlockSnapshot]
    gallery_feeds: dict[str, list[PublicGalleryItem]]


def _published(db: Session, institution_slug: str, page_slug: str):
    row = db.execute(text(
        "SELECT p.id, p.institution_id, v.version_number, v.snapshot FROM pages p "
        "JOIN institutions i ON i.id = p.institution_id "
        "JOIN LATERAL (SELECT version_number, snapshot FROM page_versions "
        "WHERE page_id = p.id ORDER BY version_number DESC LIMIT 1) v ON TRUE "
        "WHERE i.slug = :institution_slug AND i.is_active = true "
        "AND p.slug = :page_slug AND p.status = 'PUBLISHED'"
    ), {"institution_slug": institution_slug, "page_slug": page_slug}).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Published page not found")
    return row


def _gallery_items(db: Session, gallery_id: UUID, institution_id: UUID, limit: int):
    return db.execute(text(
        "SELECT gi.media_id, gi.alt_text, gi.caption, m.storage_key, m.mime_type, m.size_bytes "
        "FROM gallery_items gi JOIN galleries g ON g.id = gi.gallery_id "
        "JOIN media m ON m.id = gi.media_id "
        "LEFT JOIN media_categories mc ON mc.id = m.category_id "
        "WHERE g.id = :gallery_id AND (g.institution_id IS NULL OR g.institution_id = :institution_id) "
        "AND m.type = 'IMAGE' AND m.processing_status = 'READY' AND m.deletion_status = 'NONE' "
        "AND (mc.institution_id IS NULL OR mc.institution_id = :institution_id) "
        "ORDER BY gi.position, gi.id LIMIT :limit"
    ), {"gallery_id": gallery_id, "institution_id": institution_id, "limit": limit}).all()


@router.get("/{institution_slug}/pages/{page_slug}", response_model=PublicPage)
def get_published_page(institution_slug: str, page_slug: str, response: Response,
                       engine=Depends(migration_public_engine)) -> PublicPage:
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-FUMEP-Data-Source"] = "migration-test"
    try:
        with Session(engine) as db:
            row = _published(db, institution_slug, page_slug)
            snapshot = row.snapshot
            blocks = [BlockSnapshot.model_validate(block) for block in snapshot["blocks"]]
            feeds = {
                str(block.id): [PublicGalleryItem.model_validate({
                    "media_id": item.media_id, "alt_text": item.alt_text, "caption": item.caption,
                }) for item in _gallery_items(db, UUID(block.data["galleryId"]), row.institution_id, block.data["limit"])]
                for block in blocks if block.type == "GALLERY_FEED" and block.isVisible
            }
            return PublicPage(id=row.id, institution_slug=institution_slug,
                              title=snapshot["title"], slug=snapshot["slug"],
                              version_number=row.version_number,
                              blocks=blocks, gallery_feeds=feeds)
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Published page unavailable") from error


@router.get("/{institution_slug}/pages/{page_slug}/gallery-media/{media_id}")
def public_gallery_media(institution_slug: str, page_slug: str, media_id: UUID,
                         engine=Depends(migration_public_engine)) -> Response:
    """Expose only live gallery images referenced by a visible block on this published page."""
    try:
        with Session(engine) as db:
            row = _published(db, institution_slug, page_slug)
            blocks = [BlockSnapshot.model_validate(block) for block in row.snapshot["blocks"]]
            media = next((item for block in blocks if block.type == "GALLERY_FEED" and block.isVisible
                          for item in _gallery_items(db, UUID(block.data["galleryId"]), row.institution_id, block.data["limit"])
                          if item.media_id == media_id), None)
            if media is None:
                raise HTTPException(status_code=404, detail="Gallery image not found")
            key, mime, size = media.storage_key, media.mime_type, media.size_bytes
            _require_original_key(key)
            if mime not in {"image/jpeg", "image/png", "image/webp", "image/avif"} or size <= 0 or size > MAX_IMAGE_BYTES:
                raise HTTPException(status_code=503, detail="Gallery image unavailable")
        object_response = _storage().get_object(PRIVATE_BUCKET, key)
        try:
            content = object_response.read(size + 1)
        finally:
            object_response.close()
            object_response.release_conn()
        if len(content) != size:
            raise HTTPException(status_code=503, detail="Gallery image unavailable")
        return Response(content=content, media_type=mime, headers={
            "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox", "Content-Disposition": "inline",
        })
    except HTTPException:
        raise
    except (SQLAlchemyError, S3Error, ValueError) as error:
        raise HTTPException(status_code=503, detail="Gallery image unavailable") from error
