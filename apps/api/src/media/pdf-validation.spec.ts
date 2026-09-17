import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { PDF_MAX_BYTES } from "@fumep/validation";
import { describe, expect, it } from "vitest";
import { validatePdf } from "./pdf-validation.js";
const signature = Buffer.from("%PDF-1.7\n");
function file(
  buffer = signature,
  originalname = "document.PDF",
  mimetype = "application/pdf",
  size = buffer.length,
) {
  return { buffer, originalname, mimetype, size } as Express.Multer.File;
}
describe("PDF extension/MIME/signature and 30 MB boundary", () => {
  it.each(["1.0", "1.7", "2.0"])("accepts matching PDF %s signature", (version) => {
    expect(validatePdf(file(Buffer.from(`%PDF-${version}\n`)))).toBe(".pdf");
  });
  it.each([
    file(signature, "document.svg"),
    file(signature, "document.pdf.exe"),
    file(signature, "document.pdf", "image/png"),
    file(Buffer.from("<svg/>")),
    file(Buffer.from("%PDF-9.9\n")),
    file(Buffer.from("%PDF-1.7x")),
    file(signature.subarray(0, 5)),
    file(Buffer.alloc(0)),
    file(signature, "a".repeat(256)),
    file(signature, "bad\u0000.pdf"),
  ])("rejects mismatched or missing signature/name/MIME", (input) => {
    expect(() => validatePdf(input)).toThrow(BadRequestException);
  });
  it("requires a file", () => expect(() => validatePdf()).toThrow(BadRequestException));
  it("accepts exact maximum and rejects actual or reported excess", () => {
    const maximum = Buffer.alloc(PDF_MAX_BYTES);
    signature.copy(maximum);
    expect(validatePdf(file(maximum))).toBe(".pdf");
    const excess = Buffer.alloc(PDF_MAX_BYTES + 1);
    signature.copy(excess);
    expect(() => validatePdf(file(excess))).toThrow(PayloadTooLargeException);
    expect(() =>
      validatePdf(file(signature, "a.pdf", "application/pdf", PDF_MAX_BYTES + 1)),
    ).toThrow(PayloadTooLargeException);
  });
});
