"""Read/write checks only against the dedicated, explicitly supplied test DB."""

import os
from uuid import uuid4

import pytest
from sqlalchemy import inspect, select, text

from app.database import database_engine
from app.page_template_model import PageTemplateRow


@pytest.fixture(scope="module")
def engine():
    url = os.getenv("FUMEP_TEST_DATABASE_URL")
    if not url:
        pytest.skip("FUMEP_TEST_DATABASE_URL is required for PostgreSQL integration")
    if not url.endswith("/portal_fumep_mig58_test"):
        pytest.fail("PageTemplate integration must use the dedicated test database")
    value = database_engine(url)
    yield value
    value.dispose()


def test_audited_baseline_and_template_table(engine):
    inspector = inspect(engine)
    assert {"institutions", "users", "pages", "page_templates"}.issubset(inspector.get_table_names())
    columns = {column["name"] for column in inspector.get_columns("page_templates")}
    assert columns == {
        "id", "institution_id", "name", "description", "blocks_snapshot",
        "is_active", "created_by", "created_at", "updated_at",
    }
    with engine.connect() as connection:
        assert connection.scalar(text("select version_num from alembic_version")) == "20261002_01"


def test_template_mapping_roundtrip_rolls_back(engine):
    template_id = uuid4()
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            from sqlalchemy.orm import Session

            with Session(bind=connection) as session:
                row = PageTemplateRow(
                    id=template_id,
                    institution_id=None,
                    name="Modelo global de teste",
                    description=None,
                    blocks_snapshot=[{"type": "TEXT", "schemaVersion": 1}],
                    is_active=True,
                    created_by=None,
                )
                session.add(row)
                session.flush()
                loaded = session.scalar(select(PageTemplateRow).where(PageTemplateRow.id == template_id))
                assert loaded is not None
                assert loaded.name == row.name
                assert loaded.blocks_snapshot == row.blocks_snapshot
                assert loaded.created_at is not None
        finally:
            transaction.rollback()
