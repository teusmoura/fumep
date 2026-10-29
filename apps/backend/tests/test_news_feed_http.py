"""Live feed integration against the dedicated migration database."""

from uuid import uuid4

from sqlalchemy import text

from test_page_templates_http import authorize, block, template_env


def test_news_feed_is_scoped_filtered_and_live(template_env):
    client, engine, sessions, tokens, own, foreign, admin, editor, category, foreign_category, _, _, media = template_env
    headers = authorize(client, sessions, tokens, admin, "ADMIN")
    template = client.post("/api/v1/admin/page-templates", json={
        "institution_id": str(own), "name": "Feed test", "blocks_snapshot": [
            block("TEXT", 0, {"title": "Abertura", "body": "Texto"}),
        ],
    }, headers=headers)
    assert template.status_code == 201, template.text
    slug = f"news-feed-{uuid4().hex}"
    page = client.post(f"/api/v1/admin/page-templates/{template.json()['id']}/apply", json={
        "institution_id": str(own), "title": "Página de notícias", "slug": slug,
    }, headers=headers)
    assert page.status_code == 201, page.text
    page_id = page.json()["id"]
    feed = block("NEWS_FEED", 1, {
        "title": "Últimas notícias", "institutionIds": [str(own)],
        "categoryIds": [str(category)], "limit": 3, "order": "DEFAULT",
    })
    payload = {"title": "Página de notícias", "slug": slug, "blocks": [page.json()["blocks"][0], feed]}
    editor_headers = authorize(client, sessions, tokens, editor, "EDITOR", [own])
    foreign_feed = {**feed, "data": {**feed["data"], "institutionIds": [str(foreign)],
                                        "categoryIds": [str(foreign_category)]}}
    denied = client.put(f"/api/v1/admin/pages/{page_id}", json={
        **payload, "blocks": [payload["blocks"][0], foreign_feed],
    }, headers=editor_headers)
    assert denied.status_code == 403, denied.text
    headers = authorize(client, sessions, tokens, admin, "ADMIN")
    wrong_category = {**feed, "data": {**feed["data"], "categoryIds": [str(foreign_category)]}}
    assert client.put(f"/api/v1/admin/pages/{page_id}", json={
        **payload, "blocks": [payload["blocks"][0], wrong_category],
    }, headers=headers).status_code == 409
    saved = client.put(f"/api/v1/admin/pages/{page_id}", json=payload, headers=headers)
    assert saved.status_code == 200, saved.text
    assert client.post(f"/api/v1/admin/pages/{page_id}/publish", headers=headers).status_code == 200
    path = f"/api/v1/public/institutions/template-test-{own}/pages/{slug}"
    empty = client.get(path)
    assert empty.status_code == 200, empty.text
    assert empty.json()["news_feeds"][feed["id"]] == []
    with engine.connect() as db:
        snapshot = db.scalar(text("SELECT snapshot FROM page_versions WHERE page_id = :id"), {"id": page_id})
        assert snapshot["blocks"][1]["data"]["categoryIds"] == [str(category)]
        assert "news_feeds" not in snapshot

    article_id = None
    try:
        article_slug = f"news-live-{uuid4().hex}"
        article = client.post("/api/v1/admin/articles", json={
            "title": "Notícia publicada", "slug": article_slug, "summary": "Resumo real",
            "institution_ids": [str(own)], "category_id": str(category),
            "cover_image_id": str(media["image"]), "cover_image_alt": "Foto de capa",
            "blocks": [block("TEXT", 0, {"title": "Corpo", "body": "Conteúdo"})],
        }, headers=headers)
        assert article.status_code == 201, article.text
        article_id = article.json()["id"]
        assert client.get(path).json()["news_feeds"][feed["id"]] == []
        assert client.post(f"/api/v1/admin/articles/{article_id}/publish", headers=headers).status_code == 200
        live = client.get(path)
        assert live.status_code == 200, live.text
        cards = live.json()["news_feeds"][feed["id"]]
        assert len(cards) == 1 and cards[0]["title"] == "Notícia publicada"
        assert cards[0]["institution_slug"] == f"template-test-{own}"
        assert cards[0]["summary"] == "Resumo real"
        assert "storage_key" not in live.text
        with engine.connect() as db:
            snapshot = db.scalar(text("SELECT snapshot FROM page_versions WHERE page_id = :id"), {"id": page_id})
            assert "Notícia publicada" not in str(snapshot)
    finally:
        if article_id:
            with engine.begin() as db:
                db.execute(text("DELETE FROM audit_logs WHERE entity_type = 'ARTICLE' AND entity_id = :id"), {"id": article_id})
                db.execute(text("DELETE FROM media_usages WHERE entity_type = 'ARTICLE' AND entity_id = :id"), {"id": article_id})
                db.execute(text("DELETE FROM content_blocks WHERE owner_type = 'ARTICLE' AND owner_id = :id"), {"id": article_id})
                db.execute(text("DELETE FROM articles WHERE id = :id"), {"id": article_id})
