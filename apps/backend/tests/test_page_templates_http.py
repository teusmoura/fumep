"""Essential PageTemplate contract, security and persistence tests."""

import os
from datetime import datetime, timezone
from uuid import UUID, uuid4

import fakeredis
import httpx
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from types import SimpleNamespace

from app.auth_http import AuthContext, auth_context
from app.auth_repository import PostgresUserRepository
from app.csrf import CsrfService
from app.database import database_engine
from app.login_rate_limit import LoginRateLimiter
from app.main import app
from app.public_pages_http import migration_public_engine
from app.page_templates_http import _engine
from app.sessions import COOKIE_NAME, RedisSessionStore
from app.template_blocks import BLOCK_DATA_V1, BlockSnapshot, validate_snapshot

ORIGIN = "http://127.0.0.1:8002"
ROOT = "/api/v1/admin/page-templates"
PAGES = "/api/v1/admin/pages"


def block(kind, position, data, *, anchor=None):
    value = {
        "id": str(uuid4()), "type": kind, "position": position, "isVisible": True,
        "schemaVersion": 1, "background": "DEFAULT", "data": data,
    }
    if anchor is not None:
        value["anchor"] = anchor
    return value


@pytest.fixture
def template_env():
    url = os.getenv("FUMEP_TEST_DATABASE_URL")
    if not url:
        pytest.skip("FUMEP_TEST_DATABASE_URL required for PageTemplate integration")
    if not url.endswith("/portal_fumep_mig58_test"):
        pytest.fail("PageTemplate integration requires dedicated test database")
    engine = database_engine(url)
    own, foreign, admin, editor = [uuid4() for _ in range(4)]
    category, foreign_category, gallery, foreign_gallery = [uuid4() for _ in range(4)]
    media = {name: uuid4() for name in ("image", "document", "pending", "deleting")}
    with engine.begin() as db:
        for id_ in (own, foreign):
            db.execute(text("INSERT INTO institutions (id, name, slug) VALUES (:id, 'Template Test', :slug)"), {"id": id_, "slug": f"template-test-{id_}"})
        for id_, role in ((admin, "ADMIN"), (editor, "EDITOR")):
            db.execute(
                text("INSERT INTO users (id, name, email, password_hash, role) "
                     "VALUES (:id, 'Template Test', :email, 'not-a-login-hash', :role)"),
                {"id": id_, "email": f"template-test-{id_}@example.invalid", "role": role},
            )
        db.execute(text("INSERT INTO user_institutions (user_id, institution_id) VALUES (:user_id, :institution_id)"), {"user_id": editor, "institution_id": own})
        for id_, institution_id in ((category, own), (foreign_category, foreign)):
            db.execute(
                text("INSERT INTO categories (id, institution_id, name, slug, created_by) "
                     "VALUES (:id, :institution_id, 'News', :slug, :admin)"),
                {"id": id_, "institution_id": institution_id, "slug": f"news-{id_}", "admin": admin},
            )
        for id_, institution_id in ((gallery, own), (foreign_gallery, foreign)):
            db.execute(
                text("INSERT INTO galleries (id, institution_id, title, created_by) "
                     "VALUES (:id, :institution_id, 'Gallery', :admin)"),
                {"id": id_, "institution_id": institution_id, "admin": admin},
            )
        for name, id_ in media.items():
            deleting = name == "deleting"
            db.execute(
                text("INSERT INTO media (id, type, original_filename, stored_filename, mime_type, size_bytes, "
                     "storage_key, checksum_sha256, processing_status, deletion_status, deletion_requested_at) "
                     "VALUES (:id, :type, :filename, :filename, :mime, 1, :key, :checksum, :processing, :deletion, :requested_at)"),
                {"id": id_, "type": "DOCUMENT" if name == "document" else "IMAGE",
                 "filename": f"{name}.jpg", "mime": "application/pdf" if name == "document" else "image/jpeg",
                 "key": f"template-test/{id_}", "checksum": id_.hex * 2,
                 "processing": "PENDING" if name == "pending" else "READY",
                 "deletion": "REQUESTED" if deleting else "NONE",
                 "requested_at": datetime.now(timezone.utc) if deleting else None},
            )
    redis = fakeredis.FakeRedis()
    sessions = RedisSessionStore(redis, key_prefix=f"migration:template-test:{uuid4()}:")
    tokens = []
    context = AuthContext(
        users=PostgresUserRepository(engine), sessions=sessions,
        csrf=CsrfService(sessions, allowed_origin=ORIGIN),
        limiter=LoginRateLimiter(redis, secret=b"template-test-secret-longer-than-thirty-two"),
        production=False,
    )
    app.dependency_overrides[auth_context] = lambda: context
    app.dependency_overrides[migration_public_engine] = lambda: engine
    try:
        with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50003)) as client:
            yield client, engine, sessions, tokens, own, foreign, admin, editor, category, foreign_category, gallery, foreign_gallery, media
    finally:
        app.dependency_overrides.clear()
        for token in tokens:
            sessions.invalidate(token)
        with engine.begin() as db:
            db.execute(text("DELETE FROM audit_logs WHERE action = 'PAGE_PUBLISHED' AND entity_id IN "
                            "(SELECT id FROM pages WHERE created_by = :admin)"), {"admin": admin})
            db.execute(text("DELETE FROM media_usages WHERE entity_type = 'CONTENT_BLOCK' AND entity_id IN "
                            "(SELECT id FROM content_blocks WHERE owner_type = 'PAGE' AND owner_id IN "
                            "(SELECT id FROM pages WHERE created_by = :admin))"), {"admin": admin})
            db.execute(text("DELETE FROM content_blocks WHERE owner_type = 'PAGE' AND owner_id IN "
                            "(SELECT id FROM pages WHERE created_by = :admin)"), {"admin": admin})
            db.execute(text("DELETE FROM pages WHERE created_by = :admin"), {"admin": admin})
            db.execute(text("DELETE FROM media_usages WHERE entity_type = 'PAGE_TEMPLATE' AND entity_id IN "
                            "(SELECT id FROM page_templates WHERE created_by = :admin)"), {"admin": admin})
            db.execute(text("DELETE FROM page_templates WHERE created_by = :admin"), {"admin": admin})
            db.execute(text("DELETE FROM galleries WHERE id IN (:one, :two)"), {"one": gallery, "two": foreign_gallery})
            db.execute(text("DELETE FROM categories WHERE id IN (:one, :two)"), {"one": category, "two": foreign_category})
            for id_ in media.values():
                db.execute(text("DELETE FROM media WHERE id = :id"), {"id": id_})
            db.execute(text("DELETE FROM user_institutions WHERE user_id = :id"), {"id": editor})
            db.execute(text("DELETE FROM users WHERE id IN (:admin, :editor)"), {"admin": admin, "editor": editor})
            db.execute(text("DELETE FROM institutions WHERE id IN (:own, :foreign)"), {"own": own, "foreign": foreign})
        engine.dispose()


