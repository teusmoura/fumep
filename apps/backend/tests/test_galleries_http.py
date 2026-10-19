"""Gallery CRUD, media lifecycle and ordering against the isolated test DB."""

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from uuid import UUID, uuid4

import fakeredis
import pytest
from fastapi.testclient import TestClient
from redis import Redis
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth_http import AuthContext, auth_context
from app.auth_repository import PostgresUserRepository
from app.csrf import CsrfService
from app.database import database_engine
from app.gallery_model import GalleryItemRow
from app.gallery_service import add_item, locked_gallery
from app.login_rate_limit import LoginRateLimiter
from app.main import app
from app.sessions import COOKIE_NAME, RedisSessionStore

ORIGIN = "http://127.0.0.1:8002"
ROOT = "/api/v1/admin/galleries"


@pytest.fixture
def gallery_env():
    url = os.getenv("FUMEP_TEST_DATABASE_URL")
    if not url:
        pytest.skip("FUMEP_TEST_DATABASE_URL required for gallery integration")
    if not url.endswith("/portal_fumep_mig58_test"):
        pytest.fail("Gallery integration requires the dedicated test database")
    engine = database_engine(url)
    own, foreign, admin, editor = [uuid4() for _ in range(4)]
    media = {name: uuid4() for name in ("first", "second", "pending", "document", "deleting", "foreign")}
    categories = {"own": uuid4(), "foreign": uuid4()}
    with engine.begin() as db:
        for id_ in (own, foreign):
            db.execute(text("INSERT INTO institutions (id, name, slug) VALUES (:id, 'Gallery Test', :slug)"), {"id": id_, "slug": f"gallery-test-{id_}"})
        for id_, role in ((admin, "ADMIN"), (editor, "EDITOR")):
            db.execute(
                text("INSERT INTO users (id, name, email, password_hash, role) "
                     "VALUES (:id, 'Gallery Test', :email, 'not-a-login-hash', :role)"),
                {"id": id_, "email": f"gallery-test-{id_}@example.invalid", "role": role},
            )
        db.execute(text("INSERT INTO user_institutions (user_id, institution_id) VALUES (:user_id, :institution_id)"), {"user_id": editor, "institution_id": own})
        for scope, institution_id in (("own", own), ("foreign", foreign)):
            db.execute(text(
                "INSERT INTO media_categories (id, institution_id, name, slug) "
                "VALUES (:id, :institution_id, :name, :slug)"
            ), {"id": categories[scope], "institution_id": institution_id,
                "name": "Gallery Test", "slug": f"gallery-test-{categories[scope]}"})
        for name, id_ in media.items():
            deleting = name == "deleting"
            db.execute(
                text("INSERT INTO media (id, type, original_filename, stored_filename, mime_type, size_bytes, storage_key, checksum_sha256, category_id, processing_status, deletion_status, deletion_requested_at) "
                     "VALUES (:id, :type, :filename, :filename, :mime, 1, :key, :checksum, :category_id, :processing, :deletion, :requested_at)"),
                {
                    "id": id_, "type": "DOCUMENT" if name == "document" else "IMAGE",
                    "filename": f"{name}.jpg", "mime": "application/pdf" if name == "document" else "image/jpeg",
                    "key": f"gallery-test/{id_}", "checksum": id_.hex * 2,
                    "category_id": categories["foreign" if name == "foreign" else "own"],
                    "processing": "PENDING" if name == "pending" else "READY",
                    "deletion": "REQUESTED" if deleting else "NONE",
                    "requested_at": datetime.now(timezone.utc) if deleting else None,
                },
            )
    real_redis = os.getenv("FUMEP_TEST_REDIS_URL")
    redis = Redis.from_url(real_redis) if real_redis else fakeredis.FakeRedis()
    sessions = RedisSessionStore(redis, key_prefix=f"migration:gallery-test:{uuid4()}:")
    tokens = []
    context = AuthContext(
        users=PostgresUserRepository(engine), sessions=sessions,
        csrf=CsrfService(sessions, allowed_origin=ORIGIN),
        limiter=LoginRateLimiter(redis, secret=b"gallery-test-secret-longer-than-thirty-two"),
        production=False,
    )
    app.dependency_overrides[auth_context] = lambda: context
    try:
        with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50002)) as client:
            yield client, engine, sessions, tokens, own, foreign, admin, editor, media
    finally:
        app.dependency_overrides.clear()
        for token in tokens:
            sessions.invalidate(token)
        with engine.begin() as db:
            db.execute(
                text("DELETE FROM media_usages WHERE entity_type = 'GALLERY_ITEM' AND entity_id IN "
                     "(SELECT gi.id FROM gallery_items gi JOIN galleries g ON g.id = gi.gallery_id WHERE g.created_by IN (:admin, :editor))"),
                {"admin": admin, "editor": editor},
            )
            db.execute(text("DELETE FROM galleries WHERE created_by IN (:admin, :editor)"), {"admin": admin, "editor": editor})
            for id_ in media.values():
                db.execute(text("DELETE FROM media WHERE id = :id"), {"id": id_})
            db.execute(text("DELETE FROM media_categories WHERE id IN (:own, :foreign)"), categories)
            db.execute(text("DELETE FROM user_institutions WHERE user_id = :id"), {"id": editor})
            db.execute(text("DELETE FROM users WHERE id IN (:admin, :editor)"), {"admin": admin, "editor": editor})
            db.execute(text("DELETE FROM institutions WHERE id IN (:own, :foreign)"), {"own": own, "foreign": foreign})
        engine.dispose()
        if real_redis:
            redis.close()


