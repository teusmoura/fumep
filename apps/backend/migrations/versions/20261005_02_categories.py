"""Create the editorial category catalog in the audited test database.

Revision ID: 20261005_02
Revises: 20261002_01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "20261005_02"
down_revision = "20261002_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("institution_id", UUID(as_uuid=True), sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("length(trim(name)) > 0", name="categories_name_nonblank_check"),
        sa.CheckConstraint("slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'", name="categories_slug_format_check"),
    )
    op.create_index("categories_institution_slug_unique", "categories", ["institution_id", "slug"], unique=True, postgresql_where=sa.text("institution_id IS NOT NULL"))
    op.create_index("categories_global_slug_unique", "categories", ["slug"], unique=True, postgresql_where=sa.text("institution_id IS NULL"))


def downgrade() -> None:
    op.drop_index("categories_global_slug_unique", table_name="categories")
    op.drop_index("categories_institution_slug_unique", table_name="categories")
    op.drop_table("categories")
