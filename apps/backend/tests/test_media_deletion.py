"""Isolated usage/deletion contract; fixture is not PostgreSQL persistence."""

import os
import secrets
from io import BytesIO
from threading import RLock
from unittest.mock import patch
from urllib.parse import urlsplit
from uuid import UUID, uuid4

import fakeredis
import pytest
from minio import Minio
from redis import Redis
from rq.job import Job

from app.media_deletion import (
    DeletionPlan,
    MediaDeletionBlockedError,
    MediaDeletionService,
    PrivateMediaDeletionStorage,
)
from app.media_deletion_worker import run_deletion_worker
from app.media_queue import DELETE_WORKER_FUNCTION, MediaQueueConfig, MediaQueuePublisher
from app.original_image_storage import PRIVATE_BUCKET, OriginalImageStorage
from app.media_variants import render_variants
from app.authorization import AccessDeniedError, CurrentUserAccess
from app.sessions import SessionData

from test_media_pipeline import image_bytes


class MemoryDeletionRepository:
    def __init__(self, media_id: UUID, original_key: str, variant_keys: tuple[str, ...] = ()) -> None:
        self.lock = RLock()
        self.media_id = media_id
        self.original_key = original_key
        self.variant_keys = variant_keys
        self.exists = True
        self.status = "NONE"
        self.processing = "READY"
        self.usages: set[tuple[str, UUID]] = set()
        self.attempts = 0
        self.error_code: str | None = None
        self.events: list[str] = []
        self.fail_complete = False

    def link_usage(self, media_id: UUID, owner_type: str, owner_id: UUID) -> bool:
        with self.lock:
            if not self.exists or media_id != self.media_id or self.status != "NONE":
                return False
            self.usages.add((owner_type, owner_id))
            return True

    def unlink_usage(self, media_id: UUID, owner_type: str, owner_id: UUID) -> None:
        with self.lock:
            self.usages.discard((owner_type, owner_id))

    def request(self, media_id: UUID) -> str:
        with self.lock:
            if not self.exists or media_id != self.media_id:
                return "MISSING"
            if self.status == "FAILED":
                return "FAILED"
            if self.status == "REQUESTED":
                return "REQUESTED"
            if self.usages:
                self.events.append("MEDIA_DELETE_BLOCKED")
                return "USAGE_CONFLICT"
            if self.processing == "PROCESSING":
                self.events.append("MEDIA_DELETE_BLOCKED")
                return "PROCESSING_CONFLICT"
            self.status = "REQUESTED"
            self.events.append("MEDIA_DELETE_REQUESTED")
            return "REQUESTED"

    def retry_failed(self, media_id: UUID) -> str:
        with self.lock:
            if not self.exists or media_id != self.media_id:
                return "MISSING"
            if self.status != "FAILED":
                return "FAILED"
            if self.usages or self.processing == "PROCESSING":
                return "USAGE_CONFLICT" if self.usages else "PROCESSING_CONFLICT"
            self.status = "REQUESTED"
            self.attempts = 0
            self.error_code = None
            self.events.append("MEDIA_DELETE_RETRY_REQUESTED")
            return "REQUESTED"

    def reserve(self, media_id: UUID) -> DeletionPlan | None:
        with self.lock:
            if not self.exists or media_id != self.media_id or self.status != "REQUESTED":
                return None
            if self.usages or self.processing == "PROCESSING":
                self.fail(media_id, "USAGE_CONFLICT" if self.usages else "PROCESSING_CONFLICT")
                self.status = "FAILED"
                return None
            if self.attempts >= 3:
                self.status = "FAILED"
                self.error_code = "RETRY_EXHAUSTED"
                self.events.append("MEDIA_DELETE_FAILED")
                return None
            self.attempts += 1
            self.events.append("ATTEMPT_RESERVED")
            return DeletionPlan(media_id, self.original_key, self.variant_keys, self.attempts)

    def complete(self, media_id: UUID) -> None:
        with self.lock:
            if self.fail_complete:
                raise RuntimeError("database unavailable")
            if not self.exists or media_id != self.media_id or self.status != "REQUESTED" or self.usages:
                raise RuntimeError("Deletion invariant changed")
            self.exists = False
            self.events.append("MEDIA_DELETED")

    def fail(self, media_id: UUID, error_code: str) -> None:
        with self.lock:
            if not self.exists or self.status != "REQUESTED":
                return
            self.error_code = error_code
            if self.attempts >= 3:
                self.status = "FAILED"
                self.events.append("MEDIA_DELETE_FAILED")

    def requested_ids(self) -> tuple[UUID, ...]:
        return (self.media_id,) if self.exists and self.status == "REQUESTED" else ()


class MemoryPublisher:
    def __init__(self) -> None:
        self.calls: list[UUID] = []
        self.fail = False

    def enqueue_delete_media(self, media_id: UUID) -> None:
        if self.fail:
            raise RuntimeError("Redis unavailable SECRET")
        self.calls.append(media_id)


