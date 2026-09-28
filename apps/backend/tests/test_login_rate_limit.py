import time
from concurrent.futures import ThreadPoolExecutor

import fakeredis
import pytest
from redis.exceptions import ConnectionError as RedisConnectionError

from app.login_rate_limit import (
    MAX_ATTEMPTS,
    WINDOW_SECONDS,
    LoginRateLimiter,
    RateLimitUnavailableError,
)

IP = "192.0.2.10"
EMAIL = "editor@example.com"


def setup() -> tuple[LoginRateLimiter, fakeredis.FakeRedis]:
    client = fakeredis.FakeRedis()
    return LoginRateLimiter(client, secret=b"r" * 32), client


def test_ip_budget_blocks_sixth_attempt_with_temporary_retry() -> None:
    limiter, client = setup()
    for _ in range(MAX_ATTEMPTS):
        assert limiter.consume(ip=IP, normalized_email=None).allowed
    denied = limiter.consume(ip=IP, normalized_email=None)
    assert not denied.allowed
    assert 1 <= denied.retry_after_seconds <= WINDOW_SECONDS
    assert client.dbsize() == 1
    key = next(iter(client.scan_iter()))
    assert 1 <= client.ttl(key) <= WINDOW_SECONDS


def test_account_budget_applies_across_multiple_ips_without_user_lookup() -> None:
    limiter, client = setup()
    for last_octet in range(1, MAX_ATTEMPTS + 1):
        assert limiter.consume(
            ip=f"192.0.2.{last_octet}", normalized_email=f"  {EMAIL.upper()}  "
        ).allowed
    denied = limiter.consume(ip="192.0.2.99", normalized_email=EMAIL)
    assert not denied.allowed
    assert client.dbsize() == MAX_ATTEMPTS + 1
    assert all(EMAIL.encode() not in key and b"192.0.2." not in key for key in client.scan_iter())


def test_expired_window_allows_new_attempt() -> None:
    limiter, client = setup()
    for _ in range(MAX_ATTEMPTS):
        limiter.consume(ip=IP, normalized_email=None)
    key = next(iter(client.scan_iter()))
    client.expire(key, 1)
    time.sleep(1.05)
    assert limiter.consume(ip=IP, normalized_email=None).allowed


def test_concurrent_attempts_never_exceed_limit() -> None:
    limiter, client = setup()
    with ThreadPoolExecutor(max_workers=12) as pool:
        decisions = list(pool.map(lambda _: limiter.consume(ip=IP, normalized_email=EMAIL), range(12)))
    assert sum(decision.allowed for decision in decisions) == MAX_ATTEMPTS
    assert client.dbsize() == 2


def test_redis_failure_fails_closed() -> None:
    limiter, client = setup()

    def unavailable(*args: object, **kwargs: object) -> None:
        raise RedisConnectionError("Redis unavailable")

    client.pipeline = unavailable  # type: ignore[method-assign]
    with pytest.raises(RateLimitUnavailableError):
        limiter.consume(ip=IP, normalized_email=EMAIL)


@pytest.mark.parametrize("ip,email", [("forged", EMAIL), (IP, " ")])
def test_bad_identity_input_never_consumes_budget(ip: str, email: str) -> None:
    limiter, client = setup()
    with pytest.raises(RateLimitUnavailableError):
        limiter.consume(ip=ip, normalized_email=email)
    assert client.dbsize() == 0
