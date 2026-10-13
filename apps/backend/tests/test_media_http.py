"""Real PostgreSQL catalog acceptance with a private storage boundary."""

import os
from io import BytesIO
from uuid import uuid4

import fakeredis
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import text

from app.auth_http import AuthContext, auth_context
from app.admin_access import actor
from app.auth_repository import PostgresUserRepository
from app.csrf import CsrfService
from app.database import database_engine
from app.login_rate_limit import LoginRateLimiter
from app.main import app
from app.sessions import COOKIE_NAME, RedisSessionStore

ORIGIN = "http://127.0.0.1:8002"
ROOT = "/api/v1/admin/media"


class MemoryStorage:
    def __init__(self):
        self.objects = {}

    def put_object(self, *, bucket_name, object_name, data, length, content_type):
        assert bucket_name == "portal-private"
        self.objects[object_name] = data.read(length)

    def remove_object(self, *, bucket_name, object_name):
        self.objects.pop(object_name, None)


@pytest.fixture
def env(monkeypatch):
    url = os.getenv("FUMEP_TEST_DATABASE_URL")
    if not url:
        pytest.skip("FUMEP_TEST_DATABASE_URL required for media integration")
    if not url.endswith("/portal_fumep_mig58_test"):
        pytest.fail("Media integration requires the dedicated migration test database")
    engine = database_engine(url)
    institution, other, admin, editor = [uuid4() for _ in range(4)]
    with engine.begin() as db:
        for id_ in (institution, other):
            db.execute(text("INSERT INTO institutions (id, name, slug) VALUES (:id, 'Media Test', :slug)"),
                       {"id": id_, "slug": f"media-test-{id_}"})
        for id_, role in ((admin, "ADMIN"), (editor, "EDITOR")):
            db.execute(text("INSERT INTO users (id, name, email, password_hash, role) "
                            "VALUES (:id, 'Media Test', :email, 'not-a-login-hash', :role)"),
                       {"id": id_, "email": f"media-test-{id_}@example.invalid", "role": role})
        db.execute(text("INSERT INTO user_institutions (user_id, institution_id) VALUES (:user_id, :institution_id)"),
                   {"user_id": editor, "institution_id": institution})
    redis = fakeredis.FakeRedis()
    sessions = RedisSessionStore(redis, key_prefix=f"migration:media-test:{uuid4()}:")
    context = AuthContext(
        users=PostgresUserRepository(engine), sessions=sessions,
        csrf=CsrfService(sessions, allowed_origin=ORIGIN),
        limiter=LoginRateLimiter(redis, secret=b"media-test-secret-longer-than-thirty-two"),
        production=False,
    )
    from app import media_http
    storage = MemoryStorage()
    queued = []
    monkeypatch.setattr(media_http, "_storage", lambda: storage)
    monkeypatch.setattr(media_http.MediaQueuePublisher, "enqueue_process_media", lambda self, media_id: queued.append(media_id))
    app.dependency_overrides[auth_context] = lambda: context
    try:
        with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50003)) as client:
            yield client, sessions, engine, institution, other, admin, editor, storage, queued
    finally:
        app.dependency_overrides.clear()
        with engine.begin() as db:
            db.execute(text("DELETE FROM media WHERE uploaded_by IN (:admin, :editor)"), {"admin": admin, "editor": editor})
            db.execute(text("DELETE FROM media_categories WHERE created_by IN (:admin, :editor)"), {"admin": admin, "editor": editor})
            db.execute(text("DELETE FROM user_institutions WHERE user_id = :id"), {"id": editor})
            db.execute(text("DELETE FROM users WHERE id IN (:admin, :editor)"), {"admin": admin, "editor": editor})
            db.execute(text("DELETE FROM institutions WHERE id IN (:one, :two)"), {"one": institution, "two": other})
        engine.dispose()


def authorize(client, sessions, user_id, role, institutions=()):
    token = sessions.create(user_id=user_id, role=role, institution_ids=institutions)
    client.cookies.set(COOKIE_NAME, token)
    return {"Origin": ORIGIN, "X-CSRF-Token": sessions.read_and_refresh(token).csrf_token}


