import os
import re
from urllib.parse import urlsplit
from uuid import uuid4

import fakeredis
import pytest
from fastapi import Response
from redis import Redis

from app.sessions import (
    ABSOLUTE_SECONDS,
    COOKIE_NAME,
    IDLE_SECONDS,
    RedisSessionStore,
    clear_session_cookie,
    set_session_cookie,
)


def make_store() -> tuple[RedisSessionStore, fakeredis.FakeRedis, list[int]]:
    clock = [1_000_000]
    client = fakeredis.FakeRedis()
    return RedisSessionStore(client, clock=lambda: clock[0]), client, clock


def test_create_persists_only_opaque_server_side_session() -> None:
    store, client, _ = make_store()
    user_id, institution_id = uuid4(), uuid4()
    token = store.create(user_id=user_id, role="EDITOR", institution_ids=[institution_id])

    assert re.fullmatch(r"[A-Za-z0-9_-]{43}", token)
    assert str(user_id) not in token
    assert "." not in token  # Not a JWT.
    key = f"migration:session:{token}"
    assert client.ttl(key) in (IDLE_SECONDS, IDLE_SECONDS - 1)
    stored = client.get(key)
    assert stored is not None and b"password" not in stored
    assert store.read_and_refresh(token).user_id == user_id


def test_refresh_extends_idle_window_but_not_absolute_limit() -> None:
    store, client, clock = make_store()
    token = store.create(user_id=uuid4(), role="ADMIN")
    clock[0] += IDLE_SECONDS - 10
    refreshed = store.read_and_refresh(token)
    assert refreshed is not None and refreshed.last_activity_at == clock[0]
    assert client.ttl(f"migration:session:{token}") in (IDLE_SECONDS, IDLE_SECONDS - 1)
    assert refreshed.absolute_expires_at == 1_000_000 + ABSOLUTE_SECONDS


def test_idle_timeout_invalidates_session() -> None:
    store, client, clock = make_store()
    token = store.create(user_id=uuid4(), role="ADMIN")
    clock[0] += IDLE_SECONDS + 1
    assert store.read_and_refresh(token) is None
    assert client.exists(f"migration:session:{token}") == 0


def test_absolute_timeout_cannot_be_extended_by_activity() -> None:
    store, client, clock = make_store()
    token = store.create(user_id=uuid4(), role="ADMIN")
    for _ in range(15):
        clock[0] += IDLE_SECONDS - 1
        assert store.read_and_refresh(token) is not None
    clock[0] = 1_000_000 + ABSOLUTE_SECONDS
    assert store.read_and_refresh(token) is None
    assert client.exists(f"migration:session:{token}") == 0


def test_refresh_ttl_is_capped_by_absolute_deadline() -> None:
    store, client, clock = make_store()
    token = store.create(user_id=uuid4(), role="ADMIN")
    for _ in range(15):
        clock[0] += IDLE_SECONDS - 1
        assert store.read_and_refresh(token) is not None
    clock[0] = 1_000_000 + ABSOLUTE_SECONDS - 60
    assert store.read_and_refresh(token) is not None
    assert client.ttl(f"migration:session:{token}") in (60, 59)


def test_invalidation_and_malformed_tokens_do_not_expose_other_keys() -> None:
    store, client, _ = make_store()
    token = store.create(user_id=uuid4(), role="ADMIN")
    assert store.read_and_refresh("../session:other") is None
    store.invalidate("../session:other")
    assert store.read_and_refresh(token) is not None
    store.invalidate(token)
    assert store.read_and_refresh(token) is None
    assert client.exists(f"migration:session:{token}") == 0


def test_corrupt_session_data_is_rejected_and_removed() -> None:
    store, client, _ = make_store()
    token = store.create(user_id=uuid4(), role="ADMIN")
    key = f"migration:session:{token}"
    client.set(key, '{"role":"ADMIN","password":"leak"}', ex=IDLE_SECONDS)
    assert store.read_and_refresh(token) is None
    assert client.exists(key) == 0


@pytest.mark.parametrize("production", [False, True])
def test_cookie_is_http_only_lax_and_secure_in_production(production: bool) -> None:
    store, _, _ = make_store()
    token = store.create(user_id=uuid4(), role="ADMIN")
    response = Response()
    set_session_cookie(response, token, production=production)
    cookie = response.headers["set-cookie"]
    assert cookie.startswith(f"{COOKIE_NAME}={token};")
    assert "httponly" in cookie.lower()
    assert "samesite=lax" in cookie.lower()
    assert f"max-age={ABSOLUTE_SECONDS}" in cookie.lower()
    assert ("secure" in cookie.lower()) is production

    cleared = Response()
    clear_session_cookie(cleared, production=production)
    assert f"{COOKIE_NAME}=\"\"" in cleared.headers["set-cookie"]


def test_cookie_rejects_untrusted_token() -> None:
    with pytest.raises(ValueError, match="Invalid session token"):
        set_session_cookie(Response(), "not-a-session", production=True)


def test_real_local_redis_when_explicitly_configured() -> None:
    url = os.getenv("FUMEP_REDIS_TEST_URL")
    if not url:
        pytest.skip("Set FUMEP_REDIS_TEST_URL to a loopback Redis DB 15")
    parsed = urlsplit(url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"} or parsed.path != "/15":
        pytest.fail("Real session test accepts only loopback Redis DB 15")
    client = Redis.from_url(url, socket_connect_timeout=2, socket_timeout=2)
    prefix = f"migration:test:{uuid4()}:"
    store = RedisSessionStore(client, key_prefix=prefix)
    try:
        assert client.ping()
        token = store.create(user_id=uuid4(), role="ADMIN")
        assert store.read_and_refresh(token) is not None
        store.invalidate(token)
        assert store.read_and_refresh(token) is None
    finally:
        client.close()