class MemoryStorage:
    def __init__(self, keys: tuple[str, ...]) -> None:
        self.objects = set(keys)
        self.removed: list[str] = []
        self.fail_after = -1

    def remove(self, plan: DeletionPlan) -> None:
        for key in (*dict.fromkeys(plan.variant_keys), plan.original_key):
            if len(self.removed) == self.fail_after:
                raise RuntimeError("MinIO unavailable SECRET")
            self.objects.discard(key)
            self.removed.append(key)


def setup_service():
    media_id = uuid4()
    original = f"images/originals/{uuid4().hex}.png"
    variants = (f"images/variants/{media_id}-320.webp", f"images/variants/{media_id}-320.avif")
    repo = MemoryDeletionRepository(media_id, original, variants)
    publisher = MemoryPublisher()
    storage = MemoryStorage((*variants, original))
    service = MediaDeletionService(repo, publisher, storage)  # type: ignore[arg-type]
    return media_id, repo, publisher, storage, service


def access(role: str = "ADMIN"):
    user_id = uuid4()
    session = SessionData(
        user_id=user_id,
        role=role,
        institution_ids=[],
        csrf_token=secrets.token_urlsafe(32),
        created_at=1,
        last_activity_at=1,
        absolute_expires_at=10,
    )
    current = CurrentUserAccess(user_id, role, True, frozenset())
    return session, current


def test_usage_blocks_deletion_then_unlink_allows_intention_and_rejects_new_usage() -> None:
    media_id, repo, publisher, storage, service = setup_service()
    owner_id = uuid4()
    service.link_usage(media_id, "PAGE", owner_id)
    with pytest.raises(MediaDeletionBlockedError, match="USAGE_CONFLICT"):
        service.request(media_id)
    assert repo.status == "NONE" and storage.objects and publisher.calls == []
    service.unlink_usage(media_id, "PAGE", owner_id)
    assert service.request(media_id).queued
    assert repo.status == "REQUESTED"
    with pytest.raises(MediaDeletionBlockedError, match="MEDIA_NOT_SELECTABLE"):
        service.link_usage(media_id, "ARTICLE", uuid4())
    assert len(repo.events) == 2
    assert len(publisher.calls) == 1


def test_processing_blocks_request_without_touching_storage() -> None:
    media_id, repo, publisher, storage, service = setup_service()
    repo.processing = "PROCESSING"
    with pytest.raises(MediaDeletionBlockedError, match="PROCESSING_CONFLICT"):
        service.request(media_id)
    assert repo.status == "NONE" and publisher.calls == [] and len(storage.objects) == 3


def test_enqueue_failure_keeps_intention_and_reconcile_replays() -> None:
    media_id, repo, publisher, _, service = setup_service()
    publisher.fail = True
    result = service.request(media_id)
    assert result.status == "REQUESTED" and not result.queued
    assert repo.status == "REQUESTED" and repo.attempts == 0
    publisher.fail = False
    assert service.reconcile() == (media_id,)
    assert service.request(media_id).queued
    assert repo.events == ["MEDIA_DELETE_REQUESTED"]


def test_partial_failure_retries_missing_objects_then_commits_metadata_once() -> None:
    media_id, repo, _, storage, service = setup_service()
    service.request(media_id)
    storage.fail_after = 1
    with pytest.raises(RuntimeError, match="MEDIA_DELETE_FAILED") as error:
        service.delete(media_id)
    assert "SECRET" not in str(error.value)
    assert repo.status == "REQUESTED" and repo.attempts == 1
    assert len(storage.objects) == 2 and repo.exists
    storage.fail_after = -1
    service.delete(media_id)
    service.delete(media_id)
    assert not repo.exists and not storage.objects
    assert repo.events.count("MEDIA_DELETED") == 1


def test_failed_final_commit_keeps_keys_for_repetition() -> None:
    media_id, repo, _, storage, service = setup_service()
    service.request(media_id)
    repo.fail_complete = True
    with pytest.raises(RuntimeError, match="MEDIA_DELETE_FAILED"):
        service.delete(media_id)
    assert repo.exists and repo.status == "REQUESTED" and len(storage.objects) == 0
    assert repo.original_key and repo.variant_keys
    repo.fail_complete = False
    service.delete(media_id)
    assert not repo.exists and repo.events.count("MEDIA_DELETED") == 1


