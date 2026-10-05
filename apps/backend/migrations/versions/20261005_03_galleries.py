"""Create galleries and ordered media items after the audited catalog.

Revision ID: 20261005_03
Revises: 20261005_02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "20261005_03"
down_revision = "20261005_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "galleries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("institution_id", UUID(as_uuid=True), sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("length(trim(title)) > 0", name="galleries_title_nonblank_check"),
    )
    op.create_index("galleries_institution_index", "galleries", ["institution_id"])
    op.create_table(
        "gallery_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("gallery_id", UUID(as_uuid=True), sa.ForeignKey("galleries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_id", UUID(as_uuid=True), sa.ForeignKey("media.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("alt_text", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("length(trim(alt_text)) > 0", name="gallery_items_alt_nonblank_check"),
        sa.CheckConstraint("position >= 0", name="gallery_items_position_nonnegative_check"),
        sa.UniqueConstraint("gallery_id", "position", name="gallery_items_position_unique", deferrable=True, initially="DEFERRED"),
    )
    op.create_index("gallery_items_media_index", "gallery_items", ["media_id"])


def downgrade() -> None:
    op.drop_index("gallery_items_media_index", table_name="gallery_items")
    op.drop_table("gallery_items")
    op.drop_index("galleries_institution_index", table_name="galleries")
    op.drop_table("galleries")
