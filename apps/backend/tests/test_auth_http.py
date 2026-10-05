"""The HTTP adapter must preserve the isolated auth security contracts."""

from uuid import uuid4

import fakeredis
import pytest
from fastapi.testclient import TestClient

from app.auth_http import AuthContext, auth_context
from app.authorization import CurrentUserAccess
from app.csrf import CsrfService
from app.login import LoginUser
from app.login_rate_limit import LoginRateLimiter
from app.main import app
from app.passwords import NewPasswordInput, hash_new_password
from app.sessions import RedisSessionStore

ORIGIN = "http://localhost:8002"
PASSWORD = "senha de teste longa"


class Users:
    def __init__(self, *, role: str = "ADMIN") -> None:
        self.user = LoginUser(
            id=uuid4(), email="admin@example.com",
            password_hash=hash_new_password(NewPasswordInput(password=PASSWORD)),
            role=role, institution_ids=(uuid4(),) if role == "EDITOR" else (),
        )

    def find_by_email(self, email: str) -> LoginUser | None:
        return self.user if email == self.user.email else None

    def current_access(self, user_id):
        if user_id != self.user.id:
            return None
        return CurrentUserAccess(
            id=self.user.id, role=self.user.role, is_active=self.user.is_active,
            institution_ids=frozenset(self.user.institution_ids),
        )


@pytest.fixture
def api():
    redis = fakeredis.FakeRedis()
    sessions = RedisSessionStore(redis)
    users = Users()
    context = AuthContext(
        users=users, sessions=sessions, csrf=CsrfService(sessions, allowed_origin=ORIGIN),
        limiter=LoginRateLimiter(redis, secret=b"test-secret-with-at-least-thirty-two-bytes"),
        production=False,
    )
    app.dependency_overrides[auth_context] = lambda: context
    with TestClient(app, base_url=ORIGIN, client=("127.0.0.1", 50000)) as client:
        yield client, users, sessions
    app.dependency_overrides.clear()


def login(client, *, password=PASSWORD, origin=ORIGIN):
    return client.post(
        "/api/v1/auth/login", json={"email": "ADMIN@example.com", "password": password},
        headers={"Origin": origin},
    )


def test_admin_login_session_and_logout_mvp(api):
    client, users, sessions = api
    response = login(client)
    assert response.status_code == 200
    assert set(response.json()) == {"csrf_token"}
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "samesite=lax" in response.headers["set-cookie"].lower()
    assert "no-store" == response.headers["cache-control"]
    assert client.cookies.get("fumep_session")
    assert client.get("/api/v1/auth/session").json()["user_id"] == str(users.user.id)
    assert client.get("/api/v1/admin/session").status_code == 200
    denied = client.post("/api/v1/auth/logout", headers={"Origin": ORIGIN})
    assert denied.status_code == 403
    valid = client.post(
        "/api/v1/auth/logout",
        headers={"Origin": ORIGIN, "X-CSRF-Token": response.json()["csrf_token"]},
    )
    assert valid.status_code == 204
    assert client.get("/api/v1/auth/session").status_code == 401
    assert sessions.client.dbsize() >= 1  # rate-limit counters are independent of the session


def test_editor_is_forbidden_and_role_change_invalidates_session(api):
    client, users, _ = api
    users.user = LoginUser(
        id=users.user.id, email=users.user.email, password_hash=users.user.password_hash,
        role="EDITOR", institution_ids=(uuid4(),),
    )
    assert login(client).status_code == 200
    assert client.get("/api/v1/admin/session").status_code == 403
    users.user = LoginUser(
        id=users.user.id, email=users.user.email, password_hash=users.user.password_hash,
        role="ADMIN", institution_ids=(),
    )
    assert client.get("/api/v1/auth/session").status_code == 401


def test_deactivated_admin_loses_current_session(api):
    client, users, _ = api
    assert login(client).status_code == 200
    users.user = LoginUser(
        id=users.user.id, email=users.user.email, password_hash=users.user.password_hash,
        role="ADMIN", is_active=False,
    )
    assert client.get("/api/v1/admin/session").status_code == 401
    assert client.get("/api/v1/auth/session").status_code == 401


def test_login_requires_same_origin_and_never_exposes_password(api):
    client, _, _ = api
    assert login(client, origin="https://external.example").status_code == 403
    response = login(client, password="senha errada")
    assert response.status_code == 401
    assert "senha errada" not in response.text
    assert "set-cookie" not in response.headers


def test_login_is_rate_limited(api):
    client, _, _ = api
    for _ in range(5):
        assert login(client, password="senha errada").status_code == 401
    blocked = login(client)
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0


def test_missing_cookie_cannot_access_admin(api):
    client, _, _ = api
    assert client.get("/api/v1/admin/session").status_code == 401
    assert client.get("/api/v1/auth/session").status_code == 401
