"""Recover image jobs from durable PostgreSQL state after Redis or Worker loss."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.media_processing_repository import require_migration_engine
from app.media_queue import MediaQueuePublisher


class MediaProcessReconciler:
    def __init__(self, engine: Engine, publisher: MediaQueuePublisher) -> None:
        self.engine = require_migration_engine(engine)
        self.publisher = publisher
        self.cursor: tuple[datetime, UUID] | None = None

    def sweep(self) -> tuple[UUID, ...]:
        """Inspect at most 100 rows; keyset pagination prevents a stuck row starving others."""
        created, media_id = self.cursor or (None, None)
        with self.engine.connect() as db:
            rows = db.execute(text(
                "SELECT id, created_at FROM media WHERE type = 'IMAGE' "
                "AND deletion_status = 'NONE' AND processing_status IN ('PENDING', 'PROCESSING') "
                "AND (CAST(:created AS timestamptz) IS NULL OR (created_at, id) > "
                "(CAST(:created AS timestamptz), CAST(:id AS uuid))) "
                "ORDER BY created_at, id LIMIT 100"
            ), {"created": created, "id": media_id}).mappings().all()
        if not rows:
            self.cursor = None
            return ()
        self.cursor = (rows[-1]["created_at"], rows[-1]["id"]) if len(rows) == 100 else None
        recovered = []
        for row in rows:
            if self._recover_one(row["id"]):
                recovered.append(row["id"])
        return tuple(recovered)

    def _recover_one(self, media_id: UUID) -> bool:
        with self.engine.connect() as db:
            locked = db.execute(text(
                "SELECT pg_try_advisory_lock(hashtext('MEDIA_PROCESS'), hashtext(:id))"
            ), {"id": str(media_id)}).scalar_one()
            if not locked:
                return False
            try:
                state = db.execute(text(
                    "SELECT processing_status FROM media WHERE id = :id AND type = 'IMAGE' "
                    "AND deletion_status = 'NONE'"
                ), {"id": media_id}).scalar_one_or_none()
                if state not in {"PENDING", "PROCESSING"}:
                    return False
                return self.publisher.recover_process_media(media_id).created
            finally:
                db.execute(text(
                    "SELECT pg_advisory_unlock(hashtext('MEDIA_PROCESS'), hashtext(:id))"
                ), {"id": str(media_id)})
