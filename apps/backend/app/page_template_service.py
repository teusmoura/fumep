"""Transactional PageTemplate validation and independent draft creation."""

from uuid import UUID, uuid4

from sqlalchemy import bindparam, select, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.category_model import CategoryRow
from app.gallery_model import GalleryRow
from app.page_template_model import PageTemplateRow
from app.template_blocks import BlockSnapshot, block_references, validate_snapshot


class TemplateReferenceConflict(Exception):
    pass


def validate_references(db: Session, blocks: list[BlockSnapshot], institution_id: UUID | None) -> None:
    """Resolve real live references; lock Media against concurrent deletion requests."""
    validate_snapshot(blocks)
    if institution_id is not None:
        institution = db.execute(
            text("SELECT is_active FROM institutions WHERE id = :id FOR SHARE"), {"id": institution_id},
        ).first()
        if institution is None or not institution.is_active:
            raise TemplateReferenceConflict("Institution is not usable")
    media: dict[UUID, str] = {}
    institutions: set[UUID] = set()
    categories: set[UUID] = set()
    category_scopes: dict[UUID, list[set[UUID | None]]] = {}
    galleries: set[UUID] = set()
    for block in blocks:
        block_media, block_institutions, block_categories, block_galleries = block_references(block)
        for _, media_id, kind in block_media:
            if media_id in media and media[media_id] != kind:
                raise TemplateReferenceConflict("Media type conflict")
            media[media_id] = kind
        institutions.update(block_institutions)
        categories.update(block_categories)
        allowed_feed_institutions = (
            {UUID(value) for value in block.data["institutionIds"]} or {institution_id}
            if block.type == "NEWS_FEED" else {institution_id}
        )
        for category_id in block_categories:
            category_scopes.setdefault(category_id, []).append(allowed_feed_institutions)
        galleries.update(block_galleries)
    for target_id in sorted(institutions):
        result = db.execute(text("SELECT is_active FROM institutions WHERE id = :id FOR SHARE"), {"id": target_id}).first()
        if result is None or not result.is_active:
            raise TemplateReferenceConflict("Feed institution is not usable")
    for target_id in sorted(categories):
        category = db.scalar(select(CategoryRow).where(CategoryRow.id == target_id).with_for_update(read=True))
        if category is None or (category.institution_id is not None and any(
            category.institution_id not in allowed for allowed in category_scopes[target_id]
        )):
            raise TemplateReferenceConflict("Category is not available in template scope")
    for target_id in sorted(galleries):
        gallery = db.scalar(select(GalleryRow).where(GalleryRow.id == target_id).with_for_update(read=True))
        if gallery is None or (gallery.institution_id is not None and gallery.institution_id != institution_id):
            raise TemplateReferenceConflict("Gallery is not available in template scope")
    for media_id in sorted(media):
        row = db.execute(
            text("SELECT type, processing_status, deletion_status FROM media WHERE id = :id FOR UPDATE"),
            {"id": media_id},
        ).first()
        if row is None or row.type != media[media_id] or row.processing_status != "READY" or row.deletion_status != "NONE":
            raise TemplateReferenceConflict("Media is not selectable")


def add_media_usages(db: Session, entity_type: str, entity_id: UUID, block: BlockSnapshot, prefix: str = "") -> None:
    references, _, _, _ = block_references(block)
    for path, media_id, _ in references:
        db.execute(
            text("INSERT INTO media_usages (id, media_id, entity_type, entity_id, field_name) "
                 "VALUES (:id, :media_id, :entity_type, :entity_id, :field_name)"),
            {"id": uuid4(), "media_id": media_id, "entity_type": entity_type,
             "entity_id": entity_id, "field_name": f"{prefix}{path}"},
        )


def create_template(db: Session, *, institution_id: UUID | None, name: str, description: str | None,
                    blocks: list[BlockSnapshot], created_by: UUID) -> PageTemplateRow:
    validate_references(db, blocks, institution_id)
    row = PageTemplateRow(
        id=uuid4(), institution_id=institution_id, name=name, description=description,
        blocks_snapshot=[block.model_dump(mode="json", exclude_none=True) for block in blocks],
        is_active=True, created_by=created_by,
    )
    db.add(row)
    db.flush()
    for block in blocks:
        add_media_usages(db, "PAGE_TEMPLATE", row.id, block, f"blocks.{block.position}.")
    return row


def apply_template(db: Session, *, template_id: UUID, institution_id: UUID,
                   title: str, slug: str, user_id: UUID) -> tuple[UUID, list[BlockSnapshot]]:
    template = db.scalar(select(PageTemplateRow).where(PageTemplateRow.id == template_id).with_for_update())
    if template is None:
        raise LookupError("Template not found")
    if not template.is_active or (template.institution_id is not None and template.institution_id != institution_id):
        raise TemplateReferenceConflict("Template is not available for this institution")
    try:
        source = [BlockSnapshot.model_validate(value) for value in template.blocks_snapshot]
        validate_references(db, source, institution_id)
    except (ValidationError, ValueError) as error:
        raise TemplateReferenceConflict("Template snapshot is invalid") from error
    page_id = uuid4()
    db.execute(
        text("INSERT INTO pages (id, institution_id, title, slug, status, created_by, updated_by) "
             "VALUES (:id, :institution_id, :title, :slug, 'DRAFT', :user_id, :user_id)"),
        {"id": page_id, "institution_id": institution_id, "title": title,
         "slug": slug, "user_id": user_id},
    )
    insert_block = text(
        "INSERT INTO content_blocks (id, owner_type, owner_id, type, position, is_visible, "
        "schema_version, background, background_media_id, anchor, data) VALUES "
        "(:id, 'PAGE', :owner_id, :type, :position, :is_visible, :schema_version, "
        ":background, :background_media_id, :anchor, :data)"
    ).bindparams(bindparam("data", type_=JSONB))
    copied: list[BlockSnapshot] = []
    for block in source:
        fresh = block.model_copy(update={"id": uuid4()})
        db.execute(insert_block, {
            "id": fresh.id, "owner_id": page_id, "type": fresh.type, "position": fresh.position,
            "is_visible": fresh.isVisible, "schema_version": fresh.schemaVersion,
            "background": fresh.background, "background_media_id": fresh.backgroundMediaId,
            "anchor": fresh.anchor, "data": fresh.data,
        })
        add_media_usages(db, "CONTENT_BLOCK", fresh.id, fresh)
        copied.append(fresh)
    return page_id, copied
