import { describe, expect, it } from "vitest";
import {
  mediaUploadFieldsSchema,
  mediaDuplicateResponseSchema,
  mediaSelectionRequestSchema,
  mediaUploadResponseSchema,
  pdfUploadResponseSchema,
  PDF_MAX_BYTES,
} from "./index.js";
describe("media duplication contracts", () => {
  it("accepts READY PDF up to 30 MB without relaxing image upload contract", () => {
    const pdf = {
      id: crypto.randomUUID(),
      originalFilename: "matriz.pdf",
      mimeType: "application/pdf",
      sizeBytes: PDF_MAX_BYTES,
      categoryId: null,
      processingStatus: "READY",
    };
    expect(pdfUploadResponseSchema.safeParse(pdf).success).toBe(true);
    expect(mediaDuplicateResponseSchema.safeParse({ duplicate: true, existing: pdf }).success).toBe(
      true,
    );
    expect(
      pdfUploadResponseSchema.safeParse({ ...pdf, sizeBytes: PDF_MAX_BYTES + 1 }).success,
    ).toBe(false);
    expect(pdfUploadResponseSchema.safeParse({ ...pdf, processingStatus: "PENDING" }).success).toBe(
      false,
    );
    expect(pdfUploadResponseSchema.safeParse({ ...pdf, mimeType: "image/png" }).success).toBe(
      false,
    );
    expect(
      mediaUploadResponseSchema.safeParse({ ...pdf, processingStatus: "PENDING" }).success,
    ).toBe(false);
  });
  it("interprets explicit multipart true/false without truthy coercion", () => {
    expect(mediaUploadFieldsSchema.parse({ uploadAnyway: "true" }).uploadAnyway).toBe(true);
    expect(mediaUploadFieldsSchema.parse({ uploadAnyway: "false" }).uploadAnyway).toBe(false);
    expect(mediaUploadFieldsSchema.parse({}).uploadAnyway).toBeUndefined();
    for (const value of [true, "1", "", "TRUE"])
      expect(mediaUploadFieldsSchema.safeParse({ uploadAnyway: value }).success).toBe(false);
    expect(mediaUploadFieldsSchema.safeParse({ checksumSha256: "a".repeat(64) }).success).toBe(
      false,
    );
  });
  it("requires selection UUID and rejects additional ownership or internal duplicate fields", () => {
    const id = crypto.randomUUID();
    expect(mediaSelectionRequestSchema.parse({ id })).toEqual({ id });
    expect(mediaSelectionRequestSchema.safeParse({ id, institutionId: id }).success).toBe(false);
    const warning = {
      duplicate: true,
      existing: {
        id,
        originalFilename: "fixture.png",
        mimeType: "image/png",
        sizeBytes: 1,
        categoryId: id,
        processingStatus: "PENDING",
      },
    };
    expect(mediaDuplicateResponseSchema.safeParse(warning).success).toBe(true);
    expect(
      mediaDuplicateResponseSchema.safeParse({ ...warning, storageKey: "internal" }).success,
    ).toBe(false);
    expect(
      mediaDuplicateResponseSchema.safeParse({
        ...warning,
        existing: { ...warning.existing, uploadedBy: id },
      }).success,
    ).toBe(false);
  });
});
