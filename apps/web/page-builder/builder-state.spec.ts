import { expect, it } from "vitest";
import { newBuilderBlock, parseBuilderBlocks, reorderBuilderBlocks } from "./builder-state";
const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
it("reorders positions preserving IDs/data and rejecting invalid moves", () => {
  const text = newBuilderBlock("TEXT", "PAGE", [], id)!;
  const hero = newBuilderBlock("HERO", "PAGE", [text], other)!;
  const input = [
    { ...text, position: 5 },
    { ...hero, position: 9 },
  ];
  const next = reorderBuilderBlocks(input, "PAGE", id, 1)!;
  expect(next.map((b) => [b.id, b.position])).toEqual([
    [other, 0],
    [id, 1],
  ]);
  expect(next[0]!.data).toEqual(hero.data);
  expect(next[1]!.data).toEqual(text.data);
  expect(input.map((b) => b.position)).toEqual([5, 9]);
  for (const index of [-1, 2, 0.5, NaN])
    expect(reorderBuilderBlocks(input, "PAGE", id, index)).toBeUndefined();
  expect(reorderBuilderBlocks(input, "PAGE", "missing", 1)).toBeUndefined();
  expect(reorderBuilderBlocks(input, "PAGE", id, 0)).toBeUndefined();
  expect(reorderBuilderBlocks(input, "ARTICLE", id, 1)).toBeUndefined();
});
it("adds only complete versioned blocks in their allowed context with cumulative positions", () => {
  const text = newBuilderBlock("TEXT", "PAGE", [], id)!;
  const hero = newBuilderBlock("HERO", "PAGE", [text], other)!;
  expect(text).toMatchObject({
    type: "TEXT",
    position: 0,
    isVisible: true,
    schemaVersion: 1,
    background: "DEFAULT",
  });
  expect(hero.position).toBe(1);
  expect(newBuilderBlock("HERO", "ARTICLE", [], id)).toBeUndefined();
  expect(newBuilderBlock("IMAGE", "ARTICLE", [], id, other)?.data).toEqual({
    imageId: other,
    decorative: false,
  });
  expect(newBuilderBlock("IMAGE", "PAGE", [], id)).toBeUndefined();
});
it("refuses duplicate IDs/positions, unsupported schemas, invalid context/data and position overflow without mutating input", () => {
  const text = newBuilderBlock("TEXT", "PAGE", [], id)!;
  const input = [text];
  expect(parseBuilderBlocks(input, "PAGE")).toEqual(input);
  expect(parseBuilderBlocks(input, "PAGE")?.[0]).not.toBe(text);
  for (const invalid of [
    null,
    [{ ...text, schemaVersion: 2 }],
    [{ ...text, type: "FAQ" }],
    [{ ...text, data: { html: "x" } }],
    [text, text],
    [text, { ...text, id: other }],
    [{ ...text, id: "bad" }],
  ])
    expect(parseBuilderBlocks(invalid, "PAGE")).toBeUndefined();
  expect(parseBuilderBlocks([], "BAD" as "PAGE")).toBeUndefined();
  expect(
    newBuilderBlock("TEXT", "PAGE", [{ ...text, position: 2147483647 }], other),
  ).toBeUndefined();
  expect(input).toEqual([text]);
});
