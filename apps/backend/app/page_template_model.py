"""Mapping for the existing logical PageTemplate contract, not schema creation."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Table, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


# Referenced legacy tables are declared only for FK resolution. This metadata is
# never used with create_all or autogenerate against the Drizzle-owned schema.
Table("institutions", Base.metadata, Column("id", PG_UUID(as_uuid=True), primary_key=True))
Table("users", Base.metadata, Column("id", PG_UUID(as_uuid=True), primary_key=True))


class PageTemplateRow(Base):
    __tablename__ = "page_templates"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    institution_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    blocks_snapshot: Mapped[list[dict]] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