def authorize(client, sessions, tokens, user_id, role, institutions=()):
    token = sessions.create(user_id=user_id, role=role, institution_ids=institutions)
    tokens.append(token)
    client.cookies.set(COOKIE_NAME, token)
    return {"Origin": ORIGIN, "X-CSRF-Token": sessions.read_and_refresh(token).csrf_token}


def test_gallery_items_usage_order_feed_and_delete(gallery_env):
    client, engine, sessions, tokens, own, _, admin, editor, media = gallery_env
    assert client.get(ROOT).status_code == 401
    headers = authorize(client, sessions, tokens, admin, "ADMIN")
    global_gallery = client.post(ROOT, json={"institution_id": None, "title": "Global", "description": None}, headers=headers)
    assert global_gallery.status_code == 201
    global_id = global_gallery.json()["id"]
    headers = authorize(client, sessions, tokens, editor, "EDITOR", [own])
    assert client.post(ROOT, json={"institution_id": None, "title": "Proibida", "description": None}, headers=headers).status_code == 403
    assert client.post(ROOT, json={"institution_id": str(own), "title": "Minha", "description": None}, headers={"Origin": ORIGIN}).status_code == 403
    created = client.post(ROOT, json={"institution_id": str(own), "title": "  Minha galeria  ", "description": None}, headers=headers)
    assert created.status_code == 201, created.text
    gallery_id = created.json()["id"]
    assert created.json()["title"] == "Minha galeria"
    assert client.get(f"{ROOT}/{global_id}").status_code == 403
    assert global_id not in {row["id"] for row in client.get(ROOT).json()}
    assert client.put(f"{ROOT}/{global_id}", json={"title": "Troca", "description": None}, headers=headers).status_code == 403
    first = client.post(f"{ROOT}/{gallery_id}/items", json={"media_id": str(media["first"]), "alt_text": "Primeira", "caption": None}, headers=headers)
    second = client.post(f"{ROOT}/{gallery_id}/items", json={"media_id": str(media["second"]), "alt_text": "Segunda", "caption": "Legenda"}, headers=headers)
    assert first.status_code == 201 and second.status_code == 201
    ids = [first.json()["id"], second.json()["id"]]
    assert [item["position"] for item in client.get(f"{ROOT}/{gallery_id}/items").json()] == [0, 1]
    with engine.connect() as db:
        usages = db.scalar(text("SELECT count(*) FROM media_usages WHERE entity_type = 'GALLERY_ITEM' AND entity_id IN (:first, :second)"), {"first": ids[0], "second": ids[1]})
        assert usages == 2
    try:
        with engine.begin() as db:
            db.execute(text("DELETE FROM media WHERE id = :id"), {"id": media["first"]})
    except IntegrityError:
        pass
    else:
        pytest.fail("Media in a gallery must be protected by FK/MediaUsage")
    feed = client.get(f"{ROOT}/{gallery_id}/feed?limit=1")
    assert feed.status_code == 200 and [item["id"] for item in feed.json()["items"]] == ids[:1]
    assert "storage_key" not in feed.text and "gallery-test/" not in feed.text
    reordered = client.put(f"{ROOT}/{gallery_id}/order", json={"item_ids": ids[::-1]}, headers=headers)
    assert reordered.status_code == 200, reordered.text
    assert [item["id"] for item in client.get(f"{ROOT}/{gallery_id}/items").json()] == ids[::-1]
    assert client.put(f"{ROOT}/{gallery_id}/order", json={"item_ids": [ids[0], ids[0]]}, headers=headers).status_code == 409
    edited = client.put(f"{ROOT}/{gallery_id}/items/{ids[0]}", json={"alt_text": "Nova descrição", "caption": None}, headers=headers)
    assert edited.status_code == 200 and edited.json()["alt_text"] == "Nova descrição"
    assert client.delete(f"{ROOT}/{gallery_id}/items/{ids[0]}", headers=headers).status_code == 204
    assert [item["position"] for item in client.get(f"{ROOT}/{gallery_id}/items").json()] == [0]
    assert client.delete(f"{ROOT}/{gallery_id}", headers=headers).status_code == 204
    with engine.connect() as db:
        assert db.scalar(text("SELECT count(*) FROM media_usages WHERE entity_type = 'GALLERY_ITEM' AND entity_id IN (:first, :second)"), {"first": ids[0], "second": ids[1]}) == 0


