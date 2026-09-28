from uuid import uuid4

import fakeredis
import pytest
from fastapi import Response

from app.session_use_cases import SessionUseCases
from app.sessions import COOKIE_NAME, IDLE_SECONDS, RedisSessionStore


def setup() -> tuple[SessionUseCases, RedisSessionStore, fakeredis.FakeRedis, list[int]]:
    client = fakeredis.FakeRedis()
    clock = [1_000_000]
    store = RedisSessionStore(client, clock=lambda: clock[0])
    return SessionUseCases(store), store, client, clock


def test_read_returns_minimal_authenticated_view() -> None:
    use_cases, store, client, _ = setup()
    user, institution = uuid4(), uuid4()
    token = store.create(user_id=user, role="EDITOR", institution_ids=[institution])
    view = use_cases.read(token)
    assert view is not None
    assert view.user_id == user
    assert view.role == "EDITOR"
    assert view.institution_ids == [institution]
    assert set(view.model_dump()) == {"user_id", "role", "institution_ids"}
    serialized = view.model_dump_json()
    assert token not in serialized
    assert "password" not in serialized
    assert "expires" not in serialized
    assert client.dbsize() == 1


def test_missing_malformed_and_expired_session_return_none() -> None:
    use_cases, store, _, clock = setup()
    assert use_cases.read(None) is None
    assert use_cases.read("malformed") is None
    token = store.create(user_id=uuid4(), role="ADMIN")
    clock[0] += IDLE_SECONDS + 1
    assert use_cases.read(token) is None


@pytest.mark.parametrize("production", [False, True])
def test_logout_removes_session_and_expires_cookie(production: bool) -> None:
    use_cases, store, client, _ = setup()
    token = store.create(user_id=uuid4(), role="ADMIN")
    response = Response()
    use_cases.logout(token, response, production=production)
    assert client.dbsize() == 0
    assert use_cases.read(token) is None
    cookie = response.headers["set-cookie"].lower()
    assert f"{COOKIE_NAME}=\"\"" in cookie
    assert "max-age=0" in cookie
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "path=/" in cookie
    assert ("secure" in cookie) is production


def test_logout_is_idempotent_with_missing_or_repeated_token() -> None:
    use_cases, store, client, _ = setup()
    token = store.create(user_id=uuid4(), role="ADMIN")
    use_cases.logout(token, Response(), production=False)
    use_cases.logout(token, Response(), production=False)
    use_cases.logout(None, Response(), production=False)
    use_cases.logout("malformed", Response(), production=False)
    assert client.dbsize() == 0


def test_redis_failure_does_not_report_logout_or_clear_cookie() -> None:
    use_cases, store, client, _ = setup()
    token = store.create(user_id=uuid4(), role="ADMIN")
    response = Response()

    def unavailable(*args: object, **kwargs: object) -> None:
        raise ConnectionError("Redis unavailable")

    client.delete = unavailable  # type: ignore[method-assign]
    with pytest.raises(ConnectionError, match="Redis unavailable"):
        use_cases.logout(token, response, production=True)
    assert "set-cookie" not in response.headers


def test_redis_failure_does_not_return_stale_session() -> None:
    use_cases, store, client, _ = setup()
    token = store.create(user_id=uuid4(), role="ADMIN")

    def unavailable(*args: object, **kwargs: object) -> None:
        raise ConnectionError("Redis unavailable")

    client.pipeline = unavailable  # type: ignore[method-assign]
    with pytest.raises(ConnectionError, match="Redis unavailable"):
        use_cases.read(token)
