"""HTTP adapter for the existing session, CSRF and authorization services."""

import os
from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy.exc import SQLAlchemyError

from app.auth_repository import PostgresUserRepository
from app.authorization import AccessDeniedError, require_admin
from app.csrf import CsrfRejectedError, CsrfService
from app.database import database_engine
from app.login import InvalidCredentialsError, LoginService
from app.login_rate_limit import LoginRateLimiter, RateLimitUnavailableError
from app.passwords import LoginCredentials
from app.session_use_cases import SessionUseCases, SessionView
from app.sessions import COOKIE_NAME, RedisSessionStore, set_session_cookie

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])
admin_router = APIRouter(prefix="/api/v1/admin", tags=["administration"])


@dataclass(frozen=True)
class AuthContext:
    users: PostgresUserRepository
    sessions: RedisSessionStore
    csrf: CsrfService
    limiter: LoginRateLimiter
    production: bool


@lru_cache(maxsize=1)
def get_auth_context() -> AuthContext:
    origin = os.environ["APP_ORIGIN"]
    redis_url = os.environ["REDIS_URL"]
    secret = os.environ["LOGIN_RATE_LIMIT_SECRET"].encode()
    parsed = urlsplit(origin)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("APP_ORIGIN must be an absolute HTTP origin")
    sessions = RedisSessionStore(Redis.from_url(redis_url))
    return AuthContext(
        users=PostgresUserRepository(database_engine()),
        sessions=sessions,
        csrf=CsrfService(sessions, allowed_origin=origin),
        limiter=LoginRateLimiter(sessions.client, secret=secret),
        production=parsed.scheme == "https",
    )


def auth_context() -> AuthContext:
    try:
        return get_auth_context()
    except (KeyError, ValueError, RuntimeError) as error:
        raise HTTPException(status_code=503, detail="Authentication unavailable") from error


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


def _origin_guard(request: Request, context: AuthContext) -> None:
    from app.csrf import _origin

    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    if not origin and not referer:
        raise HTTPException(status_code=403, detail="CSRF validation failed")
    if origin is not None and _origin(origin, allow_path=False) != context.csrf.allowed_origin:
        raise HTTPException(status_code=403, detail="CSRF validation failed")
    if referer is not None and _origin(referer, allow_path=True) != context.csrf.allowed_origin:
        raise HTTPException(status_code=403, detail="CSRF validation failed")


class LoginResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    csrf_token: str


@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginCredentials, request: Request, response: Response,
    context: AuthContext = Depends(auth_context),
) -> LoginResponse:
    _no_store(response)
    _origin_guard(request, context)
    try:
        decision = context.limiter.consume(
            ip=request.client.host if request.client else "", normalized_email=str(credentials.email),
        )
        if not decision.allowed:
            raise HTTPException(
                status_code=429, detail="Too many login attempts",
                headers={"Retry-After": str(decision.retry_after_seconds)},
            )
        result = LoginService(context.users, context.sessions).login(credentials)
    except InvalidCredentialsError as error:
        raise HTTPException(status_code=401, detail="Invalid credentials") from error
    except (RateLimitUnavailableError, RedisError, SQLAlchemyError) as error:
        raise HTTPException(status_code=503, detail="Authentication unavailable") from error
    set_session_cookie(response, result.session_token, production=context.production)
    return LoginResponse(csrf_token=result.csrf_token)


def _current_session(request: Request, context: AuthContext) -> SessionView:
    token = request.cookies.get(COOKIE_NAME)
    if token is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    view = SessionUseCases(context.sessions, context.csrf).read(token)
    if view is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    current = context.users.current_access(view.user_id)
    if current is None or not current.is_active or current.role != view.role or current.institution_ids != frozenset(view.institution_ids):
        context.sessions.invalidate(token)
        raise HTTPException(status_code=401, detail="Authentication required")
    return view


@router.get("/session", response_model=SessionView)
def session(request: Request, response: Response, context: AuthContext = Depends(auth_context)) -> SessionView:
    _no_store(response)
    try:
        return _current_session(request, context)
    except (RedisError, SQLAlchemyError) as error:
        raise HTTPException(status_code=503, detail="Authentication unavailable") from error


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, context: AuthContext = Depends(auth_context)) -> None:
    _no_store(response)
    _origin_guard(request, context)
    try:
        SessionUseCases(context.sessions, context.csrf).logout(
            request.cookies.get(COOKIE_NAME), response, production=context.production,
            csrf_token=request.headers.get("x-csrf-token"),
            origin=request.headers.get("origin"), referer=request.headers.get("referer"),
        )
    except CsrfRejectedError as error:
        raise HTTPException(status_code=403, detail="CSRF validation failed") from error
    except RedisError as error:
        raise HTTPException(status_code=503, detail="Authentication unavailable") from error


@admin_router.get("/session", response_model=SessionView)
def admin_session(request: Request, response: Response, context: AuthContext = Depends(auth_context)) -> SessionView:
    _no_store(response)
    try:
        view = _current_session(request, context)
        current = context.users.current_access(view.user_id)
        if current is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        data = context.sessions.read_and_refresh(request.cookies[COOKIE_NAME])
        if data is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        require_admin(data, current)
        return view
    except AccessDeniedError as error:
        raise HTTPException(status_code=403, detail="Administrator required") from error
    except (RedisError, SQLAlchemyError) as error:
        raise HTTPException(status_code=503, detail="Authentication unavailable") from error