def test_gallery_rejects_foreign_scope_and_unselectable_media(gallery_env):
    client, engine, sessions, tokens, own, foreign, admin, editor, media = gallery_env
    admin_headers = authorize(client, sessions, tokens, admin, "ADMIN")
    foreign_gallery = client.post(ROOT, json={"institution_id": str(foreign), "title": "Outra", "description": None}, headers=admin_headers)
    assert foreign_gallery.status_code == 201
    foreign_id = foreign_gallery.json()["id"]
    headers = authorize(client, sessions, tokens, editor, "EDITOR", [own])
    assert client.get(f"{ROOT}/{foreign_id}").status_code == 403
    assert client.post(f"{ROOT}/{foreign_id}/items", json={"media_id": str(media["first"]), "alt_text": "Alt", "caption": None}, headers=headers).status_code == 403
    assert client.post(ROOT, json={"institution_id": str(foreign), "title": "Negada", "description": None}, headers=headers).status_code == 403
    own_gallery = client.post(ROOT, json={"institution_id": str(own), "title": "Minha", "description": None}, headers=headers)
    gallery_id = own_gallery.json()["id"]
    for name in ("pending", "document", "deleting"):
        rejected = client.post(f"{ROOT}/{gallery_id}/items", json={"media_id": str(media[name]), "alt_text": "Alt", "caption": None}, headers=headers)
        assert rejected.status_code == 409, (name, rejected.text)
    assert client.post(f"{ROOT}/{gallery_id}/items", json={"media_id": str(media["foreign"]), "alt_text": "Alt", "caption": None}, headers=headers).status_code == 403
    assert client.post(f"{ROOT}/{gallery_id}/items", json={"media_id": str(media["first"]), "alt_text": "   ", "caption": None}, headers=headers).status_code == 422
    assert client.get(f"{ROOT}/{gallery_id}/items").json() == []
    assert client.get(f"{ROOT}/{gallery_id}/feed").json()["items"] == []
    with engine.connect() as db:
        assert db.scalar(text("SELECT count(*) FROM media_usages WHERE entity_type = 'GALLERY_ITEM' AND media_id IN (:first, :second)"), {"first": media["first"], "second": media["second"]}) == 0
    with engine.begin() as db:
        db.execute(text("DELETE FROM user_institutions WHERE user_id = :id"), {"id": editor})
    assert client.get(f"{ROOT}/{gallery_id}").status_code == 401


def test_concurrent_additions_are_serialized_and_transaction_rollback_clears_usage(gallery_env):
    client, engine, sessions, tokens, own, _, admin, _, media = gallery_env
    headers = authorize(client, sessions, tokens, admin, "ADMIN")
    created = client.post(ROOT, json={"institution_id": str(own), "title": "Concorrente", "description": None}, headers=headers)
    gallery_id = created.json()["id"]

    def append(media_id):
        with Session(engine) as db:
            gallery = locked_gallery(db, UUID(gallery_id))
            assert gallery is not None
            item = add_item(db, gallery, media_id=media_id, alt_text="Imagem", caption=None)
            db.commit()
            return item.id

    with ThreadPoolExecutor(max_workers=2) as pool:
        ids = list(pool.map(append, [media["first"], media["second"]]))
    with Session(engine) as db:
        items = list(db.scalars(select(GalleryItemRow).where(GalleryItemRow.gallery_id == UUID(gallery_id)).order_by(GalleryItemRow.position)))
        assert [item.position for item in items] == [0, 1]
        assert {item.id for item in items} == set(ids)
    with pytest.raises(RuntimeError, match="forced rollback"):
        with Session(engine) as db:
            gallery = locked_gallery(db, UUID(gallery_id))
            add_item(db, gallery, media_id=media["first"], alt_text="Não persistir", caption=None)
            raise RuntimeError("forced rollback")
    with engine.connect() as db:
        assert db.scalar(text("SELECT count(*) FROM gallery_items WHERE gallery_id = :id"), {"id": gallery_id}) == 2
        assert db.scalar(text("SELECT count(*) FROM media_usages WHERE entity_type = 'GALLERY_ITEM' AND entity_id IN (:one, :two)"), {"one": ids[0], "two": ids[1]}) == 2
