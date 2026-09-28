from uuid import uuid4

import fakeredis
import pytest
from fastapi import Response

from app.csrf import CsrfRejectedError, CsrfService
from app.sessions import RedisSessionStore, set_session_cookie

ORIGIN = "https://portal.example.com"


def setup() -> tuple[CsrfService, RedisSessionStore, fakeredis.FakeRedis, str]:
    client = fakeredis.FakeRedis()
    sessions = RedisSessionStore(client, clock=lambda: 1_000_000)
    token = sessions.create(user_id=uuid4(), role="ADMIN")
    return CsrfService(sessions, allowed_origin=ORIGIN), sessions, client, token


@pytest.mark.parametrize("method", ["POST", "PUT", "PATCH", "DELETE"])
def test_valid_token_and_same_origin_allow_mutation(method: str) -> None:
    csrf, _, _, session = setup()
    csrf.validate_mutation(
        method=method,
        session_token=session,
        csrf_token=csrf.issue(session),
        origin=ORIGIN,
        referer=f"{ORIGIN}/admin/editor?draft=1",
    )


def test_referer_is_fallback_only_when_origin_missing() -> None:
    csrf, _, _, session = setup()
    csrf.validate_mutation(
        method="POST", session_token=session, csrf_token=csrf.issue(session),
        origin=None, referer=f"{ORIGIN}/admin/editor",
    )


@pytest.mark.parametrize(
    "overrides",
    [
        {"csrf_token": None},
        {"csrf_token": "wrong"},
        {"origin": None, "referer": None},
        {"origin": "https://external.example.com"},
        {"origin": "https://portal.example.com.evil.test"},
        {"origin": "http://portal.example.com"},
        {"origin": "https://portal.example.com:444"},
        {"origin": "https://portal.example.com@evil.test"},
        {"origin": ORIGIN, "referer": "https://external.example.com/"},
        {"origin": None, "referer": "https://portal.example.com.evil.test/admin"},
        {"method": "GET"},
    ],
)
def test_missing_invalid_cross_origin_or_safe_method_fails_closed(
    overrides: dict[str, str | None]
) -> None:
    csrf, _, _, session = setup()
    request = dict(
        method="POST", session_token=session, csrf_token=csrf.issue(session),
        origin=ORIGIN, referer=None,
    )
    request.update(overrides)
    with pytest.raises(CsrfRejectedError, match="CSRF validation failed"):
        csrf.validate_mutation(**request)


def test_token_is_random_stored_in_redis_and_not_in_cookie() -> None:
    csrf, sessions, client, first = setup()
    second = sessions.create(user_id=uuid4(), role="ADMIN")
    token = csrf.issue(first)
    assert token != csrf.issue(second)
    assert token != first
    response = Response()
    set_session_cookie(response, first, production=True)
    assert token not in response.headers["set-cookie"]
    assert "httponly" in response.headers["set-cookie"].lower()
    assert token.encode() in client.get(f"migration:session:{first}")
    with pytest.raises(CsrfRejectedError):
        csrf.validate_mutation(
            method="POST", session_token=second, csrf_token=token,
            origin=ORIGIN, referer=None,
        )
    sessions.invalidate(first)
    with pytest.raises(CsrfRejectedError):
        csrf.issue(first)


def test_invalid_session_fails_validation_even_with_matching_token() -> None:
    csrf, sessions, _, session = setup()
    token = csrf.issue(session)
    sessions.invalidate(session)
    with pytest.raises(CsrfRejectedError):
        csrf.validate_mutation(
            method="DELETE", session_token=session, csrf_token=token,
            origin=ORIGIN, referer=None,
        )


def test_malformed_session_cookie_fails_without_internal_error() -> None:
    csrf, _, _, _ = setup()
    with pytest.raises(CsrfRejectedError):
        csrf.validate_mutation(
            method="POST", session_token="não-é-token", csrf_token="anything",
            origin=ORIGIN, referer=None,
        )


@pytest.mark.parametrize("origin", ["https://portal.example.com/admin", "https://name:pass@portal.example.com"])
def test_configuration_requires_exact_origin(origin: str) -> None:
    sessions = RedisSessionStore(fakeredis.FakeRedis())
    with pytest.raises(ValueError):
        CsrfService(sessions, allowed_origin=origin)
