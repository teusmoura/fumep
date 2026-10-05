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
    }
    schema = document["components"]["schemas"]["PublicInstitutionTheme"]
    assert "password" not in str(schema).lower()
    assert "storage" not in str(schema).lower()
    assert schema["additionalProperties"] is False
