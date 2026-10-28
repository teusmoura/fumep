"""Article lifecycle against the audited local migration database."""

from uuid import uuid4

from sqlalchemy import text

from test_page_templates_http import authorize, block, template_env

ROOT = "/api/v1/admin/articles"


def test_article_draft_publish_scope_media_and_snapshot(template_env):
    client, engine, sessions, tokens, own, foreign, admin, editor, category, _, _, _, media = template_env
    slug = f"news-test-{uuid4().hex}"
    body = block("TEXT", 0, {"title": "Comunicado", "body": "Conteúdo aprovado"})
    payload = {
        "title": "Notícia", "slug": slug, "summary": "Resumo",
        "institution_ids": [str(own)], "category_id": str(category),
        "cover_image_id": None, "cover_image_alt": None, "blocks": [body],
    }
    assert client.get(ROOT).status_code == 401
    headers = authorize(client, sessions, tokens, editor, "EDITOR", [own])
    article_id = None
    try:
        denied = client.post(ROOT, json={**payload, "institution_ids": [str(foreign)]}, headers=headers)
        assert denied.status_code == 403
        created = client.post(ROOT, json=payload, headers=headers)
        assert created.status_code == 201, created.text
        article_id = created.json()["id"]
        assert created.json()["status"] == "DRAFT"
        assert client.post(f"{ROOT}/{article_id}/publish", headers=headers).status_code == 409
        assert client.get(f"/api/v1/public/institutions/template-test-{own}/articles/{slug}").status_code == 404
        assert client.put(f"{ROOT}/{article_id}", json={**payload, "cover_image_id": str(media["pending"])}, headers=headers).status_code == 409
        assert client.put(f"{ROOT}/{article_id}", json={**payload, "cover_image_id": str(media["document"])}, headers=headers).status_code == 409
        assert client.put(f"{ROOT}/{article_id}", json={**payload, "institution_ids": [str(own), str(foreign)]}, headers=headers).status_code == 403
        ready = {**payload, "cover_image_id": str(media["image"]), "cover_image_alt": "Equipe FUMEP"}
        saved = client.put(f"{ROOT}/{article_id}", json=ready, headers=headers)
        assert saved.status_code == 200, saved.text
        assert client.put(f"{ROOT}/{article_id}", json=ready, headers={"Origin": "http://127.0.0.1:8002"}).status_code == 403
        with engine.connect() as db:
            assert db.scalar(text("SELECT count(*) FROM media_usages WHERE entity_type = 'ARTICLE' AND entity_id = :id"), {"id": article_id}) == 1
        published = client.post(f"{ROOT}/{article_id}/publish", headers=headers)
        assert published.status_code == 200, published.text
        assert published.json()["version_number"] == 1
        assert client.post(f"{ROOT}/{article_id}/publish", headers=headers).status_code == 409
        assert client.put(f"{ROOT}/{article_id}", json=ready, headers=headers).status_code == 409
        public = client.get(f"/api/v1/public/institutions/template-test-{own}/articles/{slug}")
        assert public.status_code == 200, public.text
        assert public.json()["title"] == "Notícia"
        assert public.json()["blocks"][0]["data"]["body"] == "Conteúdo aprovado"
        assert "storage_key" not in public.text
        assert client.get(f"/api/v1/public/institutions/template-test-{foreign}/articles/{slug}").status_code == 404
        listing = client.get(f"/api/v1/public/institutions/template-test-{own}/articles")
        assert listing.status_code == 200 and any(item["slug"] == slug for item in listing.json())
        with engine.connect() as db:
            version = db.scalar(text("SELECT snapshot FROM article_versions WHERE article_id = :id"), {"id": article_id})
            assert version["coverImageId"] == str(media["image"])
            assert version["blocks"][0]["data"]["body"] == "Conteúdo aprovado"
            assert db.scalar(text("SELECT count(*) FROM article_versions WHERE article_id = :id"), {"id": article_id}) == 1
    finally:
        if article_id:
            with engine.begin() as db:
                db.execute(text("DELETE FROM audit_logs WHERE entity_type = 'ARTICLE' AND entity_id = :id"), {"id": article_id})
                db.execute(text("DELETE FROM media_usages WHERE entity_type = 'ARTICLE' AND entity_id = :id"), {"id": article_id})
                db.execute(text("DELETE FROM content_blocks WHERE owner_type = 'ARTICLE' AND owner_id = :id"), {"id": article_id})
                db.execute(text("DELETE FROM articles WHERE id = :id"), {"id": article_id})
