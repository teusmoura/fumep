"""Guard and lifecycle tests for the integrated image Worker."""

import os
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.database import database_engine
from app.media_processing_repository import (
    LockedMediaProcessor, PostgresMediaProcessingRepository, require_migration_engine,
)
from app.media_variants import StoredVariant


def test_worker_rejects_unapproved_database_without_connecting():
    for url in (
        "postgresql://u:p@127.0.0.1/portal_fumep",
        "postgresql://u:p@database.example/portal_fumep_mig58_test",
    ):
        with pytest.raises(ValueError):
            require_migration_engine(SimpleNamespace(url=make_url(url)))


class Connection:
    def __init__(self, locked):
        self.locked = locked
        self.queries = []

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, statement, params):
        self.queries.append((str(statement), params))
        return SimpleNamespace(scalar_one=lambda: self.locked)


def test_processing_lock_is_released_on_success_and_failure():
    media_id = uuid4()
    for fail in (False, True):
        connection = Connection(True)
        repository = SimpleNamespace(engine=SimpleNamespace(connect=lambda: connection))
        calls = []

        def process(value):
            calls.append(value)
            if fail:
                raise RuntimeError("worker failed")
            return value

        processor = LockedMediaProcessor(repository, SimpleNamespace(process=process))
        if fail:
            with pytest.raises(RuntimeError):
                processor.process(media_id)
        else:
            assert processor.process(media_id) == media_id
        assert calls == [media_id]
        assert len(connection.queries) == 2
        assert "pg_try_advisory_lock" in connection.queries[0][0]
        assert "pg_advisory_unlock" in connection.queries[1][0]


def test_processing_lock_prevents_parallel_worker():
    connection = Connection(False)
    repository = SimpleNamespace(engine=SimpleNamespace(connect=lambda: connection))
    processor = LockedMediaProcessor(repository, SimpleNamespace(process=lambda _: pytest.fail("Parallel work")))
    with pytest.raises(RuntimeError, match="already active"):
        processor.process(uuid4())
    assert len(connection.queries) == 1


def test_postgres_processing_lifecycle_on_dedicated_database():
    url = os.getenv("FUMEP_TEST_DATABASE_URL")
    if not url:
        pytest.skip("FUMEP_TEST_DATABASE_URL required")
    if not url.endswith("/portal_fumep_mig58_test"):
        pytest.fail("Dedicated migration test database required")
    engine = database_engine(url)
    repository = PostgresMediaProcessingRepository(engine)
    media_id = uuid4()
    failed_id = uuid4()
    try:
        with engine.begin() as db:
            for id_ in (media_id, failed_id):
                key = f"images/originals/{id_.hex}.png"
                db.execute(text(
                    "INSERT INTO media (id, type, original_filename, stored_filename, mime_type, "
                    "size_bytes, storage_key, checksum_sha256) "
                    "VALUES (:id, 'IMAGE', 'test.png', :name, 'image/png', 12, :key, :checksum)"
                ), {"id": id_, "name": key.rsplit("/", 1)[-1], "key": key,
                    "checksum": id_.hex * 2})
        assert repository.get(media_id).processing_status == "PENDING"
        assert repository.claim(media_id)
        assert repository.get(media_id).processing_status == "PROCESSING"
        keys = []
        for image_format in ("WEBP", "AVIF"):
            key = f"images/variants/{media_id}-12.{image_format.lower()}"
            keys.append(key)
            repository.upsert_variant(StoredVariant(
                media_id=media_id, format=image_format, width=12, height=8,
                size_bytes=20, storage_key=key, checksum_sha256="0" * 64,
            ))
        with pytest.raises(RuntimeError, match="Incomplete"):
            repository.mark_ready(media_id, 12, 8, tuple(keys[:1]), keys[0])
        repository.mark_ready(media_id, 12, 8, tuple(keys), keys[0])
        ready = repository.get(media_id)
        assert ready.processing_status == "READY" and (ready.width, ready.height) == (12, 8)
        assert not repository.claim(media_id)
        assert repository.claim(failed_id)
        repository.mark_failed(failed_id, "MEDIA_PROCESSING_FAILED")
        assert repository.get(failed_id).processing_status == "FAILED"
        with engine.connect() as db:
            count = db.execute(text(
                "SELECT count(*) FROM audit_logs WHERE action = 'MEDIA_PROCESSING_FAILED' AND entity_id = :id"
            ), {"id": failed_id}).scalar_one()
        assert count == 1
    finally:
        with engine.begin() as db:
            db.execute(text("DELETE FROM audit_logs WHERE action = 'MEDIA_PROCESSING_FAILED' AND entity_id = :id"), {"id": failed_id})
            db.execute(text("DELETE FROM media WHERE id IN (:first, :second)"), {"first": media_id, "second": failed_id})
        engine.dispose()
