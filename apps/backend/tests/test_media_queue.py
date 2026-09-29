"""Publisher contract; no Worker or database is started by these tests."""

import os
from unittest.mock import patch
from urllib.parse import urlsplit
from uuid import uuid4

import fakeredis
import pytest
from redis import Redis
from redis.exceptions import RedisError
from rq import Queue
from rq.exceptions import DuplicateJobError
from rq.job import Job

from app.media_queue import (
    QUEUE_NAME,
    WORKER_FUNCTION,
    MediaQueueConfig,
    MediaQueuePublisher,
)


def test_publish_has_minimal_json_payload_deterministic_id_and_bounded_retries() -> None:
    client = fakeredis.FakeRedis()
    publisher = MediaQueuePublisher(client)  # type: ignore[arg-type]
    media_id = uuid4()
    try:
        result = publisher.enqueue_process_media(media_id)
        job = Job.fetch(result.job_id, connection=client, serializer="json")
        assert result.created
        assert result.job_id == f"process-media-{media_id}"
        assert job.origin == QUEUE_NAME
        assert job.func_name == WORKER_FUNCTION
        assert job.args == []
        assert job.kwargs == {"media_id": str(media_id)}
        assert job.retries_left == 2
        assert job.retry_intervals == [5, 30]
        assert job.result_ttl == 86400
        assert job.failure_ttl == 604800
        assert job.timeout == 300
        assert publisher._queue.count == 1
    finally:
        publisher.close()


def test_repeat_is_deduplicated_and_other_media_is_independent() -> None:
    client = fakeredis.FakeRedis()
    publisher = MediaQueuePublisher(client)  # type: ignore[arg-type]
    try:
        media_id = uuid4()
        first = publisher.enqueue_process_media(media_id)
        repeated = publisher.enqueue_process_media(media_id)
        other = publisher.enqueue_process_media(uuid4())
        assert first.created and not repeated.created and other.created
        assert repeated.job_id == first.job_id != other.job_id
        assert publisher._queue.count == 2
    finally:
        publisher.close()


def test_invalid_input_and_configuration_do_not_publish() -> None:
    client = fakeredis.FakeRedis()
    publisher = MediaQueuePublisher(client)  # type: ignore[arg-type]
    try:
        with pytest.raises(ValueError, match="Invalid media ID"):
            publisher.enqueue_process_media("not-a-uuid")  # type: ignore[arg-type]
        assert publisher._queue.count == 0
    finally:
        publisher.close()
    with pytest.raises(ValueError, match="Invalid media queue configuration"):
        MediaQueueConfig(queue_name="rq:other")
    with pytest.raises(ValueError, match="Invalid media queue configuration"):
        MediaQueueConfig(retry_delays_seconds=(30, 5))
    with pytest.raises(ValueError, match="Invalid media queue configuration"):
        MediaQueueConfig(success_ttl_seconds=0)


def test_custom_retention_and_close_lifecycle() -> None:
    client = fakeredis.FakeRedis()
    config = MediaQueueConfig(success_ttl_seconds=90, failure_ttl_seconds=120)
    publisher = MediaQueuePublisher(client, config)  # type: ignore[arg-type]
    job_id = publisher.enqueue_process_media(uuid4()).job_id
    job = Job.fetch(job_id, connection=client, serializer="json")
    assert job.result_ttl == 90 and job.failure_ttl == 120
    with patch.object(client, "close", wraps=client.close) as close:
        publisher.close()
        publisher.close()
        close.assert_called_once()
    with pytest.raises(RuntimeError, match="closed"):
        publisher.enqueue_process_media(uuid4())


def test_foreign_job_id_collision_is_not_reported_as_success() -> None:
    client = fakeredis.FakeRedis()
    media_id = uuid4()
    job_id = f"process-media-{media_id}"
    foreign_queue = Queue("fumep:other", connection=client, serializer="json")
    foreign_queue.enqueue_call(
        func="app.other_job.run", job_id=job_id, unique=True, kwargs={"other": "value"}
    )
    publisher = MediaQueuePublisher(client)  # type: ignore[arg-type]
    try:
        with pytest.raises(DuplicateJobError):
            publisher.enqueue_process_media(media_id)
    finally:
        publisher.close()


def test_redis_failure_propagates_without_false_success() -> None:
    client = Redis(host="127.0.0.1", port=1, socket_connect_timeout=0.2)
    publisher = MediaQueuePublisher(client)
    try:
        with pytest.raises(RedisError):
            publisher.enqueue_process_media(uuid4())
    finally:
        publisher.close()


def test_real_redis_isolation_when_configured() -> None:
    url = os.getenv("FUMEP_REDIS_TEST_URL")
    if not url:
        pytest.skip("Set FUMEP_REDIS_TEST_URL to a loopback Redis DB 15")
    parsed = urlsplit(url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"} or parsed.path != "/15":
        pytest.fail("Real queue test accepts only loopback Redis DB 15")
    client = Redis.from_url(url, socket_connect_timeout=2, socket_timeout=2)
    config = MediaQueueConfig(queue_name=f"{QUEUE_NAME}:test:{uuid4().hex}")
    publisher = MediaQueuePublisher(client, config)
    try:
        assert client.ping()
        media_id = uuid4()
        first = publisher.enqueue_process_media(media_id)
        assert first.created
        assert not publisher.enqueue_process_media(media_id).created
        job = Job.fetch(first.job_id, connection=client, serializer="json")
        assert job.kwargs == {"media_id": str(media_id)}
        assert publisher._queue.count == 1
    finally:
        publisher._queue.delete(delete_jobs=True)
        publisher.close()
