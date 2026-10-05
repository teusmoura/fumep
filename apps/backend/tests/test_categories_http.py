"""End-to-end catalog tests against only the dedicated migration test database."""

import os
from uuid import uuid4

import fakeredis
import pytest
from fastapi.testclient import TestClient
from redis import Redis
from sqlalchemy import text

from app.auth_http import AuthContext, auth_context
from app.auth_repository import PostgresUserRepository
from app.csrf import CsrfService
from app.database import database_engine
from app.login_rate_limit import LoginRateLimiter
from app.main import app
from app.sessions import COOKIE_NAME, RedisSessionStore

ORIGIN = "http://127.0.0.1:8002"
ROOT = "/api/v1/admin/categories"


@pytest.fixture
def catalog():
    url = os.getenv("FUMEP_TEST_DATABASE_URL")
    if not url:
        pytest.skip("FUMEP_TEST_DATABASE_URL is required for PostgreSQL catalog integration")
    if not url.endswith("/portal_fumep_mig58_test"):
        pytest.fail("Catalog integration requires the dedicated test database")
    engine = database_engine(url)
    institution, foreign_institution, admin, editor = [uuid4() for _ in range(4)]
    with engine.begin() as db:
        for id_, suffix in [(institution, "one"), (foreign_institution, "two")]:
            db.execute(
                text("INSERT INTO institutions (id, name, slug) VALUES (:id, :name, :slug)"),
                {"id": id_, "name": f"MIG CAT {suffix}", "slug": f"mig-cat-{id_}"},
            )
        for id_, role in [(admin, "ADMIN"), (editor, "EDITOR")]:
            db.execute(
                text("INSERT INTO users (id, name, email, password_hash, role) "
                     "VALUES (:id, :name, :email, 'not-a-login-hash', :role)"),
                {"id": id_, "name": f"MIG CAT {role}", "email": f"mig-cat-{id_}@example.invalid", "role": role},
            )
        db.execute(
            text("INSERT INTO user_institutions (user_id, institution_id) VALUES (:user_id, :institution_id)"),
            {"user_id": editor, "institution_id": institution},
        )
    real_redis = os.getenv("FUMEP_TEST_REDIS_URL")
    redis = Redis.from_url(real_redis) if real_redis else fakeredis.FakeRedis()
    sessions = RedisSessionStore(redis, key_prefix=f"migration:cat-test:{uuid4()}:")
    sessions._test_tokens = []
    context = AuthContext(
        users=PostgresUserRepository(engine), sessions=sessions,
        csrf=CsrfService(sessions, allowed_origin=ORIGIN),
        limiter=LoginRateLimiter(redis, secret=b"category-test-secret-longer-than-thirty-two"),
        production=False,
    )
    app.dependency_overrides[auth_context] = lambda: context
    try:
        with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50001)) as client:
            yield client, sessions, institution, foreign_institution, admin, editor
    finally:
        app.dependency_overrides.clear()
        for token in sessions._test_tokens:
            sessions.invalidate(token)
        with engine.begin() as db:
            db.execute(text("DELETE FROM categories WHERE created_by IN (:admin, :editor)"), {"admin": admin, "editor": editor})
            db.execute(text("DELETE FROM user_institutions WHERE user_id = :id"), {"id": editor})
            db.execute(text("DELETE FROM users WHERE id IN (:admin, :editor)"), {"admin": admin, "editor": editor})
            db.execute(text("DELETE FROM institutions WHERE id IN (:one, :two)"), {"one": institution, "two": foreign_institution})
        engine.dispose()
        if real_redis:
            redis.close()


def authorize(client, sessions, user_id, role, institutions=()):
    token = sessions.create(user_id=user_id, role=role, institution_ids=institutions)
    sessions._test_tokens.append(token)
    client.cookies.set(COOKIE_NAME, token)
    return {"Origin": ORIGIN, "X-CSRF-Token": sessions.read_and_refresh(token).csrf_token}


