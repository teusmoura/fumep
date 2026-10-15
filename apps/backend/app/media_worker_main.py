"""Run the integrated image Worker as a separate process."""

import os
import logging
from threading import Event, Thread

from minio import Minio
from redis import Redis
from urllib3 import PoolManager, Timeout

from app.database import database_engine
from app.media_pipeline import MediaPipeline
from app.media_deletion import PrivateMediaDeletionStorage
from app.media_deletion_postgres import PostgresMediaDeletionProcessor
from app.media_processing_repository import LockedMediaProcessor, PostgresMediaProcessingRepository
from app.media_queue import MediaQueuePublisher
from app.media_reconciliation import MediaDeletionReconciler, MediaProcessReconciler
from app.media_variants import PrivateVariantStorage
from app.media_worker import MediaOriginalProcessor, run_worker
from app.original_image_storage import OriginalImageStorage


def run_with_reconciliation(reconciler: MediaProcessReconciler, run_worker_once,
                            interval_seconds: float = 60) -> None:
    """Sweep at startup and periodically; finish the sweep before closing dependencies."""
    stop = Event()

    def sweep_loop() -> None:
        while not stop.is_set():
            reconcilers = reconciler if isinstance(reconciler, tuple) else (reconciler,)
            for item in reconcilers:
                try:
                    item.sweep()
                except Exception:
                    logging.warning("Media reconciliation unavailable")
            stop.wait(interval_seconds)

    thread = Thread(target=sweep_loop, name="media-process-reconciliation")
    thread.start()
    try:
        run_worker_once()
    finally:
        stop.set()
        thread.join()


def main() -> None:
    engine = database_engine()
    publisher = None
    try:
        repository = PostgresMediaProcessingRepository(engine)
        endpoint = os.environ["MINIO_ENDPOINT"]
        if ":" not in endpoint:
            endpoint = f"{endpoint}:{os.environ.get('MINIO_PORT', '9000')}"
        storage = Minio(endpoint, access_key=os.environ["MINIO_ACCESS_KEY"],
                        secret_key=os.environ["MINIO_SECRET_KEY"],
                        secure=os.environ.get("MINIO_SECURE", "false").lower() == "true",
                        http_client=PoolManager(timeout=Timeout(connect=5, read=20), retries=False))
        originals = OriginalImageStorage(storage)
        pipeline = MediaPipeline(repository, MediaOriginalProcessor(repository, originals),
                                 PrivateVariantStorage(storage))
        processor = LockedMediaProcessor(repository, pipeline)
        deletion_processor = PostgresMediaDeletionProcessor(engine, PrivateMediaDeletionStorage(storage))
        redis_url = os.environ["REDIS_URL"]
        publisher = MediaQueuePublisher(Redis.from_url(redis_url, socket_connect_timeout=5, socket_timeout=5))
        reconciler = MediaProcessReconciler(engine, publisher)
        deletion_reconciler = MediaDeletionReconciler(engine, publisher, deletion_processor)
        run_with_reconciliation(
            (reconciler, deletion_reconciler),
            lambda: run_worker(Redis.from_url(redis_url, socket_connect_timeout=5, socket_timeout=5),
                               processor, deletion_processor=deletion_processor),
        )
    finally:
        if publisher is not None:
            publisher.close()
        engine.dispose()


if __name__ == "__main__":
    main()