def authorize(client, sessions, tokens, user_id, role, institutions=()):
    token = sessions.create(user_id=user_id, role=role, institution_ids=institutions)
    tokens.append(token)
    client.cookies.set(COOKIE_NAME, token)
    return {"Origin": ORIGIN, "X-CSRF-Token": sessions.read_and_refresh(token).csrf_token}


def test_all_23_block_types_have_versioned_strict_contract():
    image = str(uuid4())
    samples = {
        "TEXT": {"title": "Title", "body": "Body"},
        "HERO": {"title": "Hero", "description": "", "imageId": image, "imageAlt": "Alt", "decorative": False, "buttonLabel": "", "buttonUrl": ""},
        "IMAGE": {"imageId": image, "alt": "Alt", "caption": "", "decorative": False, "link": ""},
        "IMAGE_TEXT": {"title": "Title", "text": "Text", "imageId": image, "imageAlt": "Alt", "imagePosition": "IMAGE_LEFT", "buttonLabel": "", "buttonUrl": ""},
        "CARDS": {"title": "", "items": [{"imageId": image, "alt": "Alt", "title": "Title", "description": "", "url": ""}]},
        "QUICK_LINKS": {"title": "", "items": [{"label": "Link", "url": "/etmsl", "icon": "ARROW"}]},
        "CTA": {"title": "Title", "text": "", "buttonLabel": "Go", "buttonUrl": "/etmsl"},
        "FAQ": {"title": "", "items": [{"question": "Question", "answer": "Answer"}]},
        "TABS": {"tabs": [{"label": "Tab", "content": "Content"}]},
        "TABLE": {"caption": "", "headers": ["A"], "rows": [["B"]]},
        "TIMELINE": {"title": "", "items": [{"date": "", "title": "Event", "description": "Description"}]},
        "STATISTICS": {"items": [{"value": "1", "label": "Count", "description": ""}]},
        "CAROUSEL": {"items": [{"imageId": image, "alt": "Alt", "caption": "", "url": ""}]},
        "MAP": {"title": "", "latitude": -22.5, "longitude": -47.4, "address": "Here", "zoom": 10},
        "VIDEO": {"url": "https://youtu.be/aqz-KE-bpKQ", "title": "Video", "description": ""},
        "DOCUMENT": {"mediaId": str(uuid4()), "title": "", "description": "", "buttonLabel": ""},
        "NEWS_FEED": {"title": "", "institutionIds": [], "categoryIds": [], "limit": 3},
        "EVENT_FEED": {"title": "", "institutionIds": [], "categoryIds": [], "limit": 3},
        "COURSE_FEED": {"title": "", "institutionIds": [], "limit": 3},
        "CONTEST_FEED": {"title": "", "institutionIds": [], "limit": 3, "status": "ALL"},
        "SELECTION_PROCESS_FEED": {"title": "", "institutionIds": [], "limit": 3, "status": "ALL"},
        "GALLERY_FEED": {"galleryId": str(uuid4()), "title": "", "limit": 3},
        "SPACER": {"size": "MEDIUM"},
    }
    assert set(samples) == set(BLOCK_DATA_V1) and len(samples) == 23
    blocks = [BlockSnapshot.model_validate(block(kind, i, data)) for i, (kind, data) in enumerate(samples.items())]
    validate_snapshot(blocks)
    for kind, data in samples.items():
        with pytest.raises(ValueError):
            BlockSnapshot.model_validate(block(kind, 0, {**data, "unexpected": True}))
    with pytest.raises(ValueError):
        BlockSnapshot.model_validate({**block("TEXT", 0, samples["TEXT"]), "schemaVersion": 2})
    with pytest.raises(ValueError):
        BlockSnapshot.model_validate(block("TEXT", 0, {**samples["TEXT"], "unexpected": 1}))
    with pytest.raises(ValueError):
        BlockSnapshot.model_validate(block("VIDEO", 0, {**samples["VIDEO"], "url": "https://evil.example/watch?v=aqz-KE-bpKQ"}))


