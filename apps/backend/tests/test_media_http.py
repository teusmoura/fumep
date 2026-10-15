"""Real PostgreSQL catalog acceptance with a private storage boundary."""

import os
from io import BytesIO
from types import SimpleNamespace
from uuid import UUID, uuid4

import fakeredis
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import text
from sqlalchemy.engine import make_url

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


def test_media_http_refuses_unapproved_database_or_remote_host():
    from app.media_http import _engine
    from fastapi import HTTPException

    def principal(url):
        engine = SimpleNamespace(url=make_url(url))
        return SimpleNamespace(context=SimpleNamespace(users=SimpleNamespace(engine=engine)))

    for url in (
        "postgresql://u:p@127.0.0.1/portal_fumep",
        "postgresql://u:p@db.example/portal_fumep_mig58_test",
    ):
        with pytest.raises(HTTPException) as rejected:
            _engine(principal(url))
        assert rejected.value.status_code == 503
    local = principal("postgresql://u:p@127.0.0.1/portal_fumep_mig58_test")
    assert _engine(local) is local.context.users.engine


def test_upload_to_unapproved_database_never_contacts_storage(monkeypatch):
    from app import media_http
    unsafe_engine = SimpleNamespace(url=make_url("postgresql://u:p@127.0.0.1/portal_fumep"))
    principal = SimpleNamespace(context=SimpleNamespace(users=SimpleNamespace(engine=unsafe_engine)))
    app.dependency_overrides[actor] = lambda: principal
    monkeypatch.setattr(media_http, "_storage", lambda: pytest.fail("Storage must not be contacted"))
    try:
        with TestClient(app, base_url=ORIGIN) as client:
            response = client.post(ROOT, files={"file": ("valid.jpg", jpeg(), "image/jpeg")})
        assert response.status_code == 503
    finally:
        app.dependency_overrides.pop(actor, None)


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


def test_image_upload_processes_from_http_to_postgres_and_real_minio(env, monkeypatch):
    """Exercise the migration adapter and persistent processor against private storage."""
    endpoint = os.getenv("FUMEP_MINIO_TEST_ENDPOINT")
    access = os.getenv("FUMEP_MINIO_TEST_ACCESS_KEY")
    secret = os.getenv("FUMEP_MINIO_TEST_SECRET_KEY")
    if not all((endpoint, access, secret)):
        pytest.skip("Real MinIO test credentials required")

    from minio import Minio
    from app import media_http
    from app.media_pipeline import MediaPipeline
    from app.media_processing_repository import LockedMediaProcessor, PostgresMediaProcessingRepository
    from app.media_variants import PrivateVariantStorage
    from app.media_worker import MediaOriginalProcessor
    from app.original_image_storage import OriginalImageStorage, PRIVATE_BUCKET

    client, sessions, engine, own, _, admin, _, _, queued = env
    minio = Minio(endpoint, access_key=access, secret_key=secret,
                  secure=os.getenv("FUMEP_MINIO_TEST_SECURE", "false") == "true")
    assert minio.bucket_exists(PRIVATE_BUCKET)
    monkeypatch.setattr(media_http, "_storage", lambda: minio)
    headers = authorize(client, sessions, admin, "ADMIN")
    media_id = None
    keys = []
    try:
        category = client.post(f"{ROOT}/categories", json={
            "institution_id": str(own), "name": "Integration", "slug": f"integration-{uuid4()}"
        }, headers=headers)
        assert category.status_code == 201
        uploaded = client.post(ROOT, files={"file": ("integration.jpg", jpeg(), "image/jpeg")},
                               data={"category_id": category.json()["id"], "alt_text": "Fachada"},
                               headers=headers)
        assert uploaded.status_code == 201, uploaded.text
        media_id = uploaded.json()["id"]
        assert uploaded.json()["processing_status"] == "PENDING"
        assert queued == [UUID(media_id)]

        repository = PostgresMediaProcessingRepository(engine)
        originals = OriginalImageStorage(minio)
        pipeline = MediaPipeline(repository, MediaOriginalProcessor(repository, originals),
                                 PrivateVariantStorage(minio))
        result = LockedMediaProcessor(repository, pipeline).process(UUID(media_id))
        assert (result.width, result.height) == (12, 8)
        with engine.connect() as db:
            row = db.execute(text("SELECT storage_key, processing_status, width, height "
                                  "FROM media WHERE id = :id"), {"id": media_id}).mappings().one()
            keys = [row["storage_key"]]
            keys.extend(db.execute(text("SELECT storage_key FROM media_variants WHERE media_id = :id"),
                                   {"id": media_id}).scalars())
        assert (row["processing_status"], row["width"], row["height"]) == ("READY", 12, 8)
        assert len(keys) == 3
        for key in keys:
            response = minio.get_object(PRIVATE_BUCKET, key)
            try:
                assert response.read()
            finally:
                response.close()
                response.release_conn()
        listed = client.get(ROOT, params={"q": "Fachada"})
        assert listed.status_code == 200
        assert any(item["id"] == media_id and item["processing_status"] == "READY"
                   for item in listed.json())
    finally:
        if media_id is not None:
            with engine.begin() as db:
                keys = [db.execute(text("SELECT storage_key FROM media WHERE id = :id"),
                                   {"id": media_id}).scalar_one()]
                keys.extend(db.execute(text("SELECT storage_key FROM media_variants WHERE media_id = :id"),
                                       {"id": media_id}).scalars())
                db.execute(text("DELETE FROM media_variants WHERE media_id = :id"), {"id": media_id})
        for key in keys:
            minio.remove_object(PRIVATE_BUCKET, key)
