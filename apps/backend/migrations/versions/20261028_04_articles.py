"""First publishable article slice in the dedicated migration database.

Revision ID: 20261028_04
Revises: 20261005_03
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID

revision = "20261028_04"
down_revision = "20261005_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "articles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(220), nullable=False, unique=True),
        sa.Column("subtitle", sa.String(255)),
        sa.Column("summary", sa.Text()),
        sa.Column("cover_image_id", UUID(as_uuid=True), sa.ForeignKey("media.id", ondelete="RESTRICT")),
        sa.Column("cover_image_alt", sa.Text()),
        sa.Column("public_author", sa.String(150)),
        sa.Column("status", ENUM("DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", name="publication_status", create_type=False), server_default="DRAFT", nullable=False),
        sa.Column("is_featured", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("scheduled_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("seo_title", sa.String(255)),
        sa.Column("seo_description", sa.Text()),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("updated_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("published_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("length(trim(title)) > 0", name="articles_title_nonblank_check"),
    )
    op.create_index("articles_status_published_index", "articles", ["status", "published_at"])
    op.create_table(
        "article_institutions",
        sa.Column("article_id", UUID(as_uuid=True), sa.ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("institution_id", UUID(as_uuid=True), sa.ForeignKey("institutions.id", ondelete="RESTRICT"), primary_key=True),
    )
    op.create_index("article_institutions_institution_index", "article_institutions", ["institution_id"])
    op.create_table(
        "article_categories",
        sa.Column("article_id", UUID(as_uuid=True), sa.ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="RESTRICT"), primary_key=True),
    )
    op.create_table(
        "article_versions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("article_id", UUID(as_uuid=True), sa.ForeignKey("articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("snapshot", JSONB(), nullable=False),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("article_id", "version_number", name="article_versions_number_unique"),
    )


def downgrade() -> None:
    op.drop_table("article_versions")
    op.drop_table("article_categories")
    op.drop_index("article_institutions_institution_index", table_name="article_institutions")
    op.drop_table("article_institutions")
    op.drop_index("articles_status_published_index", table_name="articles")
    op.drop_table("articles")