def jpeg():
    buffer = BytesIO()
    Image.new("RGB", (12, 8), (200, 30, 20)).save(buffer, format="JPEG")
    return buffer.getvalue()


def test_rejects_malformed_and_oversized_upload_before_storage(monkeypatch):
    from app import media_http
    app.dependency_overrides[actor] = lambda: object()
    monkeypatch.setattr(media_http, "_storage", lambda: pytest.fail("Storage must not be contacted"))
    try:
        with TestClient(app, base_url=ORIGIN) as client:
            invalid = client.post(ROOT, files={"file": ("wrong.pdf", b"not a PDF", "application/pdf")})
            assert invalid.status_code == 422
            oversized = client.post(ROOT, files={"file": ("large.jpg", b"x" * (15 * 1024 * 1024 + 1), "image/jpeg")})
            assert oversized.status_code == 413
    finally:
        app.dependency_overrides.pop(actor, None)


def test_upload_list_categories_scope_and_csrf(env):
    client, sessions, engine, own, other, admin, editor, storage, queued = env
    assert client.get(ROOT).status_code == 401
    headers = authorize(client, sessions, admin, "ADMIN")
    own_category = client.post(f"{ROOT}/categories", json={"institution_id": str(own), "name": "Fotos", "slug": f"fotos-{uuid4()}"}, headers=headers)
    other_category = client.post(f"{ROOT}/categories", json={"institution_id": str(other), "name": "Outra", "slug": f"outra-{uuid4()}"}, headers=headers)
    assert own_category.status_code == other_category.status_code == 201
    category_id = own_category.json()["id"]
    headers = authorize(client, sessions, editor, "EDITOR", [own])
    assert client.post(ROOT, files={"file": ("foto.jpg", jpeg(), "image/jpeg")},
                       data={"category_id": category_id}, headers={"Origin": ORIGIN}).status_code == 403
    uploaded = client.post(ROOT, files={"file": ("foto.jpg", jpeg(), "image/jpeg")},
                           data={"category_id": category_id, "alt_text": "Fachada"}, headers=headers)
    assert uploaded.status_code == 201, uploaded.text
    assert uploaded.json()["processing_status"] == "PENDING"
    assert uploaded.json()["category_id"] == category_id
    assert len(queued) == 1 and storage.objects
    rows = client.get(ROOT, params={"q": "Fachada", "type": "IMAGE"}).json()
    assert [row["id"] for row in rows] == [uploaded.json()["id"]]
    assert len(client.get(f"{ROOT}/categories").json()) == 1
    assert client.post(ROOT, files={"file": ("foto.jpg", jpeg(), "image/jpeg")},
                       data={"category_id": other_category.json()["id"]}, headers=headers).status_code == 403
    assert client.post(f"{ROOT}/categories", json={"institution_id": None, "name": "Global", "slug": "global"}, headers=headers).status_code == 403
    with engine.connect() as db:
        persisted = db.execute(text("SELECT checksum_sha256, storage_key FROM media WHERE id = :id"),
                               {"id": uploaded.json()["id"]}).mappings().one()
    assert len(persisted["checksum_sha256"]) == 64
    assert persisted["storage_key"] in storage.objects


def test_pdf_validation_and_rejected_upload_do_not_store(env):
    client, sessions, _, _, _, admin, _, storage, queued = env
    headers = authorize(client, sessions, admin, "ADMIN")
    bad = client.post(ROOT, files={"file": ("wrong.pdf", b"not a PDF", "application/pdf")}, headers=headers)
    assert bad.status_code == 422 and not storage.objects
    pdf = client.post(ROOT, files={"file": ("notice.pdf", b"%PDF-1.7\n%%EOF", "application/pdf")}, headers=headers)
    assert pdf.status_code == 201, pdf.text
    assert pdf.json()["type"] == "DOCUMENT" and pdf.json()["processing_status"] == "READY"
    assert not queued
