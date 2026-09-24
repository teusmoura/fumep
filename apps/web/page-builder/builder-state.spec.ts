import { expect, it } from "vitest";
import {
  newBuilderBlock,
  parseBuilderBlocks,
  reorderBuilderBlocks,
  duplicateBuilderBlock,
  setBuilderBlockVisibility,
  removeBuilderBlock,
  setBuilderBlockAnchor,
  setBuilderBlockBackground,
} from "./builder-state";
const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
it("sets controlled backgrounds only and clears unused image references", () => {
  const text = newBuilderBlock("TEXT", "PAGE", [], id)!;
  for (const background of ["DEFAULT", "LIGHT", "INSTITUTION"] as const)
    expect(setBuilderBlockBackground([text], "ARTICLE", id, background)).toEqual([
      { ...text, background, backgroundMediaId: null },
    ]);
  expect(setBuilderBlockBackground([text], "PAGE", id, "IMAGE", other)).toBeUndefined();
  expect(setBuilderBlockBackground([text], "PAGE", id, "RED" as "LIGHT")).toBeUndefined();
  const library = {
    id: other,
    type: "IMAGE",
    originalFilename: "fixture.png",
    mimeType: "image/png",
    sizeBytes: 1,
    categoryId: null,
    categoryName: null,
    processingStatus: "READY",
    altText: null,
    caption: null,
    width: 1,
    height: 1,
    createdAt: "2026-09-18T12:00:00.000Z",
  };
  const next = setBuilderBlockBackground([text], "PAGE", id, "IMAGE", other, [library])!;
  expect(next).toEqual([{ ...text, background: "IMAGE", backgroundMediaId: other }]);
  expect(setBuilderBlockBackground(next, "PAGE", id, "LIGHT")![0]!.backgroundMediaId).toBeNull();
  expect(text.backgroundMediaId).toBeUndefined();
  expect(
    setBuilderBlockBackground([text], "PAGE", id, "IMAGE", other, [
      { ...library, processingStatus: "PENDING" },
    ]),
  ).toBeUndefined();
});
it("validates optional slugs and uniqueness across the owner including hidden blocks", () => {
  const text = newBuilderBlock("TEXT", "PAGE", [], id)!;
  const hero = {
    ...newBuilderBlock("HERO", "PAGE", [text], other)!,
    anchor: "documentos",
    isVisible: false,
  };
  const input = [text, hero];
  const next = setBuilderBlockAnchor(input, "PAGE", id, "cursos-tecnicos")!;
  expect(next).toEqual([{ ...text, anchor: "cursos-tecnicos" }, hero]);
  expect(text.anchor).toBeUndefined();
  expect(setBuilderBlockAnchor(next, "PAGE", id, "")).toEqual([{ ...text, anchor: null }, hero]);
  for (const value of [
    "documentos",
    "Com espaço",
    "ação",
    "a--b",
    "#link",
    "<script>",
    "a".repeat(101),
  ])
    expect(setBuilderBlockAnchor(input, "PAGE", id, value)).toBeUndefined();
  expect(parseBuilderBlocks([{ ...text, anchor: "documentos" }, hero], "PAGE")).toBeUndefined();
  expect(setBuilderBlockAnchor(input, "PAGE", "missing", "ok")).toBeUndefined();
  expect(setBuilderBlockAnchor(input, "ARTICLE", id, "ok")).toBeUndefined();
  expect(setBuilderBlockAnchor([text], "ARTICLE", id, "123")![0]!.anchor).toBe("123");
});
it("removes only the selected supported block and reindexes without mutating other content", () => {
  const text = newBuilderBlock("TEXT", "PAGE", [], id)!;
  const image = newBuilderBlock("IMAGE", "PAGE", [text], other, id)!;
  const input = [text, image];
  expect(removeBuilderBlock(input, "PAGE", id)).toEqual([{ ...image, position: 0 }]);
  expect(input.map((b) => b.position)).toEqual([0, 1]);
  expect(removeBuilderBlock([text], "ARTICLE", id)).toEqual([]);
  expect(removeBuilderBlock(input, "PAGE", "missing")).toBeUndefined();
  const hero = newBuilderBlock("HERO", "PAGE", [], id)!;
  expect(removeBuilderBlock([hero], "ARTICLE", id)).toBeUndefined();
});
it("changes only explicit visibility, retaining content/media and rejecting invalid/no-op changes", () => {
  const image = newBuilderBlock("IMAGE", "PAGE", [], id, other)!;
  const next = setBuilderBlockVisibility([image], "PAGE", id, false)!;
  expect(next).toEqual([{ ...image, isVisible: false }]);
  expect(image.isVisible).toBe(true);
  expect(setBuilderBlockVisibility(next, "PAGE", id, true)).toEqual([image]);
  expect(setBuilderBlockVisibility(next, "PAGE", id, false)).toBeUndefined();
  expect(setBuilderBlockVisibility([image], "PAGE", "missing", false)).toBeUndefined();
  expect(
    setBuilderBlockVisibility([image], "PAGE", id, "false" as unknown as boolean),
  ).toBeUndefined();
  const hero = newBuilderBlock("HERO", "PAGE", [], id)!;
  expect(setBuilderBlockVisibility([hero], "ARTICLE", id, false)).toBeUndefined();
});
it("duplicates data independently with a new ID/position, reuses media and clears anchor", () => {
  const image = newBuilderBlock("IMAGE", "PAGE", [], id, other)!;
  const source = {
    ...image,
    anchor: "foto",
    background: "IMAGE" as const,
    backgroundMediaId: other,
    isVisible: false,
  };
  const next = duplicateBuilderBlock([source], "PAGE", id, other)!;
  expect(next[0]).toEqual(source);
  expect(next[1]).toMatchObject({
    id: other,
    type: "IMAGE",
    position: 1,
    isVisible: false,
    schemaVersion: 1,
    background: "IMAGE",
    backgroundMediaId: other,
    data: { imageId: other, decorative: false },
  });
  expect(next[1]!.anchor).toBeUndefined();
  expect(next[1]!.data).not.toBe(source.data);
  expect(next[0]!.data).not.toBe(next[1]!.data);
  expect(source.anchor).toBe("foto");
});
it("rejects unknown source, duplicate/malformed ID, unsupported context/version and overflow", () => {
  const hero = newBuilderBlock("HERO", "PAGE", [], id)!;
  for (const newId of [id, "bad"])
    expect(duplicateBuilderBlock([hero], "PAGE", id, newId)).toBeUndefined();
  expect(duplicateBuilderBlock([hero], "PAGE", "missing", other)).toBeUndefined();
  expect(duplicateBuilderBlock([hero], "ARTICLE", id, other)).toBeUndefined();
  expect(
    duplicateBuilderBlock([{ ...hero, position: 2147483647 }], "PAGE", id, other),
  ).toBeUndefined();
  expect(
    duplicateBuilderBlock(
      [{ ...hero, schemaVersion: 2 } as unknown as typeof hero],
      "PAGE",
      id,
      other,
    ),
  ).toBeUndefined();
});
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
  expect(newBuilderBlock("CARDS", "PAGE", [], id, other)?.data).toEqual({
    items: [{ imageId: other, title: "Novo card" }],
  });
  expect(newBuilderBlock("CARDS", "PAGE", [], id)).toBeUndefined();
  expect(newBuilderBlock("CARDS", "ARTICLE", [], id, other)).toBeUndefined();
  expect(newBuilderBlock("QUICK_LINKS", "PAGE", [], id)?.data).toEqual({
    items: [{ label: "Novo link", url: "/" }],
  });
  expect(newBuilderBlock("QUICK_LINKS", "ARTICLE", [], id)).toBeUndefined();
  for (const context of ["PAGE", "ARTICLE"] as const)
    expect(newBuilderBlock("CTA", context, [], id)?.data).toEqual({
      title: "Nova chamada",
      buttonLabel: "Saiba mais",
      buttonUrl: "/",
    });
  expect(newBuilderBlock("SPACER", "PAGE", [], id)?.data).toEqual({ size: "MEDIUM" });
  expect(newBuilderBlock("SPACER", "ARTICLE", [], id)).toBeUndefined();
  expect(newBuilderBlock("FAQ", "PAGE", [], id)?.data).toEqual({
    items: [{ question: "Nova pergunta", answer: "Nova resposta" }],
  });
  expect(newBuilderBlock("FAQ", "ARTICLE", [], id)).toBeUndefined();
  expect(newBuilderBlock("TABS", "PAGE", [], id)?.data).toEqual({
    tabs: [
      {
        label: "Nova aba",
        content: {
          type: "doc",
          nodes: [{ type: "paragraph", children: [{ type: "text", text: "Novo conteúdo" }] }],
        },
      },
    ],
  });
  expect(newBuilderBlock("TABS", "ARTICLE", [], id)).toBeUndefined();
  for (const context of ["PAGE", "ARTICLE"] as const)
    expect(newBuilderBlock("TABLE", context, [], id)?.data).toEqual({
      headers: ["Coluna 1"],
      rows: [[""]],
    });
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
