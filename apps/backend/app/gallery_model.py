"""Mappings for Gallery and GalleryItem; schema is Alembic-owned."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.page_template_model import Base


class GalleryRow(Base):
    __tablename__ = "galleries"
    __table_args__ = (CheckConstraint("length(trim(title)) > 0", name="galleries_title_nonblank_check"), Index("galleries_institution_index", "institution_id"))

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    institution_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class GalleryItemRow(Base):
    __tablename__ = "gallery_items"
    __table_args__ = (
        CheckConstraint("length(trim(alt_text)) > 0", name="gallery_items_alt_nonblank_check"),
        CheckConstraint("position >= 0", name="gallery_items_position_nonnegative_check"),
        UniqueConstraint("gallery_id", "position", name="gallery_items_position_unique", deferrable=True, initially="DEFERRED"),
        Index("gallery_items_media_index", "media_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    gallery_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("galleries.id", ondelete="CASCADE"), nullable=False)
    media_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("media.id", ondelete="RESTRICT"), nullable=False)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    alt_text: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
