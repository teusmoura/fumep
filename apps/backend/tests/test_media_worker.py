"""Isolated processing tests; real Redis/MinIO path is opt-in."""

import hashlib
import os
import zlib
from datetime import datetime, timezone
from io import BytesIO
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
from app.media_queue import MediaQueueConfig, MediaQueuePublisher, WORKER_FUNCTION
from app.media_worker import (
    InvalidMediaOriginalError,
    MediaOriginalProcessor,
    run_worker,
)
from app.original_image_storage import PRIVATE_BUCKET, OriginalImageStorage


def sample_image(image_format: str, *, rotate: bool = False) -> bytes:
    image = Image.new("RGB", (3, 2), "navy")
    output = BytesIO()
    options = {}
    if rotate:
        exif = Image.Exif()
        exif[274] = 6
        options["exif"] = exif
    image.save(output, format=image_format, **options)
    image.close()
    return output.getvalue()


def metadata(media_id: UUID, content: bytes, mime: str, key: str) -> MediaMetadata:
    extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif"}[mime]
    return MediaMetadata(
        id=media_id,
        type="IMAGE",
        original_filename=f"original.{extension}",
        stored_filename=key.rsplit("/", 1)[-1],
        mime_type=mime,
        size_bytes=len(content),
        storage_key=key,
        checksum_sha256=hashlib.sha256(content).hexdigest(),
        processing_status="PENDING",
        created_at=datetime.now(timezone.utc),
    )


class MemoryReader:
    def __init__(self, media: MediaMetadata | None) -> None:
        self.media = media
        self.lookups: list[UUID] = []

    def get(self, media_id: UUID) -> MediaMetadata | None:
        self.lookups.append(media_id)
        return self.media


class MemoryStorage:
    def __init__(self, content: bytes) -> None:
        self.content = content
        self.reads: list[str] = []
        self.fail = False

    def read(self, key: str) -> bytes:
        self.reads.append(key)
        if self.fail:
            raise RuntimeError("storage secret detail")
        return self.content


class InspectionOnlyService:
    """Legacy checkpoint fixture; the complete pipeline is tested separately."""

    def __init__(self, inspector: MediaOriginalProcessor) -> None:
        self.inspector = inspector

    def process(self, media_id: UUID):
        return self.inspector.inspect(media_id)

    def mark_failed(self, media_id: UUID) -> None:
        pass


def setup(image_format: str = "PNG", *, rotate: bool = False):
    mime = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp", "AVIF": "image/avif"}[image_format]
    content = sample_image(image_format, rotate=rotate)
    media_id = uuid4()
    key = f"images/originals/{uuid4().hex}.{mime.rsplit('/', 1)[-1].replace('jpeg', 'jpg')}"
    media = metadata(media_id, content, mime, key)
    reader = MemoryReader(media)
    storage = MemoryStorage(content)
    processor = MediaOriginalProcessor(reader, storage)  # type: ignore[arg-type]
    return media_id, media, reader, storage, processor


@pytest.mark.parametrize("image_format", ["JPEG", "PNG", "WEBP", "AVIF"])
def test_valid_original_is_fully_decoded_without_mutation(image_format: str) -> None:
    media_id, media, reader, storage, processor = setup(image_format)
    first = processor.inspect(media_id)
    second = processor.inspect(media_id)
    assert (first.width, first.height) == (3, 2)
    assert second == first
    assert reader.lookups == [media_id, media_id]
    assert storage.reads == [media.storage_key, media.storage_key]
    assert hashlib.sha256(storage.content).hexdigest() == media.checksum_sha256


def test_exif_orientation_changes_reported_dimensions() -> None:
    media_id, _, _, _, processor = setup("JPEG", rotate=True)
    inspected = processor.inspect(media_id)
    assert (inspected.width, inspected.height) == (2, 3)


@pytest.mark.parametrize("state", ["missing", "document", "deleting", "ready"])
def test_ineligible_media_never_reads_storage(state: str) -> None:
    media_id, media, reader, storage, processor = setup()
    if state == "missing":
        reader.media = None
    elif state == "document":
        reader.media = media.model_copy(update={"type": "DOCUMENT"})
    elif state == "deleting":
        reader.media = media.model_copy(update={"deletion_status": "REQUESTED"})
    else:
        reader.media = media.model_copy(update={"processing_status": "READY"})
    with pytest.raises(InvalidMediaOriginalError, match="MEDIA_NOT_ELIGIBLE"):
        processor.inspect(media_id)
    assert storage.reads == []


def test_mismatched_size_checksum_and_truncated_decode_fail() -> None:
    media_id, media, reader, storage, processor = setup()
    reader.media = media.model_copy(update={"size_bytes": media.size_bytes + 1})
    with pytest.raises(InvalidMediaOriginalError, match="MEDIA_INTEGRITY_FAILED"):
        processor.inspect(media_id)
    reader.media = media.model_copy(update={"checksum_sha256": "0" * 64})
    with pytest.raises(InvalidMediaOriginalError, match="MEDIA_INTEGRITY_FAILED"):
        processor.inspect(media_id)
    storage.content = b"\xff\xd8\xff\xe0broken"
    reader.media = metadata(media_id, storage.content, "image/jpeg", media.storage_key)
    with pytest.raises(InvalidMediaOriginalError, match="MEDIA_DECODE_REJECTED"):
        processor.inspect(media_id)


