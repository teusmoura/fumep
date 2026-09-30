"""Complete isolated PROCESS_MEDIA contract, including real services when configured."""

import hashlib
import os
from datetime import datetime, timezone
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import urlsplit
from uuid import UUID, uuid4

import fakeredis
import pytest
from minio import Minio
from PIL import Image
from redis import Redis
from rq import Queue
from rq.job import Job

from app.media_metadata import MediaMetadata
from app.media_pipeline import MediaPipeline
from app.media_queue import MediaQueueConfig, MediaQueuePublisher, WORKER_FUNCTION
from app.media_variants import (
    PrivateVariantStorage,
    StoredVariant,
    render_variants,
    thumbnail_key,
    variant_widths,
)
from app.media_worker import (
    MediaOriginalProcessor,
    MediaProcessingError,
    _active_processor,
    process_media,
    run_worker,
)
from app.original_image_storage import PRIVATE_BUCKET, OriginalImageStorage


def image_bytes(width: int = 9, height: int = 6) -> bytes:
    image = Image.new("RGB", (width, height), "orange")
    output = BytesIO()
    image.save(output, format="PNG")
    image.close()
    return output.getvalue()


def metadata(media_id: UUID, content: bytes, key: str) -> MediaMetadata:
    return MediaMetadata(
        id=media_id,
        type="IMAGE",
        original_filename="original.png",
        stored_filename=key.rsplit("/", 1)[-1],
        mime_type="image/png",
        size_bytes=len(content),
        storage_key=key,
        checksum_sha256=hashlib.sha256(content).hexdigest(),
        processing_status="PENDING",
        created_at=datetime.now(timezone.utc),
    )


class MemoryRepository:
    def __init__(self, media: MediaMetadata) -> None:
        self.media = media
        self.variants: dict[str, StoredVariant] = {}
        self.events: list[str] = []
        self.thumbnail_storage_key: str | None = None
        self.fail_upsert = False

    def get(self, media_id: UUID) -> MediaMetadata | None:
        return self.media if self.media.id == media_id else None

    def claim(self, media_id: UUID) -> bool:
        if self.media.id != media_id or self.media.processing_status not in {"PENDING", "PROCESSING"}:
            return False
        self.media = self.media.model_copy(update={"processing_status": "PROCESSING"})
        self.events.append("PROCESSING")
        return True

    def upsert_variant(self, variant: StoredVariant) -> None:
        if self.fail_upsert:
            raise RuntimeError("repository unavailable")
        self.variants[variant.storage_key] = variant

    def mark_ready(
        self,
        media_id: UUID,
        width: int,
        height: int,
        expected_keys: tuple[str, ...],
        thumbnail_storage_key: str,
    ) -> None:
        assert self.media.id == media_id
        assert self.media.processing_status == "PROCESSING"
        assert all(key in self.variants for key in expected_keys)
        assert thumbnail_storage_key in self.variants
        assert self.variants[thumbnail_storage_key].format == "WEBP"
        self.thumbnail_storage_key = thumbnail_storage_key
        self.media = self.media.model_copy(
            update={"processing_status": "READY", "width": width, "height": height}
        )
        self.events.append("READY")

    def mark_failed(self, media_id: UUID, error_code: str) -> None:
        assert self.media.id == media_id
        if self.media.processing_status != "READY":
            self.media = self.media.model_copy(
                update={"processing_status": "FAILED", "processing_error": error_code}
            )
            self.events.append("FAILED")


class MemoryOriginalStorage:
    def __init__(self, content: bytes) -> None:
        self.content = content
        self.reads = 0

    def read(self, key: str) -> bytes:
        self.reads += 1
        return self.content


class MemoryVariantStorage:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.writes = 0
        self.calls = 0
        self.fail_on_call: int | None = None

    def put(self, media_id: UUID, variant) -> StoredVariant:
        self.calls += 1
        if self.calls == self.fail_on_call:
            raise RuntimeError("variant storage unavailable")
        key = f"images/variants/{media_id}-{variant.width}.{variant.format.lower()}"
        if key not in self.objects:
            self.objects[key] = variant.content
            self.writes += 1
        return StoredVariant(
            media_id=media_id,
            format=variant.format,
            width=variant.width,
            height=variant.height,
            size_bytes=len(variant.content),
            storage_key=key,
            checksum_sha256=variant.checksum_sha256,
        )


