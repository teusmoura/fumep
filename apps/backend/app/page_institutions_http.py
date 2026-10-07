"""Active institution choices for the migration page journey."""

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.admin_access import Actor, actor, require_scope
from app.page_templates_http import _engine

router = APIRouter(prefix="/api/v1/admin/page-institutions", tags=["page institutions"])


class InstitutionChoice(BaseModel):
    id: UUID
    name: str
    slug: str


@router.get("", response_model=list[InstitutionChoice])
def list_page_institutions(response: Response, principal: Actor = Depends(actor)) -> list[InstitutionChoice]:
    require_scope(principal, None)
    response.headers["Cache-Control"] = "no-store"
    try:
        with Session(_engine(principal)) as db:
            return [InstitutionChoice.model_validate(row._mapping) for row in db.execute(text(
                "SELECT id, name, slug FROM institutions WHERE is_active = true ORDER BY name, id"
            ))]
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Institution choices unavailable") from error
