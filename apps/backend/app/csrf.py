"""CSRF contract for future cookie-authenticated administrative mutations."""

import base64
import hashlib
import hmac
import re
from urllib.parse import urlsplit

from app.sessions import RedisSessionStore

MUTATING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
_SESSION_TOKEN = re.compile(r"^[A-Za-z0-9_-]{43}$")


class CsrfRejectedError(Exception):
    def __init__(self) -> None:
        super().__init__("CSRF validation failed")


def _origin(value: str, *, allow_path: bool) -> tuple[str, str, int] | None:
    if value != value.strip() or any(ord(char) < 32 for char in value):
        return None
    try:
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.fragment
            or (not allow_path and (parsed.path not in {"", "/"} or parsed.query))
        ):
            return None
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError:
        return None
    return parsed.scheme, parsed.hostname, port


class CsrfService:
    def __init__(self, sessions: RedisSessionStore, *, secret: bytes, allowed_origin: str) -> None:
        if len(secret) < 32:
            raise ValueError("CSRF secret must contain at least 32 bytes")
        origin = _origin(allowed_origin, allow_path=False)
        if origin is None:
            raise ValueError("A single absolute allowed origin is required")
        self.sessions = sessions
        self.secret = secret
        self.allowed_origin = origin

    def _token(self, session_token: str) -> str:
        if not _SESSION_TOKEN.fullmatch(session_token):
            raise CsrfRejectedError()
        digest = hmac.new(
            self.secret, b"fumep-csrf-v1:" + session_token.encode("ascii"), hashlib.sha256
        ).digest()
        return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")

    def issue(self, session_token: str) -> str:
        if self.sessions.read_and_refresh(session_token) is None:
            raise CsrfRejectedError()
        return self._token(session_token)

    def validate_mutation(
        self,
        *,
        method: str,
        session_token: str,
        csrf_token: str | None,
        origin: str | None,
        referer: str | None,
    ) -> None:
        if method.upper() not in MUTATING_METHODS:
            raise CsrfRejectedError()
        if not origin and not referer:
            raise CsrfRejectedError()
        if origin is not None and _origin(origin, allow_path=False) != self.allowed_origin:
            raise CsrfRejectedError()
        if referer is not None and _origin(referer, allow_path=True) != self.allowed_origin:
            raise CsrfRejectedError()
        if csrf_token is None or not hmac.compare_digest(
            csrf_token, self._token(session_token)
        ):
            raise CsrfRejectedError()
        if self.sessions.read_and_refresh(session_token) is None:
            raise CsrfRejectedError()
