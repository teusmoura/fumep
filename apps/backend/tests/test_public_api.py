import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_is_minimal_and_does_not_probe_dependencies() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("slug", ["fumep", "etmsl", "cramam"])
def test_public_theme_has_only_allowlisted_fields(slug: str) -> None:
    response = client.get(f"/api/v1/public/institutions/{slug}/theme")
    assert response.status_code == 200
    assert response.headers["x-fumep-data-source"] == "fixture"
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["slug"] == slug
    assert set(response.json()) == {
        "id",
        "slug",
        "primary",
        "primaryForeground",
        "accent",
        "accentForeground",
        "appearanceDefault",
    }


def test_unknown_institution_is_not_found() -> None:
    response = client.get("/api/v1/public/institutions/etmsl-other/theme")
    assert response.status_code == 404
    assert response.json() == {"detail": "Institution not found"}


def test_openapi_exposes_public_and_authentication_contracts() -> None:
    document = client.get("/openapi.json").json()
    paths = document["paths"]
    assert set(paths) == {
        "/api/v1/health",
        "/api/v1/public/institutions/{slug}/theme",
        "/api/v1/auth/login",
        "/api/v1/auth/session",
        "/api/v1/auth/logout",
        "/api/v1/admin/session",
        "/api/v1/admin/categories",
        "/api/v1/admin/categories/{category_id}",
        "/api/v1/admin/articles",
        "/api/v1/admin/articles/{article_id}",
        "/api/v1/admin/articles/{article_id}/publish",
        "/api/v1/admin/galleries",
        "/api/v1/admin/galleries/{gallery_id}",
        "/api/v1/admin/galleries/{gallery_id}/items",
        "/api/v1/admin/galleries/{gallery_id}/items/{item_id}",
        "/api/v1/admin/galleries/{gallery_id}/order",
        "/api/v1/admin/galleries/{gallery_id}/feed",
        "/api/v1/admin/page-templates",
        "/api/v1/admin/page-templates/{template_id}",
        "/api/v1/admin/page-templates/{template_id}/active",
        "/api/v1/admin/page-templates/{template_id}/apply",
        "/api/v1/admin/pages/{page_id}",
        "/api/v1/admin/pages/{page_id}/publish",
        "/api/v1/admin/page-institutions",
        "/api/v1/admin/media",
        "/api/v1/admin/media/categories",
        "/api/v1/admin/media/institutions",
        "/api/v1/admin/media/{media_id}/variants",
        "/api/v1/admin/media/{media_id}/content",
        "/api/v1/admin/media/{media_id}",
        "/api/v1/admin/media/{media_id}/deletion/retry",
        "/api/v1/public/institutions/{institution_slug}/pages/{page_slug}",
        "/api/v1/public/institutions/{institution_slug}/pages/{page_slug}/gallery-media/{media_id}",
        "/api/v1/public/institutions/{institution_slug}/articles",
        "/api/v1/public/institutions/{institution_slug}/articles/{article_slug}",
        "/api/v1/public/institutions/{institution_slug}/articles/{article_slug}/cover",
    }
    schema = document["components"]["schemas"]["PublicInstitutionTheme"]
    assert "password" not in str(schema).lower()
    assert "storage" not in str(schema).lower()
    assert schema["additionalProperties"] is False
