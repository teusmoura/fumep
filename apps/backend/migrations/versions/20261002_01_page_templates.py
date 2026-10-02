"""Add PageTemplate after verified Drizzle baseline.

Revision ID: 20261002_01
Revises: 20261002_00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "20261002_01"
down_revision = "20261002_00"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "page_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("institution_id", UUID(as_uuid=True), sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("blocks_snapshot", JSONB(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("length(trim(name)) > 0", name="page_templates_name_nonblank_check"),
        sa.CheckConstraint("jsonb_typeof(blocks_snapshot) = 'array'", name="page_templates_snapshot_array_check"),
    )


def downgrade() -> None:
    op.drop_table("page_templates")
