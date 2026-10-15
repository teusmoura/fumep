"""PostgreSQL-backed processing state for the dedicated migration database."""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.media_metadata import MediaMetadata
from app.media_variants import StoredVariant


def require_migration_engine(engine: Engine) -> Engine:
    if engine.url.database != "portal_fumep_mig58_test" or engine.url.host not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("Media Worker requires the local migration test database")
    return engine


class PostgresMediaProcessingRepository:
    def __init__(self, engine: Engine) -> None:
        self.engine = require_migration_engine(engine)

    def get(self, media_id: UUID) -> MediaMetadata | None:
        with Session(self.engine) as db:
            row = db.execute(text(
                "SELECT id, type, original_filename, stored_filename, mime_type, size_bytes, "
                "storage_key, checksum_sha256, width, height, alt_text, caption, is_decorative, "
                "processing_status, processing_error, deletion_status, category_id, uploaded_by, created_at "
                "FROM media WHERE id = :id"
            ), {"id": media_id}).mappings().first()
            return MediaMetadata.model_validate(dict(row)) if row else None

    def claim(self, media_id: UUID) -> bool:
        with Session(self.engine) as db:
            claimed = db.execute(text(
                "UPDATE media SET processing_status = 'PROCESSING', processing_error = NULL "
                "WHERE id = :id AND type = 'IMAGE' AND deletion_status = 'NONE' "
                "AND processing_status IN ('PENDING', 'PROCESSING') RETURNING id"
            ), {"id": media_id}).scalar_one_or_none()
            db.commit()
            return claimed is not None

    def upsert_variant(self, variant: StoredVariant) -> None:
        with Session(self.engine) as db:
            stored = db.execute(text(
                "INSERT INTO media_variants (media_id, format, width, height, size_bytes, storage_key) "
                "SELECT :media_id, :format, :width, :height, :size_bytes, :storage_key "
                "FROM media WHERE id = :media_id AND processing_status = 'PROCESSING' "
                "AND deletion_status = 'NONE' "
                "ON CONFLICT (media_id, format, width) DO UPDATE SET "
                "height = EXCLUDED.height, size_bytes = EXCLUDED.size_bytes, storage_key = EXCLUDED.storage_key "
                "RETURNING id"
            ), {"media_id": variant.media_id, "format": variant.format,
                "width": variant.width, "height": variant.height,
                "size_bytes": variant.size_bytes, "storage_key": variant.storage_key}).scalar_one_or_none()
            if stored is None:
                raise RuntimeError("Media is not processable")
            db.commit()

    def mark_ready(self, media_id: UUID, width: int, height: int,
                   expected_keys: tuple[str, ...], thumbnail_storage_key: str) -> None:
        if not expected_keys or thumbnail_storage_key not in expected_keys or len(set(expected_keys)) != len(expected_keys):
            raise ValueError("Incomplete media variants")
        with Session(self.engine) as db:
            row = db.execute(text(
                "SELECT processing_status, deletion_status FROM media WHERE id = :id FOR UPDATE"
            ), {"id": media_id}).mappings().first()
            if row is None or row["processing_status"] != "PROCESSING" or row["deletion_status"] != "NONE":
                raise RuntimeError("Media is not processable")
            actual = {key for key in db.execute(text(
                "SELECT storage_key FROM media_variants WHERE media_id = :id"
            ), {"id": media_id}).scalars()}
            if actual != set(expected_keys):
                raise RuntimeError("Incomplete media variants")
            db.execute(text(
                "UPDATE media SET width = :width, height = :height, processing_status = 'READY', "
                "processing_error = NULL WHERE id = :id"
            ), {"width": width, "height": height, "id": media_id})
            db.commit()

    def mark_failed(self, media_id: UUID, error_code: str) -> None:
        if error_code != "MEDIA_PROCESSING_FAILED":
            raise ValueError("Invalid processing error code")
        with Session(self.engine) as db:
            failed = db.execute(text(
                "UPDATE media SET processing_status = 'FAILED', processing_error = :error_code "
                "WHERE id = :id AND processing_status = 'PROCESSING' AND deletion_status = 'NONE' "
                "RETURNING id"
            ), {"id": media_id, "error_code": error_code}).scalar_one_or_none()
            if failed is not None:
                db.execute(text(
                    "INSERT INTO audit_logs (action, entity_type, entity_id) "
                    "VALUES ('MEDIA_PROCESSING_FAILED', 'MEDIA', :id)"
                ), {"id": media_id})
            db.commit()


class LockedMediaProcessor:
    """Keep a session advisory lock across MinIO I/O and database commits."""

    def __init__(self, repository: PostgresMediaProcessingRepository, pipeline) -> None:
        self.repository = repository
        self.pipeline = pipeline

    def process(self, media_id: UUID):
        with self.repository.engine.connect() as connection:
            locked = connection.execute(text(
                "SELECT pg_try_advisory_lock(hashtext('MEDIA_PROCESS'), hashtext(:id))"
            ), {"id": str(media_id)}).scalar_one()
            if not locked:
                raise RuntimeError("Media processing already active")
            try:
                return self.pipeline.process(media_id)
            finally:
                connection.execute(text(
                    "SELECT pg_advisory_unlock(hashtext('MEDIA_PROCESS'), hashtext(:id))"
                ), {"id": str(media_id)})

    def mark_failed(self, media_id: UUID) -> None:
        self.pipeline.mark_failed(media_id)
