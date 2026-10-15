"""Durable image-job recovery on the dedicated migration database."""

import os
from io import BytesIO
from threading import Event
from urllib.parse import urlsplit
from uuid import uuid4

import pytest
from minio import Minio
from PIL import Image
from redis import Redis
from rq.job import Job
from sqlalchemy import text

from app.database import database_engine
from app.media_pipeline import MediaPipeline
from app.media_processing_repository import LockedMediaProcessor, PostgresMediaProcessingRepository
from app.media_queue import MediaQueueConfig, MediaQueuePublisher
from app.media_reconciliation import MediaProcessReconciler
from app.media_variants import PrivateVariantStorage
from app.media_worker import MediaOriginalProcessor, run_worker
from app.media_worker_main import run_with_reconciliation
from app.original_image_storage import PRIVATE_BUCKET, OriginalImageStorage


def test_reconciliation_loop_starts_and_stops_with_worker():
    started = Event()
    calls = []

    class Reconciler:
        def sweep(self):
            calls.append(1)
            started.set()

    def worker():
        assert started.wait(2)

    run_with_reconciliation(Reconciler(), worker, interval_seconds=60)
    assert calls == [1]


def test_lost_job_is_recovered_and_processed_with_real_services():
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
        pytest.fail("Only the dedicated local migration database and Redis DB 15 are permitted")

    engine = database_engine(url)
    redis = Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
    config = MediaQueueConfig(queue_name=f"fumep:media:test:{uuid4().hex}")
    publisher = MediaQueuePublisher(redis, config)
    minio = Minio(endpoint, access_key=access, secret_key=secret,
                  secure=os.getenv("FUMEP_MINIO_TEST_SECURE", "false") == "true")
    assert minio.bucket_exists(PRIVATE_BUCKET)
    originals = OriginalImageStorage(minio)
    buffer = BytesIO()
    Image.new("RGB", (12, 8), (40, 90, 180)).save(buffer, format="PNG")
    stored = originals.put_image(original_filename="recovery.png", declared_mime="image/png",
                                 content=buffer.getvalue())
    media_id = uuid4()
    variant_keys = []
    try:
        with engine.begin() as db:
            db.execute(text(
                "INSERT INTO media (id, type, original_filename, stored_filename, mime_type, "
                "size_bytes, storage_key, checksum_sha256) "
                "VALUES (:id, 'IMAGE', 'recovery.png', :name, 'image/png', :size, :key, :checksum)"
            ), {"id": media_id, "name": stored.storage_key.rsplit("/", 1)[-1],
                "size": stored.image.size_bytes, "key": stored.storage_key,
                "checksum": stored.image.checksum_sha256})
        reconciler = MediaProcessReconciler(engine, publisher)
        with engine.connect() as locked:
            locked.execute(text("SELECT pg_advisory_lock(hashtext('MEDIA_PROCESS'), hashtext(:id))"),
                           {"id": str(media_id)})
            try:
                assert reconciler.sweep() == ()
                assert publisher._queue.count == 0
            finally:
                locked.execute(text("SELECT pg_advisory_unlock(hashtext('MEDIA_PROCESS'), hashtext(:id))"),
                               {"id": str(media_id)})
        assert reconciler.sweep() == (media_id,)
        job = Job.fetch(f"process-media-{media_id}", connection=redis, serializer="json")
        assert job.kwargs == {"media_id": str(media_id)}

        repository = PostgresMediaProcessingRepository(engine)
        processor = LockedMediaProcessor(repository, MediaPipeline(
            repository, MediaOriginalProcessor(repository, originals), PrivateVariantStorage(minio)
        ))
        run_worker(Redis.from_url(redis_url), processor, config=config, burst=True)
        assert repository.get(media_id).processing_status == "READY"
        with engine.connect() as db:
            variant_keys = list(db.execute(text(
                "SELECT storage_key FROM media_variants WHERE media_id = :id"
            ), {"id": media_id}).scalars())
        assert len(variant_keys) == 2
        assert reconciler.sweep() == ()
    finally:
        with engine.begin() as db:
            variant_keys = list(db.execute(text(
                "SELECT storage_key FROM media_variants WHERE media_id = :id"
            ), {"id": media_id}).scalars())
            db.execute(text("DELETE FROM media_variants WHERE media_id = :id"), {"id": media_id})
            db.execute(text("DELETE FROM media WHERE id = :id"), {"id": media_id})
        for key in variant_keys:
            minio.remove_object(PRIVATE_BUCKET, key)
        originals.remove(stored.storage_key)
        publisher._queue.delete(delete_jobs=True)
        publisher.close()
        engine.dispose()
