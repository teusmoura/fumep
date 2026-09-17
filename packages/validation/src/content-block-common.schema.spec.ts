import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  blockRegistry,
  contentBlockBackgroundSchema,
  contentBlockCommonSchema,
  contentBlockTypeSchema,
} from "./index.js";
const base = () => ({
  id: crypto.randomUUID(),
  type: "TEXT",
  position: 0,
  isVisible: true,
  schemaVersion: 1,
  background: "DEFAULT",
});
describe("ContentBlock common V1 contract", () => {
  it("accepts explicit common fields, optional/null anchor and canonical identifiers without registering blocks", () => {
    expect(contentBlockCommonSchema.parse(base())).toMatchObject({ type: "TEXT", position: 0 });
    for (const type of contentBlockTypeSchema.options)
      expect(contentBlockCommonSchema.safeParse({ ...base(), type }).success).toBe(true);
    for (const anchor of [undefined, null, "documentos", "cursos-tecnicos", "123"])
      expect(contentBlockCommonSchema.safeParse({ ...base(), anchor }).success).toBe(true);
    expect(contentBlockTypeSchema.options).toHaveLength(23);
    expect(blockRegistry.list()).toEqual([]);
  });
  it("validates identity, position, explicit visibility and mandatory positive version without coercion", () => {
    for (const patch of [
      { id: "bad" },
      { type: "CUSTOM" },
      { type: "text" },
      { position: -1 },
      { position: 0.5 },
      { position: "0" },
      { position: 2147483648 },
      { isVisible: "false" },
      { isVisible: undefined },
      { schemaVersion: undefined },
      { schemaVersion: 0 },
      { schemaVersion: 1.5 },
      { schemaVersion: "1" },
      { schemaVersion: 2147483648 },
      { background: undefined },
    ])
      expect(contentBlockCommonSchema.safeParse({ ...base(), ...patch }).success).toBe(false);
    expect(
      contentBlockCommonSchema.safeParse({
        ...base(),
        isVisible: false,
        position: 2147483647,
        schemaVersion: 2147483647,
      }).success,
    ).toBe(true);
  });
  it("permits controlled backgrounds and requires a library UUID for IMAGE", () => {
    const id = crypto.randomUUID();
    for (const background of contentBlockBackgroundSchema.options)
      expect(
        contentBlockCommonSchema.safeParse({
          ...base(),
          background,
          ...(background === "IMAGE" ? { backgroundMediaId: id } : {}),
        }).success,
      ).toBe(true);
    for (const backgroundMediaId of [undefined, null, "http://minio:9000/logo.png", "bad"]) {
      const result = contentBlockCommonSchema.safeParse({
        ...base(),
        background: "IMAGE",
        backgroundMediaId,
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.some((issue) => issue.path[0] === "backgroundMediaId")).toBe(
          true,
        );
    }
    for (const background of ["#ff0000", "url(javascript:alert(1))", "CUSTOM", "image"])
      expect(contentBlockCommonSchema.safeParse({ ...base(), background }).success).toBe(false);
  });
  it("refuses unsafe/non-slug/oversized anchors and arbitrary CSS/grid/layout fields", () => {
    for (const anchor of [
      "",
      "Documentos",
      "com espaço",
      "javascript:alert(1)",
      "../documentos",
      "#documentos",
      "<script>",
      "a".repeat(101),
    ])
      expect(contentBlockCommonSchema.safeParse({ ...base(), anchor }).success).toBe(false);
    for (const field of ["css", "style", "grid", "padding", "backgroundUrl", "ownerId", "data"])
      expect(contentBlockCommonSchema.safeParse({ ...base(), [field]: "untrusted" }).success).toBe(
        false,
      );
  });
  it("is safely extensible for later versioned schemas while retaining common refinements/strictness", () => {
    const synthetic = contentBlockCommonSchema.safeExtend({
      data: z.object({ fixture: z.literal(true) }).strict(),
    });
    expect(synthetic.safeParse({ ...base(), data: { fixture: true } }).success).toBe(true);
    expect(
      synthetic.safeParse({ ...base(), background: "IMAGE", data: { fixture: true } }).success,
    ).toBe(false);
    expect(synthetic.safeParse({ ...base(), data: { fixture: true }, css: "free" }).success).toBe(
      false,
    );
    expect(blockRegistry.list()).toEqual([]);
  });
});
