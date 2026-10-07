import { describe, expect, it } from "vitest";
import { newTextBlock, normalizeTextBlocks } from "./migration-pages";

describe("migration page text blocks", () => {
  it("creates independent versioned blocks for real draft requests", () => {
    const first = newTextBlock(0, "Título", "Corpo");
    const second = newTextBlock(1, "Outro", "Texto");
    expect(first.id).not.toBe(second.id);
    expect(first).toMatchObject({
      type: "TEXT",
      schemaVersion: 1,
      background: "DEFAULT",
      data: { title: "Título", body: "Corpo" },
    });
  });

  it("normalizes positions after removal without changing IDs", () => {
    const first = newTextBlock(0);
    const second = newTextBlock(1);
    expect(normalizeTextBlocks([second, first]).map(({ id, position }) => [id, position])).toEqual([
      [second.id, 0],
      [first.id, 1],
    ]);
  });
});
