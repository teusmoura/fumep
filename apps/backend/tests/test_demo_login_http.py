"""Password-free demo access is confined to the dedicated local migration DB."""

import os
from types import SimpleNamespace
from uuid import UUID

import fakeredis
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import make_url

from app.auth_http import AuthContext, auth_context
from app.auth_repository import PostgresUserRepository
from app.csrf import CsrfService
from app.database import database_engine
from app.login_rate_limit import LoginRateLimiter
from app.main import app
from app.sessions import RedisSessionStore

ORIGIN = "http://localhost:3002"


@pytest.fixture
def local_demo(monkeypatch):
    url = os.getenv("FUMEP_TEST_DATABASE_URL")
    if not url:
        pytest.skip("FUMEP_TEST_DATABASE_URL required for demo login integration")
    if not url.endswith("/portal_fumep_mig58_test"):
        pytest.fail("Demo login requires the dedicated migration test database")
    engine = database_engine(url)
    redis = fakeredis.FakeRedis()
    sessions = RedisSessionStore(redis)
    context = AuthContext(
        users=PostgresUserRepository(engine), sessions=sessions,
        csrf=CsrfService(sessions, allowed_origin=ORIGIN),
        limiter=LoginRateLimiter(redis, secret=b"demo-test-secret-longer-than-thirty-two"),
        production=False,
    )
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:6379/15")
    monkeypatch.delenv("FUMEP_LOCAL_DEMO_LOGIN", raising=False)
    app.dependency_overrides[auth_context] = lambda: context
    try:
        with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50000)) as client:
            yield client, context
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_demo_login_is_off_by_default_and_origin_guarded(local_demo, monkeypatch):
    client, _ = local_demo
    assert client.get("/api/v1/auth/demo-profiles").status_code == 404
    disabled = client.post(
        "/api/v1/auth/demo-login", json={"profile": "admin"}, headers={"Origin": ORIGIN},
    )
    assert disabled.status_code == 404
    assert "set-cookie" not in disabled.headers
    monkeypatch.setenv("FUMEP_LOCAL_DEMO_LOGIN", "1")
    rejected = client.post(
        "/api/v1/auth/demo-login", json={"profile": "admin"},
        headers={"Origin": "http://evil.example"},
    )
    assert rejected.status_code == 403
    assert "set-cookie" not in rejected.headers
    with TestClient(app, base_url=ORIGIN, client=("192.0.2.1", 50000)) as remote:
        assert remote.get("/api/v1/auth/demo-profiles").status_code == 404


def test_demo_gate_rejects_primary_database_and_remote_redis(local_demo, monkeypatch):
    client, context = local_demo
    monkeypatch.setenv("FUMEP_LOCAL_DEMO_LOGIN", "1")
    real_engine = context.users.engine
    context.users.engine = SimpleNamespace(
        url=make_url("postgresql+psycopg://localhost/portal_fumep")
    )
    try:
        assert client.get("/api/v1/auth/demo-profiles").status_code == 404
    finally:
        context.users.engine = real_engine
    monkeypatch.setenv("REDIS_URL", "redis://redis.example:6379/0")
    assert client.get("/api/v1/auth/demo-profiles").status_code == 404


def test_demo_profiles_create_real_scoped_sessions(local_demo, monkeypatch):
    client, context = local_demo
    monkeypatch.setenv("FUMEP_LOCAL_DEMO_LOGIN", "1")
    profiles = client.get("/api/v1/auth/demo-profiles")
    assert profiles.status_code == 200
    assert profiles.headers["cache-control"] == "no-store"
    assert [item["id"] for item in profiles.json()] == [
        "admin", "editor-fumep", "editor-etmsl", "editor-cramam",
    ]
    previous_token = None
    for profile in profiles.json():
        response = client.post(
            "/api/v1/auth/demo-login", json={"profile": profile["id"]},
            headers={"Origin": ORIGIN},
        )
        assert response.status_code == 200
        assert "httponly" in response.headers["set-cookie"].lower()
        assert response.headers["cache-control"] == "no-store"
        if previous_token is not None:
            assert context.sessions.read_and_refresh(previous_token) is None
        previous_token = client.cookies.get("fumep_session")
        session = client.get("/api/v1/auth/session").json()
        assert UUID(session["user_id"])
        if profile["id"] == "admin":
            assert session["role"] == "ADMIN"
            assert client.get("/api/v1/admin/session").status_code == 200
            assert len(client.get("/api/v1/admin/media/institutions").json()) >= 3
        else:
            assert session["role"] == "EDITOR"
            assert len(session["institution_ids"]) == 1
            assert client.get("/api/v1/admin/session").status_code == 403
            institutions = client.get("/api/v1/admin/media/institutions").json()
            assert len(institutions) == 1
            assert institutions[0]["id"] == session["institution_ids"][0]
