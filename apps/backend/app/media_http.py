"""Authenticated migration adapter for the private media library."""

import os
import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from minio import Minio
from minio.error import S3Error
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.admin_access import Actor, actor, require_scope
from app.image_upload_validation import MAX_IMAGE_BYTES, InvalidImageUploadError, validate_image_upload
from app.media_queue import MediaQueuePublisher
from app.original_image_storage import PRIVATE_BUCKET, OriginalImageStorage, _require_original_key
from app.original_pdf_storage import OriginalPdfStorage, _require_pdf_key
from app.pdf_upload_validation import MAX_PDF_BYTES, InvalidPdfUploadError, validate_pdf_upload

router = APIRouter(prefix="/api/v1/admin/media", tags=["media library"])


class MediaCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    institution_id: UUID | None
    name: str = Field(min_length=1, max_length=120)
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=120)


class MediaCategoryView(MediaCategoryInput):
    id: UUID
    created_at: datetime


class MediaView(BaseModel):
    id: UUID
    type: str
    original_filename: str
    mime_type: str
    size_bytes: int
    width: int | None
    height: int | None
    alt_text: str | None
    caption: str | None
    is_decorative: bool
    category_id: UUID | None
    processing_status: str
    deletion_status: str
    created_at: datetime


class InstitutionView(BaseModel):
    id: UUID
    name: str


class MediaVariantView(BaseModel):
    format: Literal["WEBP", "AVIF"]
    width: int
    height: int
    size_bytes: int


def _engine(principal: Actor):
    engine = principal.context.users.engine
    if engine.url.database != "portal_fumep_mig58_test" or engine.url.host not in {"localhost", "127.0.0.1", "::1"}:
        raise HTTPException(status_code=503, detail="Media migration test database required")
    return engine


def _storage() -> Minio:
    try:
        endpoint = os.environ["MINIO_ENDPOINT"]
        access_key = os.environ["MINIO_ACCESS_KEY"]
        secret_key = os.environ["MINIO_SECRET_KEY"]
    except KeyError as error:
        raise HTTPException(status_code=503, detail="Media storage unavailable") from error
    if ":" not in endpoint:
        endpoint = f"{endpoint}:{os.environ.get('MINIO_PORT', '9000')}"
    try:
        return Minio(endpoint, access_key=access_key, secret_key=secret_key,
                     secure=os.environ.get("MINIO_SECURE", "false").lower() == "true")
    except ValueError as error:
        raise HTTPException(status_code=503, detail="Media storage unavailable") from error


def _visible_filter(principal: Actor) -> tuple[str, dict]:
    if principal.current.role == "ADMIN":
        return "", {}
    ids = list(principal.current.institution_ids)
    if not ids:
        raise HTTPException(status_code=403, detail="Access denied")
    return "AND mc.institution_id = ANY(:institution_ids)", {"institution_ids": ids}


def _category_scope(db: Session, principal: Actor, category_id: UUID | None) -> None:
    if category_id is None:
        require_scope(principal, None)
        return
    row = db.execute(text("SELECT institution_id FROM media_categories WHERE id = :id"), {"id": category_id}).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Media category not found")
    require_scope(principal, row["institution_id"])


def _authorized_media(db: Session, principal: Actor, media_id: UUID):
    row = db.execute(text(
        "SELECT m.id, m.type, m.storage_key, m.mime_type, m.size_bytes, m.processing_status, "
        "mc.institution_id FROM media m LEFT JOIN media_categories mc ON mc.id = m.category_id "
        "WHERE m.id = :id AND m.deletion_status = 'NONE' AND m.type IN ('IMAGE', 'DOCUMENT')"
    ), {"id": media_id}).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Media not found")
    require_scope(principal, row["institution_id"])
    return row


@router.get("/institutions", response_model=list[InstitutionView])
def institutions(response: Response, principal: Actor = Depends(actor)):
    response.headers["Cache-Control"] = "no-store"
    condition = "" if principal.current.role == "ADMIN" else "AND id = ANY(:ids)"
    try:
        with Session(_engine(principal)) as db:
            rows = db.execute(text(
                "SELECT id, name FROM institutions WHERE is_active = true " + condition + " ORDER BY name, id"
            ), {"ids": list(principal.current.institution_ids)}).mappings()
            return [InstitutionView.model_validate(dict(row)) for row in rows]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Institution choices unavailable") from error


@router.get("/categories", response_model=list[MediaCategoryView])
def categories(response: Response, principal: Actor = Depends(actor)):
    response.headers["Cache-Control"] = "no-store"
    condition, params = _visible_filter(principal)
    try:
        with Session(_engine(principal)) as db:
            rows = db.execute(text(
                "SELECT mc.id, mc.institution_id, mc.name, mc.slug, mc.created_at "
                "FROM media_categories mc WHERE 1=1 " + condition + " ORDER BY mc.name, mc.id"
            ), params).mappings()
            return [MediaCategoryView.model_validate(dict(row)) for row in rows]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Media catalog unavailable") from error


