"""First article journey: scoped drafts, immutable publication and public SSR data."""

from datetime import datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response
from minio.error import S3Error
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator
from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.admin_access import Actor, actor, require_scope
from app.image_upload_validation import MAX_IMAGE_BYTES
from app.media_http import _storage
from app.original_image_storage import PRIVATE_BUCKET, _require_original_key
from app.page_templates_http import _engine
from app.public_pages_http import migration_public_engine
from app.template_blocks import BlockSnapshot, validate_snapshot

admin_router = APIRouter(prefix="/api/v1/admin/articles", tags=["articles"])
public_router = APIRouter(prefix="/api/v1/public/institutions", tags=["published articles"])

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", min_length=1, max_length=220)]


class ArticleFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title
    slug: Slug
    summary: str | None = Field(default=None, max_length=2000)
    institution_ids: list[UUID] = Field(min_length=1, max_length=3)
    category_id: UUID
    cover_image_id: UUID | None = None
    cover_image_alt: str | None = Field(default=None, max_length=500)
    blocks: list[BlockSnapshot] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def valid_slice(self):
        if len(set(self.institution_ids)) != len(self.institution_ids):
            raise ValueError("Institutions must be unique")
        if any(block.type != "TEXT" or block.background != "DEFAULT" or block.backgroundMediaId is not None
               for block in self.blocks):
            raise ValueError("This article slice supports plain TEXT blocks only")
        if self.blocks:
            validate_snapshot(self.blocks)
        if self.cover_image_alt is not None:
            self.cover_image_alt = self.cover_image_alt.strip() or None
        return self


class ArticleView(ArticleFields):
    id: UUID
    status: str
    version_number: int = 0


class PublicArticle(BaseModel):
    id: UUID
    title: str
    slug: str
    summary: str | None
    cover_image_id: UUID
    cover_image_alt: str
    published_at: datetime
    version_number: int
    blocks: list[BlockSnapshot]


class PublicArticleSummary(BaseModel):
    id: UUID
    title: str
    slug: str
    summary: str | None
    cover_image_id: UUID
    cover_image_alt: str
    published_at: datetime


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


def _row(db: Session, article_id: UUID, *, lock: bool = False):
    sql = "SELECT id, title, slug, summary, cover_image_id, cover_image_alt, status FROM articles WHERE id = :id"
    if lock:
        sql += " FOR UPDATE"
    row = db.execute(text(sql), {"id": article_id}).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return row


def _institutions(db: Session, article_id: UUID) -> list[UUID]:
    return list(db.scalars(text("SELECT institution_id FROM article_institutions WHERE article_id = :id ORDER BY institution_id"), {"id": article_id}))


def _view(db: Session, row) -> ArticleView:
    article_id = row["id"]
    blocks = [BlockSnapshot.model_validate({
        "id": block.id, "type": block.type, "position": block.position,
        "isVisible": block.is_visible, "schemaVersion": block.schema_version,
        "background": block.background, "backgroundMediaId": block.background_media_id,
        "anchor": block.anchor, "data": block.data,
    }) for block in db.execute(text(
        "SELECT id, type, position, is_visible, schema_version, background, background_media_id, anchor, data "
        "FROM content_blocks WHERE owner_type = 'ARTICLE' AND owner_id = :id ORDER BY position"
    ), {"id": article_id})]
    return ArticleView(
        id=article_id, title=row["title"], slug=row["slug"], summary=row["summary"],
        cover_image_id=row["cover_image_id"], cover_image_alt=row["cover_image_alt"],
        status=row["status"], institution_ids=_institutions(db, article_id),
        category_id=db.scalar(text("SELECT category_id FROM article_categories WHERE article_id = :id"), {"id": article_id}),
        blocks=blocks,
        version_number=db.scalar(text("SELECT COALESCE(MAX(version_number), 0) FROM article_versions WHERE article_id = :id"), {"id": article_id}),
    )


def _scope(db: Session, principal: Actor, institution_ids: list[UUID]) -> None:
    for institution_id in institution_ids:
        require_scope(principal, institution_id)
        active = db.scalar(text("SELECT is_active FROM institutions WHERE id = :id FOR SHARE"), {"id": institution_id})
        if active is not True:
            raise HTTPException(status_code=409, detail="Institution is not active")


