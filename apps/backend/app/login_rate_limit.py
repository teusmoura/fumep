"""Atomic Redis login attempt budget, independent of the future HTTP adapter."""

import hashlib
import hmac
import ipaddress
from dataclasses import dataclass

from redis import Redis
from redis.exceptions import RedisError, WatchError

WINDOW_SECONDS = 60
MAX_ATTEMPTS = 5


class RateLimitUnavailableError(Exception):
    def __init__(self) -> None:
        super().__init__("Login rate limit unavailable")


@dataclass(frozen=True, slots=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int


class LoginRateLimiter:
    def __init__(self, client: Redis, *, secret: bytes) -> None:
        if len(secret) < 32:
            raise ValueError("Rate-limit secret must contain at least 32 bytes")
        self.client = client
        self.secret = secret

    def _key(self, namespace: str, value: str) -> str:
        digest = hmac.new(
            self.secret, f"{namespace}:{value}".encode(), hashlib.sha256
        ).hexdigest()
        return f"migration:rate:login:{namespace}:{digest}"

    def consume(self, *, ip: str, normalized_email: str | None) -> RateLimitDecision:
        # The HTTP adapter must provide a trusted peer IP, not arbitrary X-Forwarded-For.
        try:
            address = ipaddress.ip_address(ip).compressed
        except ValueError as error:
            raise RateLimitUnavailableError() from error
        keys = [self._key("ip", address)]
        if normalized_email is not None:
            account = normalized_email.strip().lower()
            if not account:
                raise RateLimitUnavailableError()
            keys.append(self._key("account", account))

        for _ in range(20):
            try:
                with self.client.pipeline() as pipe:
                    pipe.watch(*keys)
                    values = [pipe.get(key) for key in keys]
                    counts = [int(value) if value is not None else 0 for value in values]
                    ttls = [pipe.ttl(key) for key in keys]
                    if any(value is not None and ttl < 0 for value, ttl in zip(values, ttls)):
                        raise RateLimitUnavailableError()
                    blocked = [ttl for count, ttl in zip(counts, ttls) if count >= MAX_ATTEMPTS]
                    if blocked:
                        return RateLimitDecision(False, max(1, *blocked))
                    pipe.multi()
                    for key, value in zip(keys, values):
                        if value is None:
                            pipe.set(key, 1, ex=WINDOW_SECONDS)
                        else:
                            pipe.incr(key)
                    pipe.execute()
                    return RateLimitDecision(True, 0)
            except WatchError:
                continue
            except (RedisError, ValueError, OverflowError) as error:
                raise RateLimitUnavailableError() from error
        raise RateLimitUnavailableError()