@router.post("/categories", response_model=MediaCategoryView, status_code=201)
def create_category(payload: MediaCategoryInput, response: Response, principal: Actor = Depends(actor)):
    response.headers["Cache-Control"] = "no-store"
    require_scope(principal, payload.institution_id)
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="Category name is required")
    try:
        with Session(_engine(principal)) as db:
            row = db.execute(text(
                "INSERT INTO media_categories (institution_id, name, slug, created_by) "
                "VALUES (:institution_id, :name, :slug, :created_by) "
                "RETURNING id, institution_id, name, slug, created_at"
            ), {**payload.model_dump(), "name": payload.name.strip(), "created_by": principal.current.id}).mappings().one()
            result = MediaCategoryView.model_validate(dict(row))
            db.commit()
            return result
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Media category conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Media catalog unavailable") from error


@router.get("", response_model=list[MediaView])
def list_media(response: Response, principal: Actor = Depends(actor),
               type: str | None = Query(default=None, pattern="^(IMAGE|DOCUMENT)$"),
               category_id: UUID | None = None, q: str = Query(default="", max_length=120),
               limit: int = Query(default=24, ge=1, le=100), offset: int = Query(default=0, ge=0)):
    response.headers["Cache-Control"] = "no-store"
    condition, params = _visible_filter(principal)
    params.update({"type": type, "category_id": category_id, "q": f"%{q}%", "limit": limit, "offset": offset})
    try:
        with Session(_engine(principal)) as db:
            rows = db.execute(text(
                "SELECT m.id, m.type, m.original_filename, m.mime_type, m.size_bytes, m.width, m.height, "
                "m.alt_text, m.caption, m.is_decorative, m.category_id, m.processing_status, "
                "m.deletion_status, m.created_at FROM media m "
                "LEFT JOIN media_categories mc ON mc.id = m.category_id WHERE m.deletion_status = 'NONE' "
                "AND m.type IN ('IMAGE', 'DOCUMENT') "
                "AND (CAST(:type AS media_type) IS NULL OR m.type = CAST(:type AS media_type)) "
                "AND (CAST(:category_id AS uuid) IS NULL OR m.category_id = CAST(:category_id AS uuid)) "
                "AND (m.original_filename ILIKE :q OR m.alt_text ILIKE :q OR m.caption ILIKE :q OR mc.name ILIKE :q) "
                + condition + " ORDER BY m.created_at DESC, m.id DESC LIMIT :limit OFFSET :offset"
            ), params).mappings()
            return [MediaView.model_validate(dict(row)) for row in rows]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Media catalog unavailable") from error


@router.get("/{media_id}/variants", response_model=list[MediaVariantView])
def list_variants(media_id: UUID, response: Response, principal: Actor = Depends(actor)):
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            media = _authorized_media(db, principal, media_id)
            if media["type"] != "IMAGE" or media["processing_status"] != "READY":
                return []
            rows = db.execute(text(
                "SELECT format, width, height, size_bytes FROM media_variants "
                "WHERE media_id = :id ORDER BY width, format"
            ), {"id": media_id}).mappings()
            return [MediaVariantView.model_validate(dict(row)) for row in rows]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Media catalog unavailable") from error


@router.get("/{media_id}/content")
def media_content(media_id: UUID, principal: Actor = Depends(actor),
                  format: Literal["WEBP", "AVIF"] | None = None,
                  width: int | None = Query(default=None, gt=0)):
    if (format is None) != (width is None):
        raise HTTPException(status_code=422, detail="Variant format and width must be provided together")
    try:
        with Session(_engine(principal)) as db:
            media = _authorized_media(db, principal, media_id)
            if media["processing_status"] != "READY":
                raise HTTPException(status_code=409, detail="Media not ready")
            key, mime, size = media["storage_key"], media["mime_type"], media["size_bytes"]
            if format is not None:
                if media["type"] != "IMAGE":
                    raise HTTPException(status_code=404, detail="Variant not found")
                variant = db.execute(text(
                    "SELECT storage_key, size_bytes FROM media_variants "
                    "WHERE media_id = :id AND format = :format AND width = :width"
                ), {"id": media_id, "format": format, "width": width}).mappings().first()
                if variant is None:
                    raise HTTPException(status_code=404, detail="Variant not found")
                key, mime, size = variant["storage_key"], f"image/{format.lower()}", variant["size_bytes"]
                expected = rf"images/variants/{media_id}-{width}\.{format.lower()}"
                if re.fullmatch(expected, key) is None:
                    raise HTTPException(status_code=503, detail="Media storage unavailable")
            elif media["type"] == "IMAGE":
                _require_original_key(key)
            else:
                _require_pdf_key(key)
            allowed_mimes = ({"image/jpeg", "image/png", "image/webp", "image/avif"}
                             if media["type"] == "IMAGE" else {"application/pdf"})
            if mime not in allowed_mimes:
                raise HTTPException(status_code=503, detail="Media storage unavailable")
            if size <= 0 or size > (MAX_PDF_BYTES if media["type"] == "DOCUMENT" else MAX_IMAGE_BYTES):
                raise HTTPException(status_code=503, detail="Media storage unavailable")
        object_response = _storage().get_object(PRIVATE_BUCKET, key)
        try:
            content = object_response.read(size + 1)
        finally:
            object_response.close()
            object_response.release_conn()
        if len(content) != size:
            raise HTTPException(status_code=503, detail="Media storage unavailable")
        return Response(content=content, media_type=mime, headers={
            "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox", "Content-Disposition": "inline",
        })
    except HTTPException:
        raise
    except (SQLAlchemyError, S3Error, ValueError) as error:
        raise HTTPException(status_code=503, detail="Media storage unavailable") from error