def setup_pipeline(width: int = 9):
    content = image_bytes(width, 6)
    media_id = uuid4()
    key = f"images/originals/{uuid4().hex}.png"
    repo = MemoryRepository(metadata(media_id, content, key))
    original = MemoryOriginalStorage(content)
    variants = MemoryVariantStorage()
    inspector = MediaOriginalProcessor(repo, original)  # type: ignore[arg-type]
    pipeline = MediaPipeline(repo, inspector, variants)  # type: ignore[arg-type]
    return media_id, repo, original, variants, pipeline


def test_width_policy_and_small_image_derivatives() -> None:
    assert variant_widths(900) == (320, 640, 900)
    assert variant_widths(2) == (2,)
    assert variant_widths(2400) == (320, 640, 960, 1280, 1920)
    assert thumbnail_key(UUID(int=1), 900).endswith("-320.webp")
    content = image_bytes(9, 6)
    rendered = list(render_variants(content, 9, 6))
    assert [(item.format, item.width) for item in rendered] == [("WEBP", 9), ("AVIF", 9)]
    for item in rendered:
        with Image.open(BytesIO(item.content)) as image:
            image.load()
            assert image.size == (9, 6)
            assert image.format == item.format
        assert item.checksum_sha256 == hashlib.sha256(item.content).hexdigest()


@pytest.mark.parametrize("source_format", ["JPEG", "PNG", "WEBP", "AVIF"])
def test_renderer_accepts_all_editorial_image_formats(source_format: str) -> None:
    source = Image.new("RGB", (3, 2), "green")
    output = BytesIO()
    source.save(output, format=source_format)
    source.close()
    derivatives = list(render_variants(output.getvalue(), 3, 2))
    assert [(item.format, item.width, item.height) for item in derivatives] == [
        ("WEBP", 3, 2),
        ("AVIF", 3, 2),
    ]


def test_pipeline_reaches_ready_only_after_all_variants_and_repeats_without_writes() -> None:
    media_id, repo, original, variants, pipeline = setup_pipeline(900)
    result = pipeline.process(media_id)
    assert result.width == 900 and result.height == 6
    assert repo.media.processing_status == "READY"
    assert repo.events[0] == "PROCESSING" and repo.events[-1] == "READY"
    assert len(repo.variants) == 6
    assert repo.thumbnail_storage_key == thumbnail_key(media_id, 900)
    assert variants.writes == 6
    before = original.content
    assert pipeline.process(media_id) == result
    assert variants.writes == 6 and original.reads == 1 and original.content == before


def test_partial_storage_failure_preserves_original_and_valid_derivatives_for_retry() -> None:
    media_id, repo, original, variants, pipeline = setup_pipeline(900)
    variants.fail_on_call = 3
    with pytest.raises(RuntimeError, match="variant storage unavailable"):
        pipeline.process(media_id)
    assert repo.media.processing_status == "PROCESSING"
    assert len(repo.variants) == 2 and variants.writes == 2
    before = original.content
    variants.fail_on_call = None
    pipeline.process(media_id)
    assert repo.media.processing_status == "READY"
    assert len(repo.variants) == 6 and variants.writes == 6
    assert original.content == before


def test_failed_metadata_upsert_is_recoverable_without_duplicate_objects() -> None:
    media_id, repo, _, variants, pipeline = setup_pipeline()
    repo.fail_upsert = True
    with pytest.raises(RuntimeError, match="repository unavailable"):
        pipeline.process(media_id)
    assert len(variants.objects) == 1 and repo.variants == {}
    repo.fail_upsert = False
    pipeline.process(media_id)
    assert len(variants.objects) == 2 and variants.writes == 2
    assert repo.media.processing_status == "READY"


def test_terminal_worker_failure_marks_failed_with_safe_code() -> None:
    media_id, repo, _, variants, pipeline = setup_pipeline()
    variants.fail_on_call = 1
    server = fakeredis.FakeServer()
    client = fakeredis.FakeRedis(server=server)
    queue = Queue("fumep:media", connection=client, serializer="json")
    job = queue.enqueue_call(func=WORKER_FUNCTION, kwargs={"media_id": str(media_id)})
    run_worker(fakeredis.FakeRedis(server=server), pipeline, burst=True)  # type: ignore[arg-type]
    finished = Job.fetch(job.id, connection=client, serializer="json")
    assert finished.get_status(refresh=True) == "failed"
    assert repo.media.processing_status == "FAILED"
    assert repo.media.processing_error == "MEDIA_PROCESSING_FAILED"
    assert "variant storage unavailable" not in (finished.latest_result().exc_string or "")
    client.close()