def test_admin_crud_csrf_and_independent_page_copy(template_env):
    client, engine, sessions, tokens, own, _, admin, editor, category, _, gallery, _, media = template_env
    assert client.get(ROOT).status_code == 401
    admin_headers = authorize(client, sessions, tokens, admin, "ADMIN")
    payload = {
        "institution_id": str(own), "name": "  Modelo de teste  ", "description": None,
        "blocks_snapshot": [
            block("TEXT", 0, {"title": "Olá", "body": "Texto"}, anchor="inicio"),
            block("IMAGE", 1, {"imageId": str(media["image"]), "alt": "Imagem", "caption": "", "decorative": False, "link": ""}),
            block("NEWS_FEED", 2, {"title": "", "institutionIds": [str(own)], "categoryIds": [str(category)], "limit": 3}),
            block("GALLERY_FEED", 3, {"galleryId": str(gallery), "title": "", "limit": 3}),
            block("DOCUMENT", 4, {"mediaId": str(media["document"]), "title": "PDF", "description": "", "buttonLabel": "Open"}),
        ],
    }
    assert client.post(ROOT, json=payload, headers={"Origin": ORIGIN}).status_code == 403
    created = client.post(ROOT, json=payload, headers=admin_headers)
    assert created.status_code == 201, created.text
    template = created.json()
    assert template["name"] == "Modelo de teste" and template["is_active"] is True
    assert client.get(f"{ROOT}/{template['id']}").status_code == 200
    assert any(item["id"] == template["id"] for item in client.get(ROOT).json())
    with engine.connect() as db:
        assert db.scalar(text("SELECT count(*) FROM media_usages WHERE entity_type = 'PAGE_TEMPLATE' AND entity_id = :id"), {"id": template["id"]}) == 2
    with pytest.raises(IntegrityError):
        with engine.begin() as db:
            db.execute(text("DELETE FROM media WHERE id = :id"), {"id": media["image"]})
    editor_headers = authorize(client, sessions, tokens, editor, "EDITOR", [own])
    assert client.get(ROOT).status_code == 403
    assert client.post(ROOT, json=payload, headers=editor_headers).status_code == 403
    assert client.post(f"{ROOT}/{template['id']}/apply", json={"institution_id": str(own), "title": "Fail", "slug": "fail"}, headers=editor_headers).status_code == 403
    admin_headers = authorize(client, sessions, tokens, admin, "ADMIN")
    apply_payload = {"institution_id": str(own), "title": "Página criada", "slug": f"created-{uuid4()}"}
    applied = client.post(f"{ROOT}/{template['id']}/apply", json=apply_payload, headers=admin_headers)
    assert applied.status_code == 201, applied.text
    page = applied.json()
    assert page["status"] == "DRAFT" and len(page["blocks"]) == 5
    assert {b["id"] for b in page["blocks"]}.isdisjoint({b["id"] for b in template["blocks_snapshot"]})
    with engine.connect() as db:
        assert db.scalar(text("SELECT status FROM pages WHERE id = :id"), {"id": page["id"]}) == "DRAFT"
        assert db.scalar(text("SELECT count(*) FROM content_blocks WHERE owner_type = 'PAGE' AND owner_id = :id"), {"id": page["id"]}) == 5
        assert db.scalar(text("SELECT count(*) FROM media_usages WHERE entity_type = 'CONTENT_BLOCK' AND entity_id IN "
                              "(SELECT id FROM content_blocks WHERE owner_id = :id)"), {"id": page["id"]}) == 2
    changed = client.put(f"{ROOT}/{template['id']}", json={"name": "Novo nome", "description": "Atualizado"}, headers=admin_headers)
    assert changed.status_code == 200 and changed.json()["description"] == "Atualizado"
    assert client.put(f"{ROOT}/{template['id']}", json={"name": "No", "blocks_snapshot": []}, headers=admin_headers).status_code == 422
    assert client.patch(f"{ROOT}/{template['id']}/active", json={"is_active": False}, headers=admin_headers).status_code == 200
    assert client.post(f"{ROOT}/{template['id']}/apply", json=apply_payload, headers=admin_headers).status_code == 409
    with engine.connect() as db:
        stored = db.execute(text("SELECT id, data FROM content_blocks WHERE owner_id = :id AND position = 0"), {"id": page["id"]}).first()
        assert str(stored.id) == page["blocks"][0]["id"] and stored.data["title"] == "Olá"
    with engine.begin() as db:
        db.execute(
            text("UPDATE page_templates SET blocks_snapshot = "
                 "jsonb_set(blocks_snapshot, '{0,data,title}', to_jsonb(CAST(:title AS text))) "
                 "WHERE id = :id"),
            {"id": template["id"], "title": "Título alterado"},
        )
    with engine.connect() as db:
        assert db.scalar(text("SELECT data->>'title' FROM content_blocks WHERE owner_id = :id AND position = 0"), {"id": page["id"]}) == "Olá"


