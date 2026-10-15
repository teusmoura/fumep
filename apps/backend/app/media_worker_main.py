"""Run the integrated image Worker as a separate process."""

import os

from minio import Minio
from redis import Redis

from app.database import database_engine
from app.media_pipeline import MediaPipeline
from app.media_processing_repository import LockedMediaProcessor, PostgresMediaProcessingRepository
from app.media_variants import PrivateVariantStorage
from app.media_worker import MediaOriginalProcessor, run_worker
from app.original_image_storage import OriginalImageStorage


def main() -> None:
    engine = database_engine()
    try:
        repository = PostgresMediaProcessingRepository(engine)
        endpoint = os.environ["MINIO_ENDPOINT"]
        if ":" not in endpoint:
            endpoint = f"{endpoint}:{os.environ.get('MINIO_PORT', '9000')}"
        storage = Minio(endpoint, access_key=os.environ["MINIO_ACCESS_KEY"],
                        secret_key=os.environ["MINIO_SECRET_KEY"],
                        secure=os.environ.get("MINIO_SECURE", "false").lower() == "true")
        originals = OriginalImageStorage(storage)
        pipeline = MediaPipeline(repository, MediaOriginalProcessor(repository, originals),
                                 PrivateVariantStorage(storage))
        processor = LockedMediaProcessor(repository, pipeline)
        run_worker(Redis.from_url(os.environ["REDIS_URL"]), processor)
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