@router.post("", response_model=MediaView, status_code=201)
async def upload_media(response: Response, file: UploadFile = File(),
                       category_id: UUID | None = Form(default=None),
                       alt_text: str | None = Form(default=None),
                       caption: str | None = Form(default=None),
                       is_decorative: bool = Form(default=False),
                       principal: Actor = Depends(actor)):
    response.headers["Cache-Control"] = "no-store"
    if (alt_text and len(alt_text) > 1000) or (caption and len(caption) > 2000):
        raise HTTPException(status_code=422, detail="Media description too long")
    filename = file.filename or ""
    is_pdf = filename.lower().endswith(".pdf")
    max_bytes = MAX_PDF_BYTES if is_pdf else MAX_IMAGE_BYTES
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail="Media file too large")
    try:
        if is_pdf:
            validate_pdf_upload(original_filename=filename, declared_mime=file.content_type or "", content=content)
        else:
            validate_image_upload(original_filename=filename, declared_mime=file.content_type or "", content=content)
    except (InvalidImageUploadError, InvalidPdfUploadError) as error:
        raise HTTPException(status_code=422, detail="Invalid media file") from error
    engine = _engine(principal)
    storage = _storage()
    key = None
    try:
        with Session(engine) as db:
            _category_scope(db, principal, category_id)
            if is_pdf:
                stored = OriginalPdfStorage(storage).put_pdf(original_filename=filename, declared_mime=file.content_type or "", content=content)
                validated = stored.document
            else:
                stored = OriginalImageStorage(storage).put_image(original_filename=filename, declared_mime=file.content_type or "", content=content)
                validated = stored.image
            key = stored.storage_key
            row = db.execute(text(
                "INSERT INTO media (type, original_filename, stored_filename, mime_type, size_bytes, "
                "storage_key, checksum_sha256, alt_text, caption, is_decorative, category_id, uploaded_by, processing_status) "
                "VALUES (:type, :original_filename, :stored_filename, :mime_type, :size_bytes, "
                ":storage_key, :checksum_sha256, :alt_text, :caption, :is_decorative, :category_id, :uploaded_by, "
                "CAST(:processing_status AS media_processing_status)) "
                "RETURNING id, type, original_filename, mime_type, size_bytes, width, height, alt_text, caption, "
                "is_decorative, category_id, processing_status, deletion_status, created_at"
            ), {"type": "DOCUMENT" if is_pdf else "IMAGE", "original_filename": filename,
                "stored_filename": key.rsplit("/", 1)[-1], "mime_type": validated.mime_type,
                "size_bytes": validated.size_bytes, "storage_key": key,
                "checksum_sha256": validated.checksum_sha256, "alt_text": alt_text,
                "caption": caption, "is_decorative": is_decorative, "category_id": category_id,
                "uploaded_by": principal.current.id, "processing_status": "READY" if is_pdf else "PENDING"}).mappings().one()
            result = MediaView.model_validate(dict(row))
            db.commit()
    except (InvalidImageUploadError, InvalidPdfUploadError) as error:
        raise HTTPException(status_code=422, detail="Invalid media file") from error
    except HTTPException:
        raise
    except Exception as error:
        if key is not None:
            try:
                (OriginalPdfStorage(storage) if is_pdf else OriginalImageStorage(storage)).remove(key)
            except Exception:
                pass
        raise HTTPException(status_code=503, detail="Media upload unavailable") from error
    if not is_pdf:
        try:
            MediaQueuePublisher(principal.context.sessions.client).enqueue_process_media(result.id)
        except Exception:
            # PENDING remains durable; a reconciler must enqueue it later.
            pass
    return result
