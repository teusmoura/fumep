"""Live NEWS_FEED projection; page snapshots keep only filter configuration."""

from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.admin_access import Actor, require_scope
from app.template_blocks import BlockSnapshot


class NewsCard(BaseModel):
    article_id: UUID
    institution_slug: str
    title: str
    slug: str
    summary: str | None
    cover_image_alt: str
    published_at: datetime


def validate_news_feed_scope(db: Session, blocks: list[BlockSnapshot], principal: Actor,
                             page_institution_id: UUID) -> None:
    """Editors may configure only institutions they can administer."""
    for block in blocks:
        if block.type != "NEWS_FEED":
            continue
        institution_ids = [UUID(value) for value in block.data["institutionIds"]] or [page_institution_id]
        category_ids = [UUID(value) for value in block.data["categoryIds"]]
        if len(set(institution_ids)) != len(institution_ids) or len(set(category_ids)) != len(category_ids):
            raise HTTPException(status_code=409, detail="Feed filters must be unique")
        for institution_id in institution_ids:
            require_scope(principal, institution_id)
        for category_id in category_ids:
            row = db.execute(text("SELECT institution_id FROM categories WHERE id = :id FOR SHARE"),
                             {"id": category_id}).first()
            if row is None or (row.institution_id is not None and row.institution_id not in institution_ids):
                raise HTTPException(status_code=409, detail="Feed category is outside selected institutions")


def live_news(db: Session, block: BlockSnapshot, page_institution_id: UUID) -> list[NewsCard]:
    """Resolve current published articles once per request, newest first."""
    institution_ids = [UUID(value) for value in block.data["institutionIds"]] or [page_institution_id]
    category_ids = [UUID(value) for value in block.data["categoryIds"]]
    rows = db.execute(text(
        "SELECT a.id, a.published_at, target.slug AS institution_slug, v.snapshot "
        "FROM articles a "
        "JOIN LATERAL (SELECT i.slug FROM article_institutions ai "
        "JOIN institutions i ON i.id = ai.institution_id AND i.is_active = true "
        "WHERE ai.article_id = a.id AND ai.institution_id = ANY(CAST(:institutions AS uuid[])) "
        "ORDER BY i.slug LIMIT 1) target ON TRUE "
        "JOIN LATERAL (SELECT snapshot FROM article_versions WHERE article_id = a.id "
        "ORDER BY version_number DESC LIMIT 1) v ON TRUE "
        "JOIN media m ON m.id = a.cover_image_id AND m.type = 'IMAGE' "
        "AND m.processing_status = 'READY' AND m.deletion_status = 'NONE' "
        "WHERE a.status = 'PUBLISHED' AND (cardinality(CAST(:categories AS uuid[])) = 0 "
        "OR EXISTS (SELECT 1 FROM article_categories ac WHERE ac.article_id = a.id "
        "AND ac.category_id = ANY(CAST(:categories AS uuid[])))) "
        "ORDER BY a.published_at DESC, a.id DESC LIMIT :limit"
    ), {"institutions": institution_ids, "categories": category_ids, "limit": block.data["limit"]})
    return [NewsCard(
        article_id=row.id, institution_slug=row.institution_slug,
        title=row.snapshot["title"], slug=row.snapshot["slug"],
        summary=row.snapshot["summary"], cover_image_alt=row.snapshot["coverImageAlt"],
        published_at=row.published_at,
    ) for row in rows]
