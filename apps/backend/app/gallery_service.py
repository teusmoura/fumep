"""Transactional gallery operations over the existing media/usage lifecycle."""

from uuid import UUID, uuid4

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.gallery_model import GalleryItemRow, GalleryRow


class GalleryConflict(Exception):
    pass


class MediaNotSelectable(Exception):
    pass


def locked_gallery(db: Session, gallery_id: UUID) -> GalleryRow | None:
    return db.scalar(select(GalleryRow).where(GalleryRow.id == gallery_id).with_for_update())


def ordered_items(db: Session, gallery_id: UUID) -> list[GalleryItemRow]:
    return list(db.scalars(select(GalleryItemRow).where(GalleryItemRow.gallery_id == gallery_id).order_by(GalleryItemRow.position, GalleryItemRow.id)))


def _touch(gallery: GalleryRow) -> None:
    gallery.updated_at = func.now()


def add_item(db: Session, gallery: GalleryRow, *, media_id: UUID, alt_text: str, caption: str | None) -> GalleryItemRow:
    # Share the Media row lock with deletion requests. This check and MediaUsage
    # creation commit together, so REQUESTED/FAILED can never gain a new owner.
    media = db.execute(
        text("SELECT id, type, processing_status, deletion_status FROM media WHERE id = :id FOR UPDATE"),
        {"id": media_id},
    ).mappings().first()
    if media is None or media["type"] != "IMAGE" or media["processing_status"] != "READY" or media["deletion_status"] != "NONE":
        raise MediaNotSelectable()
    position = len(ordered_items(db, gallery.id))
    item = GalleryItemRow(
        id=uuid4(), gallery_id=gallery.id, media_id=media_id,
        alt_text=alt_text.strip(), caption=caption, position=position,
    )
    db.add(item)
    db.flush()
    db.execute(
        text("INSERT INTO media_usages (id, media_id, entity_type, entity_id, field_name) "
             "VALUES (:id, :media_id, 'GALLERY_ITEM', :entity_id, 'media_id')"),
        {"id": uuid4(), "media_id": media_id, "entity_id": item.id},
    )
    _touch(gallery)
    return item


def remove_item(db: Session, gallery: GalleryRow, item_id: UUID) -> bool:
    items = ordered_items(db, gallery.id)
    target = next((item for item in items if item.id == item_id), None)
    if target is None:
        return False
    db.execute(
        text("DELETE FROM media_usages WHERE entity_type = 'GALLERY_ITEM' AND entity_id = :id AND field_name = 'media_id'"),
        {"id": target.id},
    )
    db.delete(target)
    for position, item in enumerate(item for item in items if item.id != item_id):
        item.position = position
    _touch(gallery)
    return True


def reorder_items(db: Session, gallery: GalleryRow, ids: list[UUID]) -> list[GalleryItemRow]:
    items = ordered_items(db, gallery.id)
    if len(ids) != len(items) or len(set(ids)) != len(ids) or set(ids) != {item.id for item in items}:
        raise GalleryConflict("Order must contain every gallery item exactly once")
    by_id = {item.id: item for item in items}
    result = [by_id[id_] for id_ in ids]
    for position, item in enumerate(result):
        item.position = position
    _touch(gallery)
    return result


def remove_gallery(db: Session, gallery: GalleryRow) -> None:
    for item in ordered_items(db, gallery.id):
        db.execute(
            text("DELETE FROM media_usages WHERE entity_type = 'GALLERY_ITEM' AND entity_id = :id AND field_name = 'media_id'"),
            {"id": item.id},
        )
    db.delete(gallery)