def test_draft_save_is_authorized_atomic_and_readable(template_env):
    client, engine, sessions, tokens, own, foreign, admin, editor, _, _, _, _, media = template_env
    admin_headers = authorize(client, sessions, tokens, admin, "ADMIN")
    created = client.post(ROOT, json={
        "institution_id": None, "name": "Draft editor", "blocks_snapshot": [
            block("TEXT", 0, {"title": "Original", "body": "Body"}),
        ],
    }, headers=admin_headers)
    assert created.status_code == 201, created.text
    applied = client.post(f"{ROOT}/{created.json()['id']}/apply", json={
        "institution_id": str(own), "title": "Page", "slug": f"page-{uuid4()}",
    }, headers=admin_headers)
    assert applied.status_code == 201, applied.text
    page_id = applied.json()["id"]
    assert client.get(f"{PAGES}/{page_id}").json()["blocks"][0]["data"]["title"] == "Original"
    foreign_page = client.post(f"{ROOT}/{created.json()['id']}/apply", json={
        "institution_id": str(foreign), "title": "Foreign page", "slug": f"foreign-{uuid4()}",
    }, headers=admin_headers)
    assert foreign_page.status_code == 201, foreign_page.text

    editor_headers = authorize(client, sessions, tokens, editor, "EDITOR", [own])
    assert client.get(f"{PAGES}/{foreign_page.json()['id']}").status_code == 403
    assert client.put(f"{PAGES}/{foreign_page.json()['id']}", json={
        "title": "Forbidden", "slug": "forbidden", "blocks": foreign_page.json()["blocks"],
    }, headers=editor_headers).status_code == 403

    admin_headers = authorize(client, sessions, tokens, admin, "ADMIN")
    changed = [
        {**applied.json()["blocks"][0], "data": {"title": "Edited", "body": "Saved"}},
        block("IMAGE", 1, {"imageId": str(media["image"]), "alt": "Accessible", "caption": "", "decorative": False, "link": ""}),
    ]
    payload = {"title": "Edited Page", "slug": f"edited-{uuid4()}", "blocks": changed}
    assert client.put(f"{PAGES}/{page_id}", json=payload, headers={"Origin": ORIGIN}).status_code == 403
    saved = client.put(f"{PAGES}/{page_id}", json=payload, headers=admin_headers)
    assert saved.status_code == 200, saved.text
    assert saved.json()["title"] == "Edited Page"
    assert [item["data"].get("title") for item in saved.json()["blocks"]] == ["Edited", None]
    assert client.get(f"{PAGES}/{page_id}").json()["blocks"] == saved.json()["blocks"]
    with engine.connect() as db:
        assert db.scalar(text("SELECT count(*) FROM media_usages WHERE entity_type = 'CONTENT_BLOCK' "
                              "AND entity_id IN (SELECT id FROM content_blocks WHERE owner_id = :id)"),
                         {"id": page_id}) == 1
    invalid = {**payload, "blocks": [
        block("IMAGE", 0, {"imageId": str(media["pending"]), "alt": "Alt", "caption": "", "decorative": False, "link": ""}),
    ]}
    assert client.put(f"{PAGES}/{page_id}", json=invalid, headers=admin_headers).status_code == 409
    assert client.get(f"{PAGES}/{page_id}").json()["blocks"] == saved.json()["blocks"]
    collision = {**payload, "blocks": foreign_page.json()["blocks"]}
    assert client.put(f"{PAGES}/{page_id}", json=collision, headers=admin_headers).status_code == 409
    assert client.get(f"{PAGES}/{page_id}").json()["blocks"] == saved.json()["blocks"]
    with engine.begin() as db:
        db.execute(text("UPDATE pages SET status = 'PUBLISHED' WHERE id = :id"), {"id": page_id})
    assert client.get(f"{PAGES}/{page_id}").status_code == 409
    assert client.put(f"{PAGES}/{page_id}", json=payload, headers=admin_headers).status_code == 409
    with engine.begin() as db:
        db.execute(text("UPDATE pages SET status = 'DRAFT' WHERE id = :id"), {"id": page_id})
    empty = client.put(f"{PAGES}/{page_id}", json={**payload, "blocks": []}, headers=admin_headers)
    assert empty.status_code == 200 and empty.json()["blocks"] == []
    with engine.connect() as db:
        assert db.scalar(text("SELECT count(*) FROM media_usages WHERE entity_type = 'CONTENT_BLOCK' "
                              "AND entity_id IN (SELECT id FROM content_blocks WHERE owner_id = :id)"),
                         {"id": page_id}) == 0


