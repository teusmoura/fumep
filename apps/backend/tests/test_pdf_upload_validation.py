import hashlib

import pytest

from app.pdf_upload_validation import MAX_PDF_BYTES, InvalidPdfUploadError, validate_pdf_upload


def minimal_pdf() -> bytes:
    document = bytearray(b"%PDF-1.7\n")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>",
    ]
    offsets = [0]
    for index, body in enumerate(objects, start=1):
        offsets.append(len(document))
        document.extend(f"{index} 0 obj\n".encode() + body + b"\nendobj\n")
    xref_start = len(document)
    document.extend(b"xref\n0 4\n0000000000 65535 f \n")
    for offset in offsets[1:]:
        document.extend(f"{offset:010d} 00000 n \n".encode())
    document.extend(
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n"
        + str(xref_start).encode()
        + b"\n%%EOF\n"
    )
    return bytes(document)


PDF = minimal_pdf()


@pytest.mark.parametrize("version", [b"1.0", b"1.7", b"2.0"])
def test_allowed_pdf_headers_have_sha256_of_original_bytes(version: bytes) -> None:
    content = b"%PDF-" + version + b"\n" + PDF[9:]
    result = validate_pdf_upload(
        original_filename="documento.PDF", declared_mime="application/pdf", content=content
    )
    assert result.size_bytes == len(content)
    assert result.checksum_sha256 == hashlib.sha256(content).hexdigest()
    assert result.original_filename == "documento.PDF"


@pytest.mark.parametrize(
    "filename,mime,content",
    [
        ("documento.svg", "application/pdf", PDF),
        ("documento.pdf.exe", "application/pdf", PDF),
        ("documento.pdf", "image/png", PDF),
        ("documento.pdf", "application/pdf", b"<svg/>"),
        ("documento.pdf", "application/pdf", b"%PDF-9.9\n"),
        ("documento.pdf", "application/pdf", b"%PDF-1.7x"),
        ("documento.pdf", "application/pdf", b"%PDF-1."),
        ("documento.pdf", "application/pdf", b""),
        (".pdf", "application/pdf", PDF),
        ("  .pdf", "application/pdf", PDF),
        ("../documento.pdf", "application/pdf", PDF),
        ("folder\\documento.pdf", "application/pdf", PDF),
        ("bad\x00.pdf", "application/pdf", PDF),
        ("bad\t.pdf", "application/pdf", PDF),
        ("bad\x7f.pdf", "application/pdf", PDF),
        ("a" * 252 + ".pdf", "application/pdf", PDF),
    ],
)
def test_bad_type_signature_or_filename_is_rejected(
    filename: str, mime: str, content: bytes
) -> None:
    with pytest.raises(InvalidPdfUploadError):
        validate_pdf_upload(original_filename=filename, declared_mime=mime, content=content)


def test_exact_thirty_mib_boundary_is_inclusive() -> None:
    maximum = PDF + b"\x00" * (MAX_PDF_BYTES - len(PDF))
    result = validate_pdf_upload(
        original_filename="documento.pdf", declared_mime="application/pdf", content=maximum
    )
    assert result.size_bytes == MAX_PDF_BYTES
    with pytest.raises(InvalidPdfUploadError):
        validate_pdf_upload(
            original_filename="documento.pdf",
            declared_mime="application/pdf",
            content=maximum + b"\x00",
        )
