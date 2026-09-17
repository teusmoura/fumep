import { describe, expect, it } from "vitest";
import {
  mediaUploadFieldsSchema,
  mediaDuplicateResponseSchema,
  mediaSelectionRequestSchema,
  mediaUploadResponseSchema,
  pdfUploadResponseSchema,
  PDF_MAX_BYTES,
  updateMediaCategorySchema,
  mediaLibraryQuerySchema,
} from "./index.js";
describe("media duplication contracts", () => {
  it("validates bounded library queries and rejects extra ownership, duplicate and invalid pagination", () => {
    expect(mediaLibraryQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(
      mediaLibraryQuerySchema.parse({
        q: "  Laboratory  ",
        categoryId: "",
        page: "2",
        limit: "100",
      }),
    ).toMatchObject({ q: "Laboratory", page: 2, limit: 100 });
    for (const query of [
      { page: "0" },
      { page: "10001" },
      { page: "1e2" },
      { limit: "101" },
      { limit: ["1", "2"] },
      { q: "x".repeat(201) },
      { categoryId: "bad" },
      { institutionId: crypto.randomUUID() },
    ])
      expect(mediaLibraryQuerySchema.safeParse(query).success).toBe(false);
  });
  it("limits category editing to valid name/slug without institution transfer", () => {
    expect(
      updateMediaCategorySchema.parse({ name: "  Laboratórios  ", slug: "laboratorios" }),
    ).toEqual({ name: "Laboratórios", slug: "laboratorios" });
    for (const body of [
      { name: "", slug: "valid" },
      { name: "Valid", slug: "UPPER" },
      { name: "Valid", slug: "valid", institutionId: crypto.randomUUID() },
      { name: "Valid" },
    ])
      expect(updateMediaCategorySchema.safeParse(body).success).toBe(false);
  });
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
