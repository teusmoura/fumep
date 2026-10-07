"""Safety checks for local-only MIG 6 admin password recovery."""

from uuid import uuid4

import fakeredis
import pytest
from sqlalchemy.engine import URL

from app.sessions import RedisSessionStore
from scripts.reset_mig6_demo import require_local_demo_targets, revoke_demo_sessions


def database_url(host: str, name: str) -> URL:
    return URL.create("postgresql+psycopg", host=host, database=name)


def test_reset_accepts_only_local_demo_targets() -> None:
    require_local_demo_targets(
        database_url("127.0.0.1", "portal_fumep_mig58_test"),
        "redis://localhost:6379/0",
    )


@pytest.mark.parametrize(
    ("database", "redis_url"),
    [
        (database_url("localhost", "portal_fumep"), "redis://localhost:6379"),
        (database_url("database.example.org", "portal_fumep_mig58_test"), "redis://localhost:6379"),
        (database_url("localhost", "portal_fumep_mig58_test"), "redis://remote.example.org:6379"),
        (database_url("localhost", "portal_fumep_mig58_test"), "http://localhost:6379"),
    ],
)
def test_reset_rejects_other_targets(database: URL, redis_url: str) -> None:
    with pytest.raises(SystemExit):
        require_local_demo_targets(database, redis_url)


def test_reset_revokes_only_matching_migration_sessions() -> None:
    client = fakeredis.FakeRedis()
    sessions = RedisSessionStore(client)
    target = uuid4()
    another = uuid4()
    first = sessions.create(user_id=target, role="ADMIN")
    second = sessions.create(user_id=target, role="ADMIN")
    unrelated = sessions.create(user_id=another, role="ADMIN")
    client.set("migration:rate:login:probe", "unrelated")

    assert revoke_demo_sessions(client, target) == 2
    assert sessions.read_and_refresh(first) is None
    assert sessions.read_and_refresh(second) is None
    assert sessions.read_and_refresh(unrelated) is not None
    assert client.get("migration:rate:login:probe") == b"unrelated"