def test_pixel_limit_rejects_before_full_decode() -> None:
    media_id, media, reader, storage, processor = setup()
    content = bytearray(storage.content)
    content[16:24] = (8_000).to_bytes(4, "big") + (6_000).to_bytes(4, "big")
    content[29:33] = (zlib.crc32(content[12:29]) & 0xFFFFFFFF).to_bytes(4, "big")
    storage.content = bytes(content)
    reader.media = metadata(media_id, storage.content, "image/png", media.storage_key)
    with pytest.raises(InvalidMediaOriginalError, match="MEDIA_DECODE_REJECTED"):
        processor.inspect(media_id)


def test_worker_receives_job_and_closes_redis_without_leaking_storage_error() -> None:
    media_id, _, _, storage, processor = setup()
    server = fakeredis.FakeServer()
    client = fakeredis.FakeRedis(server=server)
    publisher = MediaQueuePublisher(client)  # type: ignore[arg-type]
    job_id = publisher.enqueue_process_media(media_id).job_id
    worker_client = fakeredis.FakeRedis(server=server)
    with patch.object(worker_client, "close", wraps=worker_client.close) as close:
        run_worker(worker_client, InspectionOnlyService(processor), burst=True)  # type: ignore[arg-type]
        close.assert_called_once()
    job = Job.fetch(job_id, connection=client, serializer="json")
    assert job.get_status(refresh=True) == "finished"
    assert job.return_value() == {"media_id": str(media_id), "width": 3, "height": 2}
    assert storage.content
    publisher.close()


def test_invalid_payload_and_storage_failure_are_recorded_safely() -> None:
    media_id, _, _, storage, processor = setup()
    server = fakeredis.FakeServer()
    client = fakeredis.FakeRedis(server=server)
    queue = Queue("fumep:media", connection=client, serializer="json")
    invalid = queue.enqueue_call(func=WORKER_FUNCTION, kwargs={"media_id": "not-a-uuid"})
    storage.fail = True
    broken = queue.enqueue_call(func=WORKER_FUNCTION, kwargs={"media_id": str(media_id)})
    run_worker(fakeredis.FakeRedis(server=server), InspectionOnlyService(processor), burst=True)  # type: ignore[arg-type]
    for job_id in (invalid.id, broken.id):
        job = Job.fetch(job_id, connection=client, serializer="json")
        assert job.get_status(refresh=True) == "failed"
        result = job.latest_result()
        assert result is not None
        assert "MEDIA_INSPECTION_FAILED" in (result.exc_string or "")
        assert "storage secret detail" not in (result.exc_string or "")
    assert storage.reads
    client.close()


def test_real_redis_and_minio_when_configured() -> None:
    redis_url = os.getenv("FUMEP_REDIS_TEST_URL")
    endpoint = os.getenv("FUMEP_MINIO_TEST_ENDPOINT")
    access = os.getenv("FUMEP_MINIO_TEST_ACCESS_KEY")
    secret = os.getenv("FUMEP_MINIO_TEST_SECRET_KEY")
    if not all((redis_url, endpoint, access, secret)):
        pytest.skip("Set loopback Redis DB 15 and MinIO test credentials")
    parsed = urlsplit(redis_url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"} or parsed.path != "/15":
        pytest.fail("Worker integration accepts only loopback Redis DB 15")
    redis_client = Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
    minio_client = Minio(
        endpoint=endpoint,
        access_key=access,
        secret_key=secret,
        secure=os.getenv("FUMEP_MINIO_TEST_SECURE", "false") == "true",
    )
    assert minio_client.bucket_exists(PRIVATE_BUCKET)
    storage = OriginalImageStorage(minio_client)
    content = sample_image("PNG")
    saved = storage.put_image(
        original_filename="original.png", declared_mime="image/png", content=content
    )
    media_id = uuid4()
    reader = MemoryReader(metadata(media_id, content, "image/png", saved.storage_key))
    config = MediaQueueConfig(queue_name=f"fumep:media:test:{uuid4().hex}")
    publisher = MediaQueuePublisher(redis_client, config)
    try:
        job_id = publisher.enqueue_process_media(media_id).job_id
        worker_redis = Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
        run_worker(worker_redis, InspectionOnlyService(MediaOriginalProcessor(reader, storage)), config=config, burst=True)
        job = Job.fetch(job_id, connection=redis_client, serializer="json")
        assert job.get_status(refresh=True) == "finished"
        assert job.return_value() == {"media_id": str(media_id), "width": 3, "height": 2}
        assert storage.read(saved.storage_key) == content
    finally:
        publisher._queue.delete(delete_jobs=True)
        publisher.close()
        minio_client.remove_object(PRIVATE_BUCKET, saved.storage_key)
