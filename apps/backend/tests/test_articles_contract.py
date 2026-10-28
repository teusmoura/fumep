"""Focused contract and safety checks that do not need the migration database."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.articles_http import ArticleFields
from app.main import app


def payload():
    return {
        "title": "Notícia de teste", "slug": "noticia-de-teste",
        "institution_ids": [uuid4()], "category_id": uuid4(),
        "blocks": [{
            "id": str(uuid4()), "type": "TEXT", "position": 0,
            "isVisible": True, "schemaVersion": 1, "background": "DEFAULT",
            "backgroundMediaId": None, "anchor": None,
            "data": {"title": "Título", "body": "Texto seguro"},
        }],
    }


def test_draft_may_lack_cover_but_requires_scope_and_category():
    article = ArticleFields.model_validate(payload())
    assert article.cover_image_id is None
    for key, value in (("institution_ids", []), ("category_id", None)):
        invalid = payload()
        invalid[key] = value
        with pytest.raises(ValidationError):
            ArticleFields.model_validate(invalid)


def test_article_slice_rejects_feed_and_image_background():
    for type_, background in (("NEWS_FEED", "DEFAULT"), ("TEXT", "IMAGE")):
        invalid = payload()
        invalid["blocks"][0]["type"] = type_
        invalid["blocks"][0]["background"] = background
        if background == "IMAGE":
            invalid["blocks"][0]["backgroundMediaId"] = str(uuid4())
        with pytest.raises(ValidationError):
            ArticleFields.model_validate(invalid)


def test_article_routes_require_session_and_public_routes_are_open():
    paths = app.openapi()["paths"]
    assert "/api/v1/public/institutions/{institution_slug}/articles" in paths
    assert "/api/v1/public/institutions/{institution_slug}/articles/{article_slug}" in paths
    assert "/api/v1/admin/articles/{article_id}/publish" in paths