def test_admin_can_manage_real_global_category_with_unique_slug_and_csrf(catalog):
    client, sessions, _, _, admin, _ = catalog
    assert client.get(ROOT).status_code == 401
    headers = authorize(client, sessions, admin, "ADMIN")
    slug = f"global-{uuid4()}"
    payload = {"institution_id": None, "name": "  Categoria Global  ", "slug": slug, "description": None}
    assert client.post(ROOT, json=payload, headers={"Origin": ORIGIN}).status_code == 403
    created = client.post(ROOT, json=payload, headers=headers)
    assert created.status_code == 201, created.text
    item = created.json()
    assert item["name"] == "Categoria Global" and item["institution_id"] is None
    assert client.post(ROOT, json=payload, headers=headers).status_code == 409
    assert any(row["id"] == item["id"] for row in client.get(ROOT).json())
    assert client.get(f"{ROOT}/{item['id']}").status_code == 200
    changed = client.put(
        f"{ROOT}/{item['id']}",
        json={"name": "Novo nome", "slug": slug, "description": "Descrição"}, headers=headers,
    )
    assert changed.status_code == 200 and changed.json()["description"] == "Descrição"
    assert client.delete(f"{ROOT}/{item['id']}", headers=headers).status_code == 204
    assert client.get(f"{ROOT}/{item['id']}").status_code == 404


def test_editor_scope_and_global_management_are_enforced(catalog):
    client, sessions, own, foreign, admin, editor = catalog
    admin_headers = authorize(client, sessions, admin, "ADMIN")
    global_created = client.post(
        ROOT, json={"institution_id": None, "name": "Global", "slug": f"global-{uuid4()}", "description": None},
        headers=admin_headers,
    )
    assert global_created.status_code == 201
    global_id = global_created.json()["id"]
    editor_headers = authorize(client, sessions, editor, "EDITOR", [own])
    own_payload = {"institution_id": str(own), "name": "Ensino", "slug": f"ensino-{uuid4()}", "description": None}
    created = client.post(ROOT, json=own_payload, headers=editor_headers)
    assert created.status_code == 201, created.text
    own_id = created.json()["id"]
    assert client.post(ROOT, json={**own_payload, "institution_id": str(foreign)}, headers=editor_headers).status_code == 403
    assert client.post(ROOT, json={**own_payload, "institution_id": None}, headers=editor_headers).status_code == 403
    assert client.get(f"{ROOT}/{global_id}").status_code == 200
    assert client.put(f"{ROOT}/{global_id}", json={"name": "Alterar", "slug": "alterar", "description": None}, headers=editor_headers).status_code == 403
    visible = {item["id"] for item in client.get(ROOT).json()}
    assert {own_id, global_id}.issubset(visible)
    assert client.delete(f"{ROOT}/{own_id}", headers=editor_headers).status_code == 204


def test_same_slug_is_independent_per_institution_and_editor_cannot_read_foreign(catalog):
    client, sessions, own, foreign, admin, editor = catalog
    headers = authorize(client, sessions, admin, "ADMIN")
    slug = f"compartilhada-{uuid4()}"
    first = client.post(ROOT, json={"institution_id": str(own), "name": "Primeira", "slug": slug, "description": None}, headers=headers)
    second = client.post(ROOT, json={"institution_id": str(foreign), "name": "Segunda", "slug": slug, "description": None}, headers=headers)
    assert first.status_code == 201 and second.status_code == 201
    assert client.post(ROOT, json={"institution_id": str(own), "name": "Duplicada", "slug": slug, "description": None}, headers=headers).status_code == 409
    editor_headers = authorize(client, sessions, editor, "EDITOR", [own])
    ids = {row["id"] for row in client.get(ROOT).json()}
    assert first.json()["id"] in ids and second.json()["id"] not in ids
    assert client.get(f"{ROOT}/{second.json()['id']}").status_code == 403
    assert client.delete(f"{ROOT}/{second.json()['id']}", headers=editor_headers).status_code == 403


def test_invalid_payload_and_revoked_institution_fail_closed(catalog):
    client, sessions, own, _, _, editor = catalog
    headers = authorize(client, sessions, editor, "EDITOR", [own])
    assert client.post(ROOT, json={"institution_id": str(own), "name": "  ", "slug": "ok", "description": None}, headers=headers).status_code == 422
    assert client.post(ROOT, json={"institution_id": str(own), "name": "Nome", "slug": "Slug Inválido", "description": None}, headers=headers).status_code == 422
    with app.dependency_overrides[auth_context]().users.engine.begin() as db:
        db.execute(text("DELETE FROM user_institutions WHERE user_id = :id"), {"id": editor})
    assert client.get(ROOT).status_code == 401