def test_experimental_publish_uses_immutable_snapshot_and_no_public_cache(template_env):
    client, engine, sessions, tokens, own, _, admin, _, _, _, _, _, _ = template_env
    headers = authorize(client, sessions, tokens, admin, "ADMIN")
    institution_choices = client.get("/api/v1/admin/page-institutions")
    assert institution_choices.status_code == 200
    assert any(item["id"] == str(own) for item in institution_choices.json())
    created = client.post(ROOT, json={
        "institution_id": str(own), "name": "Public text", "blocks_snapshot": [
            block("TEXT", 0, {"title": "Publicado", "body": "Conteúdo real"}),
        ],
    }, headers=headers)
    assert created.status_code == 201, created.text
    slug = f"published-{uuid4()}"
    applied = client.post(f"{ROOT}/{created.json()['id']}/apply", json={
        "institution_id": str(own), "title": "Página publicada", "slug": slug,
    }, headers=headers)
    assert applied.status_code == 201, applied.text
    page_id = applied.json()["id"]
    public_path = f"/api/v1/public/institutions/template-test-{own}/pages/{slug}"
    assert client.get(public_path).status_code == 404
    assert client.post(f"{PAGES}/{page_id}/publish", headers={"Origin": ORIGIN}).status_code == 403
    published = client.post(f"{PAGES}/{page_id}/publish", headers=headers)
    assert published.status_code == 200, published.text
    assert published.json()["status"] == "PUBLISHED" and published.json()["version_number"] == 1
    assert published.headers["cache-control"] == "no-store"
    assert client.post(f"{PAGES}/{page_id}/publish", headers=headers).status_code == 409
    public = client.get(public_path)
    assert public.status_code == 200, public.text
    assert public.headers["cache-control"] == "no-store"
    assert public.headers["x-fumep-data-source"] == "migration-test"
    assert public.json()["blocks"][0]["data"]["body"] == "Conteúdo real"
    if portal_url := os.getenv("FUMEP_PORTAL_TEST_URL"):
        rendered = httpx.get(f"{portal_url}/paginas/template-test-{own}/{slug}", timeout=15)
        assert rendered.status_code == 200, rendered.text[:500]
        assert rendered.headers["cache-control"] == "no-store"
        assert "Conteúdo real" in rendered.text
    with engine.begin() as db:
        assert db.scalar(text("SELECT count(*) FROM page_versions WHERE page_id = :id"), {"id": page_id}) == 1
        assert db.scalar(text("SELECT count(*) FROM audit_logs WHERE action = 'PAGE_PUBLISHED' AND entity_id = :id"), {"id": page_id}) == 1
        db.execute(text("UPDATE content_blocks SET data = '{\"title\": \"Alterado\", \"body\": \"Outro\"}'::jsonb "
                        "WHERE owner_type = 'PAGE' AND owner_id = :id"), {"id": page_id})
    assert client.get(public_path).json()["blocks"][0]["data"]["body"] == "Conteúdo real"


