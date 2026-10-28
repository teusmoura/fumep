"""Read/write checks only against the dedicated, explicitly supplied test DB."""

import os
from uuid import uuid4

import pytest
from sqlalchemy import inspect, select, text

from app.database import database_engine
from app.auth_repository import PostgresUserRepository
from app.page_template_model import PageTemplateRow
from app.passwords import NewPasswordInput, hash_new_password


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
    assert {"institutions", "users", "pages", "page_templates", "categories", "galleries", "gallery_items", "articles", "article_institutions", "article_categories", "article_versions"}.issubset(inspector.get_table_names())
    columns = {column["name"] for column in inspector.get_columns("page_templates")}
    assert columns == {
        "id", "institution_id", "name", "description", "blocks_snapshot",
        "is_active", "created_by", "created_at", "updated_at",
    }
    with engine.connect() as connection:
        assert connection.scalar(text("select version_num from alembic_version")) == "20261028_04"
    category_columns = {column["name"] for column in inspector.get_columns("categories")}
    assert category_columns == {
        "id", "institution_id", "name", "slug", "description",
        "created_by", "created_at", "updated_at",
    }
    category_indexes = {index["name"] for index in inspector.get_indexes("categories")}
    assert {"categories_global_slug_unique", "categories_institution_slug_unique"}.issubset(category_indexes)
    gallery_columns = {column["name"] for column in inspector.get_columns("galleries")}
    assert gallery_columns == {
        "id", "institution_id", "title", "description", "created_by", "created_at", "updated_at",
    }
    item_columns = {column["name"] for column in inspector.get_columns("gallery_items")}
    assert item_columns == {
        "id", "gallery_id", "media_id", "caption", "alt_text", "position", "created_at",
    }
    item_unique = {constraint["name"] for constraint in inspector.get_unique_constraints("gallery_items")}
    assert "gallery_items_position_unique" in item_unique


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


def test_postgres_user_repository_reads_current_role_from_isolated_database(engine):
    user_id = uuid4()
    email = f"mig58-{user_id}@example.invalid"
    encoded = hash_new_password(NewPasswordInput(password="senha de teste longa"))
    with engine.begin() as connection:
        connection.execute(
            text("INSERT INTO users (id, name, email, password_hash, role) "
                 "VALUES (:id, 'Teste MIG 5.8', :email, :password_hash, 'ADMIN')"),
            {"id": user_id, "email": email, "password_hash": encoded},
        )
    try:
        users = PostgresUserRepository(engine)
        found = users.find_by_email(email)
        assert found is not None and found.id == user_id
        assert found.password_hash == encoded and found.role == "ADMIN"
        assert found.institution_ids == ()
        assert users.find_by_email("missing@example.invalid") is None
        current = users.current_access(user_id)
        assert current is not None and current.role == "ADMIN" and current.is_active
        with engine.begin() as connection:
            connection.execute(text("UPDATE users SET is_active = FALSE WHERE id = :id"), {"id": user_id})
        current = users.current_access(user_id)
        assert current is not None and not current.is_active
    finally:
        with engine.begin() as connection:
            connection.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
