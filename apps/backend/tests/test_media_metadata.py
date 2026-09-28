from datetime import datetime, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.media_metadata import MediaMetadata, to_public_metadata


def valid_media(**changes: object) -> MediaMetadata:
    data = {
        "id": uuid4(),
        "type": "IMAGE",
        "original_filename": "fachada.png",
        "stored_filename": "generated-id.png",
        "mime_type": "image/png",
        "size_bytes": 1024,
        "storage_key": "images/originals/generated-id.png",
        "checksum_sha256": "a" * 64,
        "width": 640,
        "height": 480,
        "alt_text": "Fachada da escola",
        "caption": "Entrada principal",
        "is_decorative": False,
        "processing_status": "READY",
        "processing_error": None,
        "deletion_status": "NONE",
        "category_id": uuid4(),
        "uploaded_by": uuid4(),
        "created_at": datetime(2026, 9, 28, tzinfo=timezone.utc),
    }
    data.update(changes)
    return MediaMetadata.model_validate(data)


def test_internal_metadata_accepts_canonical_fields() -> None:
    media = valid_media()
    assert media.type == "IMAGE"
    assert media.processing_status == "READY"
    assert media.storage_key.endswith("generated-id.png")


@pytest.mark.parametrize(
    "changes",
    [
        {"type": "EXECUTABLE"},
        {"processing_status": "UNKNOWN"},
        {"deletion_status": "DELETED"},
        {"size_bytes": -1},
        {"size_bytes": "1024"},
        {"size_bytes": True},
        {"width": 0},
        {"height": -1},
        {"checksum_sha256": "A" * 64},
        {"checksum_sha256": "a" * 63},
        {"storage_key": "../outside.png"},
        {"storage_key": "/absolute.png"},
        {"storage_key": "http://minio:9000/private.png"},
        {"storage_key": "images\\outside.png"},
        {"storage_key": "images/%2e%2e/outside.png"},
        {"storage_key": "images/file.png?token=secret"},
        {"original_filename": "../../secret.png"},
        {"stored_filename": "x/y.png"},
        {"stored_filename": "unsafe name.png"},
        {"stored_filename": "other.png"},
        {"created_at": datetime(2026, 9, 28)},
        {"unexpected": "field"},
    ],
)
def test_invalid_or_untrusted_metadata_is_rejected(changes: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        valid_media(**changes)


def test_public_projection_excludes_internal_storage_and_operational_data() -> None:
    media = valid_media()
    projected = to_public_metadata(media).model_dump(mode="json")
    assert projected == {
        "id": str(media.id),
        "type": "IMAGE",
        "mime_type": "image/png",
        "width": 640,
        "height": 480,
        "alt_text": "Fachada da escola",
        "caption": "Entrada principal",
        "is_decorative": False,
    }
    serialized = str(projected)
    for forbidden in ("storage_key", "checksum", "uploaded_by", "processing_error", "minio"):
        assert forbidden not in serialized


def test_decorative_public_projection_has_no_alt_text() -> None:
    media = valid_media(is_decorative=True, alt_text="should not be announced")
    assert to_public_metadata(media).alt_text is None


@pytest.mark.parametrize(
    "status,deletion",
    [
        ("PENDING", "NONE"),
        ("PROCESSING", "NONE"),
        ("FAILED", "NONE"),
        ("READY", "REQUESTED"),
        ("READY", "FAILED"),
    ],
)
def test_unready_or_deleting_media_has_no_public_projection(
    status: str, deletion: str
) -> None:
    media = valid_media(processing_status=status, deletion_status=deletion)
    with pytest.raises(ValueError, match="not publicly available"):
        to_public_metadata(media)