def test_intermediate_retry_stays_processing_until_attempts_exhaust() -> None:
    media_id, repo, _, variants, pipeline = setup_pipeline()
    variants.fail_on_call = 1
    token = _active_processor.set(pipeline)
    try:
        with patch("app.media_worker.get_current_job", return_value=SimpleNamespace(retries_left=2)):
            with pytest.raises(MediaProcessingError, match="MEDIA_INSPECTION_FAILED"):
                process_media(str(media_id))
        assert repo.media.processing_status == "PROCESSING"
        variants.fail_on_call = variants.calls + 1
        with patch("app.media_worker.get_current_job", return_value=SimpleNamespace(retries_left=0)):
            with pytest.raises(MediaProcessingError, match="MEDIA_INSPECTION_FAILED"):
                process_media(str(media_id))
        assert repo.media.processing_status == "FAILED"
        assert repo.media.processing_error == "MEDIA_PROCESSING_FAILED"
    finally:
        _active_processor.reset(token)


def test_real_redis_minio_pipeline_when_configured() -> None:
    redis_url = os.getenv("FUMEP_REDIS_TEST_URL")
    endpoint = os.getenv("FUMEP_MINIO_TEST_ENDPOINT")
    access = os.getenv("FUMEP_MINIO_TEST_ACCESS_KEY")
    secret = os.getenv("FUMEP_MINIO_TEST_SECRET_KEY")
    if not all((redis_url, endpoint, access, secret)):
        pytest.skip("Set loopback Redis DB 15 and MinIO test credentials")
    parsed = urlsplit(redis_url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"} or parsed.path != "/15":
        pytest.fail("Pipeline integration accepts only loopback Redis DB 15")
    redis_client = Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
    minio = Minio(
        endpoint=endpoint,
        access_key=access,
        secret_key=secret,
        secure=os.getenv("FUMEP_MINIO_TEST_SECURE", "false") == "true",
    )
    assert minio.bucket_exists(PRIVATE_BUCKET)
    originals = OriginalImageStorage(minio)
    content = image_bytes(900, 600)
    saved = originals.put_image(
        original_filename="original.png", declared_mime="image/png", content=content
    )
    media_id = uuid4()
    repo = MemoryRepository(metadata(media_id, content, saved.storage_key))
    config = MediaQueueConfig(queue_name=f"fumep:media:test:{uuid4().hex}")
    publisher = MediaQueuePublisher(redis_client, config)
    try:
        job_id = publisher.enqueue_process_media(media_id).job_id
        worker_redis = Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
        pipeline = MediaPipeline(repo, MediaOriginalProcessor(repo, originals), PrivateVariantStorage(minio))
        run_worker(worker_redis, pipeline, config=config, burst=True)
        job = Job.fetch(job_id, connection=redis_client, serializer="json")
        assert job.get_status(refresh=True) == "finished"
        assert repo.media.processing_status == "READY"
        assert len(repo.variants) == 6
        assert repo.thumbnail_storage_key == thumbnail_key(media_id, 900)
        assert originals.read(saved.storage_key) == content
        for variant in repo.variants.values():
            response = minio.get_object(PRIVATE_BUCKET, variant.storage_key)
            try:
                blob = response.read()
            finally:
                response.close()
                response.release_conn()
            assert hashlib.sha256(blob).hexdigest() == variant.checksum_sha256
            with Image.open(BytesIO(blob)) as image:
                image.load()
                assert image.size == (variant.width, variant.height)
        assert not publisher.enqueue_process_media(media_id).created
        assert pipeline.process(media_id).width == 900
        repo.media = repo.media.model_copy(update={"processing_status": "PROCESSING"})
        with patch.object(minio, "put_object", wraps=minio.put_object) as put:
            assert pipeline.process(media_id).width == 900
            put.assert_not_called()
        assert repo.media.processing_status == "READY"
    finally:
        publisher._queue.delete(delete_jobs=True)
        publisher.close()
        for variant in repo.variants.values():
            minio.remove_object(PRIVATE_BUCKET, variant.storage_key)
        minio.remove_object(PRIVATE_BUCKET, saved.storage_key)
