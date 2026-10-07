"""Uncached public projection of published migration-test page snapshots."""

from functools import lru_cache
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import database_engine
from app.template_blocks import BlockSnapshot

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


class PublicPage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    institution_slug: str
    title: str
    slug: str
    version_number: int
    blocks: list[BlockSnapshot]


@router.get("/{institution_slug}/pages/{page_slug}", response_model=PublicPage)
def get_published_page(institution_slug: str, page_slug: str, response: Response,
                       engine=Depends(migration_public_engine)) -> PublicPage:
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-FUMEP-Data-Source"] = "migration-test"
    try:
        with Session(engine) as db:
            row = db.execute(text(
                "SELECT p.id, v.version_number, v.snapshot FROM pages p "
                "JOIN institutions i ON i.id = p.institution_id "
                "JOIN LATERAL (SELECT version_number, snapshot FROM page_versions "
                "WHERE page_id = p.id ORDER BY version_number DESC LIMIT 1) v ON TRUE "
                "WHERE i.slug = :institution_slug AND i.is_active = true "
                "AND p.slug = :page_slug AND p.status = 'PUBLISHED'"
            ), {"institution_slug": institution_slug, "page_slug": page_slug}).first()
            if row is None:
                raise HTTPException(status_code=404, detail="Published page not found")
            snapshot = row.snapshot
            return PublicPage(id=row.id, institution_slug=institution_slug,
                              title=snapshot["title"], slug=snapshot["slug"],
                              version_number=row.version_number,
                              blocks=[BlockSnapshot.model_validate(block) for block in snapshot["blocks"]])
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Published page unavailable") from error
