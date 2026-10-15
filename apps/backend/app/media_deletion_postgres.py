"""PostgreSQL-backed, bounded deletion of private media in the separate Worker."""

import logging

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.media_deletion import DeletionPlan, PrivateMediaDeletionStorage
from app.media_processing_repository import require_migration_engine


def _audit_failure(db: Session, media_id: UUID, user_id: UUID | None, code: str) -> None:
    db.execute(text(
        "UPDATE media SET deletion_status = 'FAILED', deletion_error_code = :code WHERE id = :id"
    ), {"id": media_id, "code": code})
    db.execute(text(
        "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) "
        "VALUES (:user_id, 'MEDIA_DELETE_FAILED', 'MEDIA', :id, "
        "jsonb_build_object('reason', CAST(:code AS text)))"
    ), {"user_id": user_id, "id": media_id, "code": code})


class PostgresMediaDeletionProcessor:
    def __init__(self, engine: Engine, storage: PrivateMediaDeletionStorage) -> None:
        self.engine = require_migration_engine(engine)
        self.storage = storage

    def delete(self, media_id: UUID) -> None:
        with self.engine.connect() as connection:
            locked = connection.execute(text(
                "SELECT pg_try_advisory_lock(hashtext('MEDIA_DELETE'), hashtext(:id))"
            ), {"id": str(media_id)}).scalar_one()
            if not locked:
                raise RuntimeError("Media deletion already active")
            try:
                if not self._reserve(media_id):
                    return
                try:
                    self._cleanup(media_id)
                except Exception:
                    logging.exception("Media deletion cleanup failed")
                    self._storage_failure(media_id)
                    raise RuntimeError("MEDIA_DELETE_FAILED") from None
            finally:
                connection.execute(text(
                    "SELECT pg_advisory_unlock(hashtext('MEDIA_DELETE'), hashtext(:id))"
                ), {"id": str(media_id)})

    def finalize_exhausted(self, media_id: UUID) -> None:
        """Called only while the shared MEDIA_DELETE advisory lock is held."""
        with Session(self.engine) as db:
            row = db.execute(text(
                "SELECT deletion_status, deletion_attempts, deletion_requested_by "
                "FROM media WHERE id = :id FOR UPDATE"
            ), {"id": media_id}).mappings().first()
            if row and row["deletion_status"] == "REQUESTED" and row["deletion_attempts"] >= 3:
                _audit_failure(db, media_id, row["deletion_requested_by"], "RETRY_EXHAUSTED")
                db.commit()

    def _reserve(self, media_id: UUID) -> bool:
        with Session(self.engine) as db:
            row = db.execute(text(
                "SELECT deletion_status, deletion_attempts, deletion_requested_by, processing_status "
                "FROM media WHERE id = :id FOR UPDATE"
            ), {"id": media_id}).mappings().first()
            if row is None or row["deletion_status"] != "REQUESTED":
                return False
            if row["deletion_attempts"] >= 3:
                _audit_failure(db, media_id, row["deletion_requested_by"], "RETRY_EXHAUSTED")
                db.commit()
                return False
            if row["processing_status"] == "PROCESSING":
                _audit_failure(db, media_id, row["deletion_requested_by"], "PROCESSING_CONFLICT")
                db.commit()
                return False
            if db.execute(text(
                "SELECT EXISTS (SELECT 1 FROM media_usages WHERE media_id = :id)"
            ), {"id": media_id}).scalar_one():
                _audit_failure(db, media_id, row["deletion_requested_by"], "USAGE_CONFLICT")
                db.commit()
                return False
            db.execute(text(
                "UPDATE media SET deletion_attempts = deletion_attempts + 1, "
                "deletion_last_attempt_at = now() WHERE id = :id"
            ), {"id": media_id})
            db.commit()
            return True

    def _cleanup(self, media_id: UUID) -> None:
        with Session(self.engine) as db:
            row = db.execute(text(
                "SELECT deletion_status, deletion_attempts, deletion_requested_by, "
                "processing_status, storage_key FROM media WHERE id = :id FOR UPDATE"
            ), {"id": media_id}).mappings().first()
            if row is None or row["deletion_status"] != "REQUESTED":
                return
            if row["processing_status"] == "PROCESSING":
                _audit_failure(db, media_id, row["deletion_requested_by"], "PROCESSING_CONFLICT")
                db.commit()
                return
            if db.execute(text(
                "SELECT EXISTS (SELECT 1 FROM media_usages WHERE media_id = :id)"
            ), {"id": media_id}).scalar_one():
                _audit_failure(db, media_id, row["deletion_requested_by"], "USAGE_CONFLICT")
                db.commit()
                return
            keys = tuple(db.execute(text(
                "SELECT storage_key FROM media_variants WHERE media_id = :id ORDER BY id"
            ), {"id": media_id}).scalars())
            self.storage.remove(DeletionPlan(media_id, row["storage_key"], keys,
                                             row["deletion_attempts"]))
            db.execute(text("DELETE FROM media WHERE id = :id"), {"id": media_id})
            db.execute(text(
                "INSERT INTO audit_logs (user_id, action, entity_type, entity_id) "
                "VALUES (:user_id, 'MEDIA_DELETED', 'MEDIA', :id)"
            ), {"user_id": row["deletion_requested_by"], "id": media_id})
            db.commit()

    def _storage_failure(self, media_id: UUID) -> None:
        with Session(self.engine) as db:
            row = db.execute(text(
                "SELECT deletion_status, deletion_attempts, deletion_requested_by "
                "FROM media WHERE id = :id FOR UPDATE"
            ), {"id": media_id}).mappings().first()
            if row is None or row["deletion_status"] != "REQUESTED":
                return
            if row["deletion_attempts"] >= 3:
                _audit_failure(db, media_id, row["deletion_requested_by"], "STORAGE_UNAVAILABLE")
            else:
                db.execute(text(
                    "UPDATE media SET deletion_error_code = 'STORAGE_UNAVAILABLE' WHERE id = :id"
                ), {"id": media_id})
            db.commit()