def _references(db: Session, payload: ArticleFields) -> None:
    category = db.execute(text("SELECT institution_id FROM categories WHERE id = :id FOR SHARE"), {"id": payload.category_id}).first()
    if category is None or (category.institution_id is not None and (
        len(payload.institution_ids) != 1 or category.institution_id != payload.institution_ids[0]
    )):
        raise HTTPException(status_code=409, detail="Category is not available for these institutions")
    if payload.cover_image_id is None:
        return
    media = db.execute(text(
        "SELECT m.type, m.processing_status, m.deletion_status, mc.institution_id "
        "FROM media m LEFT JOIN media_categories mc ON mc.id = m.category_id "
        "WHERE m.id = :id FOR UPDATE OF m"
    ), {"id": payload.cover_image_id}).first()
    if media is None or media.type != "IMAGE" or media.processing_status != "READY" or media.deletion_status != "NONE" or (
        media.institution_id is not None and (len(payload.institution_ids) != 1 or media.institution_id != payload.institution_ids[0])
    ):
        raise HTTPException(status_code=409, detail="Cover image is not READY or outside institution scope")


def _save(db: Session, article_id: UUID, payload: ArticleFields, user_id: UUID) -> None:
    db.execute(text(
        "UPDATE articles SET title = :title, slug = :slug, summary = :summary, "
        "cover_image_id = :cover, cover_image_alt = :alt, updated_by = :user, updated_at = now() WHERE id = :id"
    ), {"id": article_id, "title": payload.title, "slug": payload.slug, "summary": payload.summary,
        "cover": payload.cover_image_id, "alt": payload.cover_image_alt, "user": user_id})
    db.execute(text("DELETE FROM article_institutions WHERE article_id = :id"), {"id": article_id})
    for institution_id in payload.institution_ids:
        db.execute(text("INSERT INTO article_institutions (article_id, institution_id) VALUES (:id, :institution)"),
                   {"id": article_id, "institution": institution_id})
    db.execute(text("DELETE FROM article_categories WHERE article_id = :id"), {"id": article_id})
    db.execute(text("INSERT INTO article_categories (article_id, category_id) VALUES (:id, :category)"),
               {"id": article_id, "category": payload.category_id})
    db.execute(text("DELETE FROM media_usages WHERE entity_type = 'ARTICLE' AND entity_id = :id"), {"id": article_id})
    if payload.cover_image_id:
        db.execute(text(
            "INSERT INTO media_usages (id, media_id, entity_type, entity_id, field_name) "
            "VALUES (:usage_id, :media_id, 'ARTICLE', :article_id, 'cover_image_id')"
        ), {"usage_id": uuid4(), "media_id": payload.cover_image_id, "article_id": article_id})
    db.execute(text("DELETE FROM content_blocks WHERE owner_type = 'ARTICLE' AND owner_id = :id"), {"id": article_id})
    insert = text(
        "INSERT INTO content_blocks (id, owner_type, owner_id, type, position, is_visible, "
        "schema_version, background, background_media_id, anchor, data) "
        "VALUES (:id, 'ARTICLE', :owner_id, :type, :position, :visible, :schema_version, "
        ":background, :background_media_id, :anchor, :data)"
    ).bindparams(bindparam("data", type_=JSONB))
    for block in payload.blocks:
        db.execute(insert, {
            "id": block.id, "owner_id": article_id, "type": block.type, "position": block.position,
            "visible": block.isVisible, "schema_version": block.schemaVersion, "background": block.background,
            "background_media_id": block.backgroundMediaId, "anchor": block.anchor, "data": block.data,
        })


@admin_router.get("", response_model=list[ArticleView])
def list_articles(response: Response, principal: Actor = Depends(actor)):
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            ids = db.scalars(text(
                "SELECT a.id FROM articles a WHERE :admin OR NOT EXISTS ("
                "SELECT 1 FROM article_institutions ai WHERE ai.article_id = a.id "
                "AND NOT (ai.institution_id = ANY(:scope))) ORDER BY a.created_at DESC, a.id DESC"
            ), {"admin": principal.current.role == "ADMIN", "scope": list(principal.current.institution_ids)}).all()
            return [_view(db, _row(db, article_id)) for article_id in ids]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Article service unavailable") from error


