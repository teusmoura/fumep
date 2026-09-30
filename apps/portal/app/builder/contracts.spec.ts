import { describe, expect, it } from "vitest";
import {
  blockSchema,
  createBlock,
  mediaFixture,
  moveBlock,
  normalizePositions,
  validatePage,
} from "./contracts";
import { demoBlocks } from "./demo";

describe("Page Builder demonstrativo", () => {
  it("validates the three versioned fixture blocks", () => {
    expect(demoBlocks.map((block) => blockSchema.safeParse(block).success)).toEqual([
      true,
      true,
      true,
    ]);
    expect(validatePage(demoBlocks)).toEqual([]);
  });

  it("adds, reorders and removes without invalid positions", () => {
    const blocks = [createBlock("TEXT", 0), createBlock("HERO", 1), createBlock("IMAGE", 2)];
    expect(validatePage(blocks)).toEqual([]);
    const moved = moveBlock(blocks, 2, 0);
    expect(moved.map((block) => block.type)).toEqual(["IMAGE", "TEXT", "HERO"]);
    expect(moved.map((block) => block.position)).toEqual([0, 1, 2]);
    expect(validatePage(normalizePositions(moved.slice(1)))).toEqual([]);
    expect(moveBlock(moved, -1, 0)).toBe(moved);
  });

  it("rejects raw HTML structure, arbitrary fields and invalid schema versions", () => {
    const block = createBlock("TEXT", 0);
    expect(blockSchema.safeParse({ ...block, schemaVersion: 2 }).success).toBe(false);
    expect(blockSchema.safeParse({ ...block, css: "display:grid" }).success).toBe(false);
    expect(
      blockSchema.safeParse({ ...block, data: { ...block.data, html: "<script>" } }).success,
    ).toBe(false);
  });

  it("requires contextual alt and safe internal links", () => {
    const hero = createBlock("HERO", 0);
    if (hero.type !== "HERO") throw new Error("Unexpected block");
    expect(validatePage([{ ...hero, data: { ...hero.data, imageAlt: "" } }])).not.toEqual([]);
    expect(
      validatePage([{ ...hero, data: { ...hero.data, decorative: true, imageAlt: "" } }]),
    ).toEqual([]);
    expect(
      validatePage([
        { ...hero, data: { ...hero.data, buttonLabel: "Abrir", buttonUrl: "javascript:alert(1)" } },
      ]),
    ).not.toEqual([]);
    const image = createBlock("IMAGE", 0);
    if (image.type !== "IMAGE") throw new Error("Unexpected block");
    expect(
      validatePage([{ ...image, data: { ...image.data, link: "//evil.example" } }]),
    ).not.toEqual([]);
    expect(
      validatePage([
        { ...image, data: { ...image.data, imageId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } },
      ]),
    ).not.toEqual([]);
    expect(mediaFixture).toHaveLength(2);
  });

  it("rejects duplicate anchors and IDs", () => {
    const a = createBlock("TEXT", 0);
    const b = createBlock("TEXT", 1);
    expect(
      validatePage([
        { ...a, anchor: "intro" },
        { ...b, anchor: "intro" },
      ]),
    ).toContain("Bloco 2: âncora duplicada.");
    expect(validatePage([a, { ...b, id: a.id }])).toContain("Bloco 2: ID duplicado.");
  });
});
