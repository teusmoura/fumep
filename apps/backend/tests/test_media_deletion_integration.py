"""Deletion reconciliation and Worker acceptance on disposable local services."""

import os
from urllib.parse import urlsplit
from uuid import uuid4

import pytest
from minio import Minio
from redis import Redis
from sqlalchemy import text

from app.database import database_engine
from app.media_deletion import PrivateMediaDeletionStorage
from app.media_deletion_postgres import PostgresMediaDeletionProcessor
from app.media_queue import MediaQueueConfig, MediaQueuePublisher
from app.media_reconciliation import MediaDeletionReconciler
from app.media_worker import run_worker
from app.original_image_storage import PRIVATE_BUCKET
from app.original_pdf_storage import OriginalPdfStorage


def test_lost_deletion_job_is_recovered_and_removed_by_worker():
    url = os.getenv("FUMEP_TEST_DATABASE_URL")
    redis_url = os.getenv("FUMEP_REDIS_TEST_URL")
    endpoint = os.getenv("FUMEP_MINIO_TEST_ENDPOINT")
    access = os.getenv("FUMEP_MINIO_TEST_ACCESS_KEY")
    secret = os.getenv("FUMEP_MINIO_TEST_SECRET_KEY")
    if not all((url, redis_url, endpoint, access, secret)):
        pytest.skip("Dedicated PostgreSQL, Redis DB 15 and MinIO are required")
    parsed = urlsplit(redis_url)
    if (not url.endswith("/portal_fumep_mig58_test") or
            parsed.hostname not in {"localhost", "127.0.0.1", "::1"} or parsed.path != "/15"):
        pytest.fail("Only disposable local migration services are permitted")

    engine = database_engine(url)
    redis = Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
    config = MediaQueueConfig(queue_name=f"fumep:media:delete:test:{uuid4().hex}")
    publisher = MediaQueuePublisher(redis, config)
    minio = Minio(endpoint, access_key=access, secret_key=secret,
                  secure=os.getenv("FUMEP_MINIO_TEST_SECURE", "false") == "true")
    assert minio.bucket_exists(PRIVATE_BUCKET)
    originals = OriginalPdfStorage(minio)
    stored = originals.put_pdf(original_filename="delete.pdf", declared_mime="application/pdf",
                               content=b"%PDF-1.7\n%%EOF")
    media_id = uuid4()
    try:
        with engine.begin() as db:
            db.execute(text(
                "INSERT INTO media (id, type, original_filename, stored_filename, mime_type, "
                "size_bytes, storage_key, checksum_sha256, processing_status, "
                "deletion_status, deletion_requested_at) "
                "VALUES (:id, 'DOCUMENT', 'delete.pdf', :name, 'application/pdf', :size, "
                ":key, :checksum, 'READY', 'REQUESTED', now())"
            ), {"id": media_id, "name": stored.storage_key.rsplit("/", 1)[-1],
                "size": stored.document.size_bytes, "key": stored.storage_key,
                "checksum": stored.document.checksum_sha256})
        processor = PostgresMediaDeletionProcessor(engine, PrivateMediaDeletionStorage(minio))
        reconciler = MediaDeletionReconciler(engine, publisher, processor)
        with engine.connect() as lock:
            lock.execute(text("SELECT pg_advisory_lock(hashtext('MEDIA_DELETE'), hashtext(:id))"),
                         {"id": str(media_id)})
            try:
                assert reconciler.sweep() == ()
            finally:
                lock.execute(text("SELECT pg_advisory_unlock(hashtext('MEDIA_DELETE'), hashtext(:id))"),
                             {"id": str(media_id)})
        assert reconciler.sweep() == (media_id,)
        class UnusedImageProcessor:
            def process(self, _media_id):
                raise AssertionError("No image job expected")

            def mark_failed(self, _media_id):
                raise AssertionError("No image job expected")

        run_worker(Redis.from_url(redis_url), UnusedImageProcessor(),
                   deletion_processor=processor, config=config, burst=True)
        with engine.connect() as db:
            assert db.execute(text("SELECT count(*) FROM media WHERE id = :id"),
                              {"id": media_id}).scalar_one() == 0
            assert db.execute(text("SELECT count(*) FROM audit_logs WHERE entity_id = :id "
                                   "AND action = 'MEDIA_DELETED'"), {"id": media_id}).scalar_one() == 1
        assert reconciler.sweep() == ()
        assert list(minio.list_objects(PRIVATE_BUCKET, prefix=stored.storage_key)) == []
    finally:
        with engine.begin() as db:
            db.execute(text("DELETE FROM audit_logs WHERE entity_id = :id AND action LIKE 'MEDIA_DELETE%'"),
                       {"id": media_id})
            db.execute(text("DELETE FROM media WHERE id = :id"), {"id": media_id})
        originals.remove(stored.storage_key)
        publisher._queue.delete(delete_jobs=True)
        publisher.close()
        engine.dispose()