@admin_router.post("", response_model=ArticleView, status_code=201)
def create_article(payload: ArticleFields, response: Response, principal: Actor = Depends(actor)):
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            _scope(db, principal, payload.institution_ids)
            _references(db, payload)
            article_id = uuid4()
            db.execute(text("INSERT INTO articles (id, title, slug, created_by, updated_by) VALUES (:id, :title, :slug, :user, :user)"),
                       {"id": article_id, "title": payload.title, "slug": payload.slug, "user": principal.current.id})
            _save(db, article_id, payload, principal.current.id)
            result = _view(db, _row(db, article_id))
            db.commit()
            return result
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Article slug or block conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Article service unavailable") from error


@admin_router.get("/{article_id}", response_model=ArticleView)
def get_article(article_id: UUID, response: Response, principal: Actor = Depends(actor)):
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            row = _row(db, article_id)
            for institution_id in _institutions(db, article_id):
                require_scope(principal, institution_id)
            return _view(db, row)
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Article service unavailable") from error


@admin_router.put("/{article_id}", response_model=ArticleView)
def save_article(article_id: UUID, payload: ArticleFields, response: Response, principal: Actor = Depends(actor)):
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            row = _row(db, article_id, lock=True)
            for institution_id in _institutions(db, article_id):
                require_scope(principal, institution_id)
            if row["status"] != "DRAFT":
                raise HTTPException(status_code=409, detail="Only drafts can be edited in this slice")
            _scope(db, principal, payload.institution_ids)
            _references(db, payload)
            _save(db, article_id, payload, principal.current.id)
            result = _view(db, _row(db, article_id))
            db.commit()
            return result
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="Article slug or block conflict") from error
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Article service unavailable") from error


@admin_router.post("/{article_id}/publish", response_model=ArticleView)
def publish_article(article_id: UUID, response: Response, principal: Actor = Depends(actor)):
    _no_store(response)
    try:
        with Session(_engine(principal)) as db:
            row = _row(db, article_id, lock=True)
            institutions = _institutions(db, article_id)
            _scope(db, principal, institutions)
            if row["status"] != "DRAFT":
                raise HTTPException(status_code=409, detail="Article is not a draft")
            draft = _view(db, row)
            if not draft.cover_image_id or not draft.cover_image_alt or not draft.blocks:
                raise HTTPException(status_code=409, detail="Publication requires a cover, alt text and content")
            _references(db, draft)
            if any(block.type != "TEXT" for block in draft.blocks):
                raise HTTPException(status_code=409, detail="Unsupported article block")
            validate_snapshot(draft.blocks)
            snapshot = {
                "schemaVersion": 1, "title": draft.title, "slug": draft.slug,
                "summary": draft.summary, "institutionIds": [str(value) for value in draft.institution_ids],
                "categoryId": str(draft.category_id), "coverImageId": str(draft.cover_image_id),
                "coverImageAlt": draft.cover_image_alt,
                "blocks": [block.model_dump(mode="json", exclude_none=True) for block in draft.blocks],
            }
            number = draft.version_number + 1
            db.execute(text(
                "INSERT INTO article_versions (id, article_id, version_number, snapshot, created_by) "
                "VALUES (:id, :article, :number, :snapshot, :user)"
            ).bindparams(bindparam("snapshot", type_=JSONB)), {
                "id": uuid4(), "article": article_id, "number": number,
                "snapshot": snapshot, "user": principal.current.id,
            })
            db.execute(text(
                "UPDATE articles SET status = 'PUBLISHED', published_at = now(), published_by = :user, "
                "updated_at = now() WHERE id = :id"
            ), {"id": article_id, "user": principal.current.id})
            db.execute(text(
                "INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata) "
                "VALUES (:id, :user, 'ARTICLE_PUBLISHED', 'ARTICLE', :article, :metadata)"
            ).bindparams(bindparam("metadata", type_=JSONB)), {
                "id": uuid4(), "user": principal.current.id, "article": article_id,
                "metadata": {"versionNumber": number},
            })
            result = _view(db, _row(db, article_id))
            db.commit()
            return result
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Article publication unavailable") from error


