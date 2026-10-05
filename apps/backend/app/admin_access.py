"""Fresh PostgreSQL authorization and CSRF for cookie-authenticated admin APIs."""

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from redis.exceptions import RedisError
from sqlalchemy.exc import SQLAlchemyError

from app.auth_http import AuthContext, _current_session, auth_context
from app.authorization import AccessDeniedError, CurrentUserAccess, require_admin, require_institutions
from app.csrf import CsrfRejectedError
from app.sessions import COOKIE_NAME, SessionData


@dataclass(frozen=True)
class Actor:
    context: AuthContext
    session: SessionData
    current: CurrentUserAccess


def actor(request: Request, context: AuthContext = Depends(auth_context)) -> Actor:
    try:
        view = _current_session(request, context)
        token = request.cookies[COOKIE_NAME]
        session = context.sessions.read_and_refresh(token)
        current = context.users.current_access(view.user_id)
        if session is None or current is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        if (
            not current.is_active or session.user_id != current.id
            or session.role != current.role
            or set(session.institution_ids) != current.institution_ids
        ):
            context.sessions.invalidate(token)
            raise HTTPException(status_code=401, detail="Authentication required")
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            context.csrf.validate_mutation(
                method=request.method, session_token=token,
                csrf_token=request.headers.get("x-csrf-token"),
                origin=request.headers.get("origin"), referer=request.headers.get("referer"),
            )
        return Actor(context, session, current)
    except CsrfRejectedError as error:
        raise HTTPException(status_code=403, detail="CSRF validation failed") from error
    except (RedisError, SQLAlchemyError) as error:
        raise HTTPException(status_code=503, detail="Administrative service unavailable") from error


def require_scope(principal: Actor, institution_id: UUID | None) -> None:
    try:
        if institution_id is None:
            require_admin(principal.session, principal.current)
        else:
            require_institutions(principal.session, principal.current, frozenset({institution_id}))
    except AccessDeniedError as error:
        raise HTTPException(status_code=403, detail="Access denied") from error