def test_experimental_publish_rejects_unrenderable_blocks(template_env):
    client, engine, sessions, tokens, own, _, admin, editor, _, _, _, _, _ = template_env
    headers = authorize(client, sessions, tokens, admin, "ADMIN")
    created = client.post(ROOT, json={
        "institution_id": str(own), "name": "Other blocks", "blocks_snapshot": [
            block("SPACER", 0, {"size": "MEDIUM"}),
        ],
    }, headers=headers)
    assert created.status_code == 201, created.text
    applied = client.post(f"{ROOT}/{created.json()['id']}/apply", json={
        "institution_id": str(own), "title": "Unsupported", "slug": f"unsupported-{uuid4()}",
    }, headers=headers)
    assert applied.status_code == 201, applied.text
    page_id = applied.json()["id"]
    denied = client.post(f"{PAGES}/{page_id}/publish", headers=headers)
    assert denied.status_code == 409 and "TEXT" in denied.json()["detail"]
    with engine.connect() as db:
        assert db.scalar(text("SELECT status FROM pages WHERE id = :id"), {"id": page_id}) == "DRAFT"
        assert db.scalar(text("SELECT count(*) FROM page_versions WHERE page_id = :id"), {"id": page_id}) == 0
    editor_headers = authorize(client, sessions, tokens, editor, "EDITOR", [own])
    assert client.get("/api/v1/admin/page-institutions").status_code == 403
    assert client.post(f"{PAGES}/{page_id}/publish", headers=editor_headers).status_code == 409


