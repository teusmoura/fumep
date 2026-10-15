"""Isolated RQ publisher; the Worker function is supplied in a later loop."""

from dataclasses import dataclass
import re
from uuid import UUID

from redis import Redis
from rq import Queue, Retry
from rq.exceptions import DuplicateJobError, NoSuchJobError
from rq.job import Job

QUEUE_NAME = "fumep:media"
WORKER_FUNCTION = "app.media_worker.process_media"
DELETE_WORKER_FUNCTION = "app.media_deletion_worker.delete_media"


@dataclass(frozen=True, slots=True)
class MediaQueueConfig:
    queue_name: str = QUEUE_NAME
    retry_delays_seconds: tuple[int, int] = (5, 30)
    success_ttl_seconds: int = 24 * 60 * 60
    failure_ttl_seconds: int = 7 * 24 * 60 * 60
    job_timeout_seconds: int = 5 * 60

    def __post_init__(self) -> None:
        if (
            not isinstance(self.queue_name, str)
            or re.fullmatch(r"fumep:media(?::[a-z0-9-]+)*", self.queue_name) is None
            or len(self.retry_delays_seconds) != 2
            or any(type(delay) is not int or delay <= 0 for delay in self.retry_delays_seconds)
            or self.retry_delays_seconds[1] <= self.retry_delays_seconds[0]
            or any(
                type(ttl) is not int or ttl <= 0
                for ttl in (
                    self.success_ttl_seconds,
                    self.failure_ttl_seconds,
                    self.job_timeout_seconds,
                )
            )
        ):
            raise ValueError("Invalid media queue configuration")


@dataclass(frozen=True, slots=True)
class EnqueueResult:
    job_id: str
    created: bool


class MediaQueuePublisher:
    def __init__(self, client: Redis, config: MediaQueueConfig | None = None) -> None:
        self._client = client
        self.config = config or MediaQueueConfig()
        self._queue = Queue(self.config.queue_name, connection=client, serializer="json")
        self._closed = False

    def enqueue_process_media(self, media_id: UUID) -> EnqueueResult:
        if self._closed:
            raise RuntimeError("Media queue publisher is closed")
        if not isinstance(media_id, UUID):
            raise ValueError("Invalid media ID")
        job_id = f"process-media-{media_id}"
        payload = {"media_id": str(media_id)}
        try:
            self._queue.enqueue_call(
                func=WORKER_FUNCTION,
                kwargs=payload,
                job_id=job_id,
                unique=True,
                retry=Retry(max=2, interval=self.config.retry_delays_seconds),
                result_ttl=self.config.success_ttl_seconds,
                failure_ttl=self.config.failure_ttl_seconds,
                timeout=self.config.job_timeout_seconds,
            )
        except DuplicateJobError:
            existing = Job.fetch(job_id, connection=self._client, serializer="json")
            if (
                existing.origin != self.config.queue_name
                or existing.func_name != WORKER_FUNCTION
                or existing.kwargs != payload
            ):
                raise
            return EnqueueResult(job_id=job_id, created=False)
        return EnqueueResult(job_id=job_id, created=True)

    def recover_process_media(self, media_id: UUID) -> EnqueueResult:
        """Recreate a lost or terminal job only after PostgreSQL says it is eligible."""
        if self._closed or not isinstance(media_id, UUID):
            raise ValueError("Invalid media reconciliation request")
        job_id = f"process-media-{media_id}"
        try:
            existing = Job.fetch(job_id, connection=self._client, serializer="json")
        except NoSuchJobError:
            # A stale queue entry without its job hash must not create a second entry.
            self._queue.remove(job_id)
            return self.enqueue_process_media(media_id)
        if (existing.origin != self.config.queue_name or existing.func_name != WORKER_FUNCTION
                or existing.kwargs != {"media_id": str(media_id)}):
            raise DuplicateJobError("Conflicting media job ID")
        if existing.get_status(refresh=True) in {"finished", "failed", "stopped", "canceled"}:
            existing.delete()
            return self.enqueue_process_media(media_id)
        return EnqueueResult(job_id=job_id, created=False)

    def enqueue_delete_media(self, media_id: UUID) -> EnqueueResult:
        if self._closed:
            raise RuntimeError("Media queue publisher is closed")
        if not isinstance(media_id, UUID):
            raise ValueError("Invalid media ID")
        job_id = f"delete-media-{media_id}"
        payload = {"media_id": str(media_id)}
        def publish() -> None:
            self._queue.enqueue_call(
                func=DELETE_WORKER_FUNCTION,
                kwargs=payload,
                job_id=job_id,
                unique=True,
                retry=Retry(max=2, interval=(1, 2)),
                result_ttl=self.config.success_ttl_seconds,
                failure_ttl=self.config.failure_ttl_seconds,
                timeout=self.config.job_timeout_seconds,
            )

        try:
            publish()
        except DuplicateJobError:
            existing = Job.fetch(job_id, connection=self._client, serializer="json")
            if (
                existing.origin != self.config.queue_name
                or existing.func_name != DELETE_WORKER_FUNCTION
                or existing.kwargs != payload
            ):
                raise
            if existing.get_status(refresh=True) in {"finished", "failed", "stopped", "canceled"}:
                # Recovery/new authorized cycle may reuse the deterministic ID.
                existing.delete()
                publish()
                return EnqueueResult(job_id=job_id, created=True)
            return EnqueueResult(job_id=job_id, created=False)
        return EnqueueResult(job_id=job_id, created=True)

    def close(self) -> None:
        if not self._closed:
            self._client.close()
            self._closed = True
