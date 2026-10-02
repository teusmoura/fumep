"""Explicit SQLAlchemy connection factory; never creates or migrates schema."""

from collections.abc import Iterator
from os import environ

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session


def database_engine(url: str | None = None) -> Engine:
    raw = url or environ.get("DATABASE_URL")
    if not raw:
        raise RuntimeError("DATABASE_URL is required")
    if raw.startswith("postgresql://"):
        raw = raw.replace("postgresql://", "postgresql+psycopg://", 1)
    if not raw.startswith("postgresql+psycopg://"):
        raise ValueError("PostgreSQL psycopg URL required")
    return create_engine(raw, pool_pre_ping=True)


def session_scope(engine: Engine) -> Iterator[Session]:
    with Session(engine) as session:
        yield session
