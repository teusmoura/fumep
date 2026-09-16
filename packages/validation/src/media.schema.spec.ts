import { describe, expect, it } from "vitest";
import {
  mediaUploadFieldsSchema,
  mediaDuplicateResponseSchema,
  mediaSelectionRequestSchema,
} from "./index.js";
describe("media duplication contracts", () => {
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