def test_references_and_snapshot_fail_closed(template_env):
    client, engine, sessions, tokens, own, foreign, admin, _, category, foreign_category, gallery, foreign_gallery, media = template_env
    headers = authorize(client, sessions, tokens, admin, "ADMIN")
    base = {"institution_id": str(own), "name": "Invalid", "blocks_snapshot": []}
    candidates = [
        block("IMAGE", 0, {"imageId": str(media["pending"]), "alt": "Alt", "caption": "", "decorative": False, "link": ""}),
        block("IMAGE", 0, {"imageId": str(media["deleting"]), "alt": "Alt", "caption": "", "decorative": False, "link": ""}),
        block("DOCUMENT", 0, {"mediaId": str(media["image"]), "title": "PDF", "description": "", "buttonLabel": ""}),
        block("NEWS_FEED", 0, {"title": "", "institutionIds": [str(uuid4())], "categoryIds": [str(category)], "limit": 3}),
        block("NEWS_FEED", 0, {"title": "", "institutionIds": [str(own)], "categoryIds": [str(foreign_category)], "limit": 3}),
        block("GALLERY_FEED", 0, {"galleryId": str(foreign_gallery), "title": "", "limit": 3}),
    ]
    for item in candidates:
        result = client.post(ROOT, json={**base, "blocks_snapshot": [item]}, headers=headers)
        assert result.status_code == 409, result.text
    duplicate = [block("TEXT", 0, {"title": "A", "body": "B"}, anchor="same"), block("TEXT", 1, {"title": "A", "body": "B"}, anchor="same")]
    assert client.post(ROOT, json={**base, "blocks_snapshot": duplicate}, headers=headers).status_code == 422
    good = client.post(ROOT, json={**base, "blocks_snapshot": [block("GALLERY_FEED", 0, {"galleryId": str(gallery), "title": "", "limit": 3})]}, headers=headers)
    assert good.status_code == 201, good.text
    template_id = good.json()["id"]
    wrong_scope = client.post(f"{ROOT}/{template_id}/apply", json={"institution_id": str(foreign), "title": "Wrong", "slug": f"wrong-{uuid4()}"}, headers=headers)
    assert wrong_scope.status_code == 409
    with engine.connect() as db:
        assert db.scalar(text("SELECT count(*) FROM pages WHERE created_by = :admin"), {"admin": admin}) == 0


def test_openapi_exposes_template_contract_and_rejects_unknown_block(template_env):
    client, engine, sessions, tokens, own, _, admin, _, _, _, _, _, _ = template_env
    paths = client.get("/openapi.json").json()["paths"]
    assert f"{ROOT}/{{template_id}}/apply" in paths
    assert "post" in paths[ROOT] and "put" in paths[f"{ROOT}/{{template_id}}"]
    headers = authorize(client, sessions, tokens, admin, "ADMIN")
    assert client.post(ROOT, json={"institution_id": str(own), "name": "Bad", "blocks_snapshot": [block("UNKNOWN", 0, {})]}, headers=headers).status_code == 422


def test_global_template_applies_to_two_institutions_and_requires_test_database(template_env):
    client, engine, sessions, tokens, own, foreign, admin, _, _, _, _, _, _ = template_env
    headers = authorize(client, sessions, tokens, admin, "ADMIN")
    created = client.post(ROOT, json={
        "institution_id": None, "name": "Global", "blocks_snapshot": [
            block("TEXT", 0, {"title": "Global", "body": "Shared"}),
        ],
    }, headers=headers)
    assert created.status_code == 201, created.text
    template_id = created.json()["id"]
    first = client.post(f"{ROOT}/{template_id}/apply", json={
        "institution_id": str(own), "title": "One", "slug": f"one-{uuid4()}",
    }, headers=headers)
    second = client.post(f"{ROOT}/{template_id}/apply", json={
        "institution_id": str(foreign), "title": "Two", "slug": f"two-{uuid4()}",
    }, headers=headers)
    assert first.status_code == 201 and second.status_code == 201
    assert first.json()["blocks"][0]["id"] != second.json()["blocks"][0]["id"]
    fake_principal = SimpleNamespace(context=SimpleNamespace(users=SimpleNamespace(
        engine=SimpleNamespace(url=SimpleNamespace(database="portal_fumep", host="127.0.0.1")))))
    with pytest.raises(HTTPException) as denied:
        _engine(fake_principal)
    assert denied.value.status_code == 503
    fake_principal.context.users.engine.url.database = "portal_fumep_mig58_test"
    fake_principal.context.users.engine.url.host = "database.example.invalid"
    with pytest.raises(HTTPException) as denied_remote:
        _engine(fake_principal)
    assert denied_remote.value.status_code == 503
