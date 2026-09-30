"""RQ DELETE_MEDIA entrypoint in a separate Worker process."""

from contextvars import ContextVar
from typing import Protocol
from uuid import UUID

from redis import Redis
from rq import Queue, SimpleWorker

from .media_queue import MediaQueueConfig


class DeletionProcessor(Protocol):
    def delete(self, media_id: UUID) -> None: ...


_active_deletion_processor: ContextVar[DeletionProcessor | None] = ContextVar(
    "active_deletion_processor", default=None
)


def delete_media(media_id: str) -> None:
    processor = _active_deletion_processor.get()
    if processor is None:
        raise RuntimeError("MEDIA_DELETE_WORKER_NOT_CONFIGURED")
    try:
        parsed_id = UUID(media_id)
        if str(parsed_id) != media_id:
            raise ValueError("Non-canonical ID")
        processor.delete(parsed_id)
    except Exception:
        raise RuntimeError("MEDIA_DELETE_FAILED") from None


def run_deletion_worker(
    client: Redis,
    processor: DeletionProcessor,
    *,
    config: MediaQueueConfig | None = None,
    burst: bool = False,
) -> bool:
    token = _active_deletion_processor.set(processor)
    try:
        queue = Queue((config or MediaQueueConfig()).queue_name, connection=client, serializer="json")
        worker = SimpleWorker([queue], connection=client, serializer="json")
        return worker.work(burst=burst, with_scheduler=True, logging_level="WARNING")
    finally:
        _active_deletion_processor.reset(token)
        client.close()