def _public_row(db: Session, institution_slug: str, article_slug: str):
    row = db.execute(text(
        "SELECT a.id, a.published_at, v.version_number, v.snapshot FROM articles a "
        "JOIN article_institutions ai ON ai.article_id = a.id "
        "JOIN institutions i ON i.id = ai.institution_id AND i.is_active = true "
        "JOIN LATERAL (SELECT version_number, snapshot FROM article_versions WHERE article_id = a.id "
        "ORDER BY version_number DESC LIMIT 1) v ON TRUE "
        "WHERE i.slug = :institution AND a.slug = :slug AND a.status = 'PUBLISHED'"
    ), {"institution": institution_slug, "slug": article_slug}).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Published article not found")
    return row


@public_router.get("/{institution_slug}/articles", response_model=list[PublicArticleSummary])
def public_articles(institution_slug: str, response: Response, engine=Depends(migration_public_engine)):
    _no_store(response)
    response.headers["X-FUMEP-Data-Source"] = "migration-test"
    try:
        with Session(engine) as db:
            rows = db.execute(text(
                "SELECT a.id, a.published_at, v.snapshot FROM articles a "
                "JOIN article_institutions ai ON ai.article_id = a.id "
                "JOIN institutions i ON i.id = ai.institution_id AND i.is_active = true "
                "JOIN LATERAL (SELECT snapshot FROM article_versions WHERE article_id = a.id "
                "ORDER BY version_number DESC LIMIT 1) v ON TRUE "
                "WHERE i.slug = :institution AND a.status = 'PUBLISHED' "
                "ORDER BY a.published_at DESC, a.id DESC LIMIT 50"
            ), {"institution": institution_slug})
            return [PublicArticleSummary(
                id=row.id, title=row.snapshot["title"], slug=row.snapshot["slug"],
                summary=row.snapshot["summary"], cover_image_id=row.snapshot["coverImageId"],
                cover_image_alt=row.snapshot["coverImageAlt"], published_at=row.published_at,
            ) for row in rows]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Public articles unavailable") from error


@public_router.get("/{institution_slug}/articles/{article_slug}", response_model=PublicArticle)
def public_article(institution_slug: str, article_slug: str, response: Response,
                   engine=Depends(migration_public_engine)):
    _no_store(response)
    response.headers["X-FUMEP-Data-Source"] = "migration-test"
    try:
        with Session(engine) as db:
            row = _public_row(db, institution_slug, article_slug)
            data = row.snapshot
            return PublicArticle(
                id=row.id, title=data["title"], slug=data["slug"], summary=data["summary"],
                cover_image_id=data["coverImageId"], cover_image_alt=data["coverImageAlt"],
                published_at=row.published_at, version_number=row.version_number,
                blocks=[BlockSnapshot.model_validate(block) for block in data["blocks"]],
            )
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Public article unavailable") from error


@public_router.get("/{institution_slug}/articles/{article_slug}/cover")
def public_cover(institution_slug: str, article_slug: str, engine=Depends(migration_public_engine)):
    try:
        with Session(engine) as db:
            row = _public_row(db, institution_slug, article_slug)
            media = db.execute(text(
                "SELECT storage_key, mime_type, size_bytes, type, processing_status, deletion_status "
                "FROM media WHERE id = :id"
            ), {"id": UUID(row.snapshot["coverImageId"])}).first()
            if media is None or media.type != "IMAGE" or media.processing_status != "READY" or media.deletion_status != "NONE":
                raise HTTPException(status_code=404, detail="Cover unavailable")
            key, mime, size = media.storage_key, media.mime_type, media.size_bytes
            _require_original_key(key)
            if mime not in {"image/jpeg", "image/png", "image/webp", "image/avif"} or size <= 0 or size > MAX_IMAGE_BYTES:
                raise HTTPException(status_code=503, detail="Cover unavailable")
        object_response = _storage().get_object(PRIVATE_BUCKET, key)
        try:
            content = object_response.read(size + 1)
        finally:
            object_response.close()
            object_response.release_conn()
        if len(content) != size:
            raise HTTPException(status_code=503, detail="Cover unavailable")
        return Response(content=content, media_type=mime, headers={
            "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox", "Content-Disposition": "inline",
        })
    except HTTPException:
        raise
    except (SQLAlchemyError, S3Error, ValueError) as error:
        raise HTTPException(status_code=503, detail="Cover unavailable") from error
