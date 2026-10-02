"""Drizzle 0019 baseline audit; no DDL on existing tables.

Revision ID: 20261002_00
Revises:
"""

from alembic import op
from sqlalchemy import inspect

revision = "20261002_00"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    expected = {
        "institutions": {"id", "name", "slug"},
        "users": {"id", "email", "password_hash", "role", "is_active"},
        "pages": {"id", "institution_id", "title", "slug"},
        "user_institutions": {"user_id", "institution_id"},
    }
    tables = set(inspector.get_table_names())
    if "page_templates" in tables:
        raise RuntimeError("Unversioned page_templates exists; manual audit required")
    for table, columns in expected.items():
        if table not in tables or not columns.issubset({column["name"] for column in inspector.get_columns(table)}):
            raise RuntimeError(f"Drizzle baseline mismatch: {table}")


def downgrade() -> None:
    raise RuntimeError("Drizzle baseline cannot be downgraded")
