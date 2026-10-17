"""HTTP adapter for the existing session, CSRF and authorization services."""

import os
import secrets
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.auth_repository import PostgresUserRepository
from app.authorization import AccessDeniedError, require_admin
from app.csrf import CsrfRejectedError, CsrfService
from app.database import database_engine
from app.login import InvalidCredentialsError, LoginService
from app.login_rate_limit import LoginRateLimiter, RateLimitUnavailableError
from app.passwords import LoginCredentials, NewPasswordInput, hash_new_password
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


DemoProfile = Literal["admin", "editor-fumep", "editor-etmsl", "editor-cramam"]
DEMO_PROFILES = {
    "admin": ("ADMIN", None, "Administrador"),
    "editor-fumep": ("EDITOR", "fumep", "Editor FUMEP"),
    "editor-etmsl": ("EDITOR", "etmsl", "Editor ETMSL"),
    "editor-cramam": ("EDITOR", "cramam", "Editor CRAMAM"),
}


class DemoLoginInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profile: DemoProfile


def _require_local_demo(request: Request, context: AuthContext) -> None:
    """Never expose password-free sessions outside the explicit isolated local demo."""
    engine = getattr(context.users, "engine", None)
    redis_host = urlsplit(os.environ.get("REDIS_URL", "")).hostname
    if (
        os.environ.get("FUMEP_LOCAL_DEMO_LOGIN") != "1"
        or context.production
        or context.csrf.allowed_origin != ("http", "localhost", 3002)
        or request.client is None
        or request.client.host not in {"127.0.0.1", "::1"}
        or engine is None
        or engine.url.host not in {"localhost", "127.0.0.1", "::1"}
        or engine.url.database != "portal_fumep_mig58_test"
        or redis_host not in {"localhost", "127.0.0.1", "::1"}
    ):
        raise HTTPException(status_code=404, detail="Not found")


def _demo_user(context: AuthContext, profile: DemoProfile) -> tuple[UUID, str, tuple[UUID, ...]]:
    role, slug, label = DEMO_PROFILES[profile]
    email = f"fumep-local-{profile}@example.invalid"
    name = f"DEMO LOCAL — {label}"
    with context.users.engine.begin() as db:
        institution_id = None
        if slug is not None:
            institution_id = db.execute(
                text("SELECT id FROM institutions WHERE slug = :slug AND is_active = true"),
                {"slug": slug},
            ).scalar_one_or_none()
            if institution_id is None:
                raise HTTPException(status_code=503, detail="Demo institution unavailable")
        row = db.execute(
            text("SELECT id, name, role, is_active FROM users WHERE lower(email) = :email FOR UPDATE"),
            {"email": email},
        ).mappings().first()
        if row is None:
            password_hash = hash_new_password(
                NewPasswordInput(password=secrets.token_urlsafe(32))
            )
            db.execute(
                text("INSERT INTO users (id, name, email, password_hash, role) "
                     "VALUES (:id, :name, :email, :hash, :role) ON CONFLICT DO NOTHING"),
                {"id": uuid4(), "name": name, "email": email, "hash": password_hash, "role": role},
            )
            row = db.execute(
                text("SELECT id, name, role, is_active FROM users WHERE lower(email) = :email FOR UPDATE"),
                {"email": email},
            ).mappings().one()
        if row["name"] != name or row["role"] != role or not row["is_active"]:
            raise HTTPException(status_code=503, detail="Demo profile unavailable")
        db.execute(text("DELETE FROM user_institutions WHERE user_id = :id"), {"id": row["id"]})
        if institution_id is not None:
            db.execute(
                text("INSERT INTO user_institutions (user_id, institution_id) VALUES (:id, :institution_id)"),
                {"id": row["id"], "institution_id": institution_id},
            )
        return row["id"], role, (institution_id,) if institution_id is not None else ()


@router.get("/demo-profiles", include_in_schema=False)
def demo_profiles(request: Request, response: Response, context: AuthContext = Depends(auth_context)):
    _no_store(response)
    _require_local_demo(request, context)
    return [{"id": key, "label": value[2]} for key, value in DEMO_PROFILES.items()]


@router.post("/demo-login", response_model=LoginResponse, include_in_schema=False)
def demo_login(
    payload: DemoLoginInput, request: Request, response: Response,
    context: AuthContext = Depends(auth_context),
) -> LoginResponse:
    _no_store(response)
    _require_local_demo(request, context)
    _origin_guard(request, context)
    try:
        user_id, role, institution_ids = _demo_user(context, payload.profile)
        token = context.sessions.create(user_id=user_id, role=role, institution_ids=institution_ids)
        session = context.sessions.read_and_refresh(token)
        if session is None:
            raise RuntimeError("New demo session unavailable")
        old_token = request.cookies.get(COOKIE_NAME)
        if old_token is not None:
            context.sessions.invalidate(old_token)
    except (RedisError, SQLAlchemyError, RuntimeError) as error:
        raise HTTPException(status_code=503, detail="Demo login unavailable") from error
    set_session_cookie(response, token, production=False)
    return LoginResponse(csrf_token=session.csrf_token)


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