def test_bounded_attempts_failed_state_and_explicit_new_cycle() -> None:
    media_id, repo, _, storage, service = setup_service()
    service.request(media_id)
    storage.fail_after = 0
    for attempt in range(3):
        with pytest.raises(RuntimeError, match="MEDIA_DELETE_FAILED"):
            service.delete(media_id)
        assert repo.attempts == attempt + 1
    assert repo.status == "FAILED" and repo.error_code == "STORAGE_UNAVAILABLE"
    assert len(storage.objects) == 3
    service.delete(media_id)
    with pytest.raises(MediaDeletionBlockedError, match="FAILED"):
        service.request(media_id)
    with pytest.raises(MediaDeletionBlockedError, match="MEDIA_NOT_SELECTABLE"):
        service.link_usage(media_id, "PAGE", uuid4())
    storage.fail_after = -1
    editor_session, editor_current = access("EDITOR")
    with pytest.raises(AccessDeniedError):
        service.retry_failed(editor_session, editor_current, media_id)
    admin_session, admin_current = access()
    assert service.retry_failed(admin_session, admin_current, media_id).queued
    assert repo.attempts == 0 and repo.status == "REQUESTED"
    service.delete(media_id)
    assert not repo.exists and repo.events.count("MEDIA_DELETED") == 1


def test_private_storage_rejects_foreign_key_before_removal() -> None:
    media_id, _, _, _, _ = setup_service()
    client = Minio("127.0.0.1:9000", access_key="unused", secret_key="unused")
    storage = PrivateMediaDeletionStorage(client)
    with patch.object(client, "remove_object") as remove:
        with pytest.raises(ValueError, match="Invalid variant key"):
            storage.remove(DeletionPlan(media_id, f"images/originals/{uuid4().hex}.png", (f"images/variants/{uuid4()}-320.webp",), 1))
        remove.assert_not_called()


def test_real_rq_job_contract_with_fakeredis() -> None:
    media_id, repo, _, storage, _ = setup_service()
    server = fakeredis.FakeServer()
    client = fakeredis.FakeRedis(server=server)
    publisher = MediaQueuePublisher(client)  # type: ignore[arg-type]
    service = MediaDeletionService(repo, publisher, storage)  # type: ignore[arg-type]
    try:
        result = service.request(media_id)
        job = Job.fetch(f"delete-media-{media_id}", connection=client, serializer="json")
        assert result.queued and job.func_name == DELETE_WORKER_FUNCTION
        assert job.kwargs == {"media_id": str(media_id)} and job.retries_left == 2
        assert not publisher.enqueue_delete_media(media_id).created
        run_deletion_worker(fakeredis.FakeRedis(server=server), service, burst=True)  # type: ignore[arg-type]
        assert job.get_status(refresh=True) == "finished"
        assert not repo.exists and not storage.objects
        assert publisher.enqueue_delete_media(media_id).created
    finally:
        publisher._queue.delete(delete_jobs=True)
        publisher.close()


def test_real_minio_cleanup_when_configured() -> None:
    endpoint = os.getenv("FUMEP_MINIO_TEST_ENDPOINT")
    access = os.getenv("FUMEP_MINIO_TEST_ACCESS_KEY")
    secret = os.getenv("FUMEP_MINIO_TEST_SECRET_KEY")
    if not all((endpoint, access, secret)):
        pytest.skip("Set loopback MinIO test credentials")
    if urlsplit(f"http://{endpoint}").hostname not in {"127.0.0.1", "localhost", "::1"}:
        pytest.fail("Deletion integration accepts only loopback MinIO")
    client = Minio(
        endpoint,
        access_key=access,
        secret_key=secret,
        secure=os.getenv("FUMEP_MINIO_TEST_SECURE", "false") == "true",
    )
    assert client.bucket_exists(PRIVATE_BUCKET)
    originals = OriginalImageStorage(client)
    saved = originals.put_image(original_filename="test.png", declared_mime="image/png", content=image_bytes())
    media_id = uuid4()
    variant_keys: list[str] = []
    for variant in render_variants(image_bytes(), 9, 6):
        key = f"images/variants/{media_id}-{variant.width}.{variant.format.lower()}"
        client.put_object(PRIVATE_BUCKET, key, BytesIO(variant.content), len(variant.content))
        variant_keys.append(key)
    repo = MemoryDeletionRepository(media_id, saved.storage_key, tuple(variant_keys))
    publisher = MemoryPublisher()
    service = MediaDeletionService(repo, publisher, PrivateMediaDeletionStorage(client))  # type: ignore[arg-type]
    try:
        assert service.request(media_id).queued
        service.delete(media_id)
        assert not repo.exists
        with pytest.raises(Exception):
            client.stat_object(PRIVATE_BUCKET, saved.storage_key)
        for key in variant_keys:
            with pytest.raises(Exception):
                client.stat_object(PRIVATE_BUCKET, key)
        PrivateMediaDeletionStorage(client).remove(
            DeletionPlan(media_id, saved.storage_key, tuple(variant_keys), 2)
        )
    finally:
        for key in variant_keys:
            client.remove_object(PRIVATE_BUCKET, key)
        client.remove_object(PRIVATE_BUCKET, saved.storage_key)
