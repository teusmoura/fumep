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
  it("validates all ten versioned fixture blocks", () => {
    expect(demoBlocks.map((block) => blockSchema.safeParse(block).success)).toEqual(
      Array(10).fill(true),
    );
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

  it("adds, reorders and removes each advanced editorial block", () => {
    const types = ["IMAGE_TEXT", "CARDS", "QUICK_LINKS", "CTA"] as const;
    const blocks = types.map((type, position) => createBlock(type, position));
    expect(validatePage(blocks)).toEqual([]);
    expect(moveBlock(blocks, 3, 0).map((block) => block.type)).toEqual([
      "CTA",
      "IMAGE_TEXT",
      "CARDS",
      "QUICK_LINKS",
    ]);
    expect(
      validatePage(normalizePositions(blocks.filter((block) => block.type !== "CARDS"))),
    ).toEqual([]);
  });

  it("restricts IMAGE_TEXT position, alt, media and paired CTA", () => {
    const block = createBlock("IMAGE_TEXT", 0);
    if (block.type !== "IMAGE_TEXT") throw new Error("Unexpected block");
    expect(
      validatePage([{ ...block, data: { ...block.data, imagePosition: "CENTER" } } as never]),
    ).not.toEqual([]);
    expect(validatePage([{ ...block, data: { ...block.data, imageAlt: "" } }])).not.toEqual([]);
    expect(
      validatePage([
        { ...block, data: { ...block.data, imageId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } },
      ]),
    ).not.toEqual([]);
    expect(
      validatePage([
        {
          ...block,
          data: { ...block.data, buttonLabel: "Abrir", buttonUrl: "https://evil.example" },
        },
      ]),
    ).not.toEqual([]);
  });

  it("caps CARDS at twelve and validates every image, alt and URL", () => {
    const block = createBlock("CARDS", 0);
    if (block.type !== "CARDS") throw new Error("Unexpected block");
    const item = block.data.items[0]!;
    expect(
      validatePage([{ ...block, data: { ...block.data, items: Array(12).fill(item) } }]),
    ).toEqual([]);
    expect(
      validatePage([{ ...block, data: { ...block.data, items: Array(13).fill(item) } }]),
    ).not.toEqual([]);
    expect(validatePage([{ ...block, data: { ...block.data, items: [] } }])).not.toEqual([]);
    expect(
      validatePage([{ ...block, data: { ...block.data, items: [{ ...item, alt: "" }] } }]),
    ).not.toEqual([]);
    expect(
      validatePage([
        {
          ...block,
          data: {
            ...block.data,
            items: [{ ...item, imageId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }],
          },
        },
      ]),
    ).not.toEqual([]);
    expect(
      validatePage([
        { ...block, data: { ...block.data, items: [{ ...item, url: "javascript:alert(1)" }] } },
      ]),
    ).not.toEqual([]);
  });

  it("restricts QUICK_LINKS icons and internal destinations", () => {
    const block = createBlock("QUICK_LINKS", 0);
    if (block.type !== "QUICK_LINKS") throw new Error("Unexpected block");
    const item = block.data.items[0]!;
    expect(
      validatePage([
        { ...block, data: { ...block.data, items: [{ ...item, icon: "UPLOAD" }] } } as never,
      ]),
    ).not.toEqual([]);
    expect(
      validatePage([
        { ...block, data: { ...block.data, items: [{ ...item, url: "//evil.example" }] } },
      ]),
    ).not.toEqual([]);
    expect(
      validatePage([{ ...block, data: { ...block.data, items: [{ ...item, label: "" }] } }]),
    ).not.toEqual([]);
    expect(
      validatePage([{ ...block, data: { ...block.data, items: Array(13).fill(item) } }]),
    ).not.toEqual([]);
  });

  it("requires complete CTA and rejects script URLs", () => {
    const block = createBlock("CTA", 0);
    if (block.type !== "CTA") throw new Error("Unexpected block");
    expect(validatePage([{ ...block, data: { ...block.data, buttonLabel: "" } }])).not.toEqual([]);
    expect(
      validatePage([{ ...block, data: { ...block.data, buttonUrl: "javascript:alert(1)" } }]),
    ).not.toEqual([]);
    expect(validatePage([{ ...block, data: { ...block.data, buttonUrl: "/etmsl" } }])).toEqual([]);
  });

  it("adds, reorders and removes the structured content blocks", () => {
    const blocks = (["FAQ", "TABS", "TABLE"] as const).map((type, position) =>
      createBlock(type, position),
    );
    expect(validatePage(blocks)).toEqual([]);
    expect(moveBlock(blocks, 2, 0).map((block) => block.type)).toEqual(["TABLE", "FAQ", "TABS"]);
    expect(validatePage(normalizePositions(blocks.slice(1)))).toEqual([]);
  });

  it("enforces FAQ and TABS cardinality and required text", () => {
    const faq = createBlock("FAQ", 0);
    const tabs = createBlock("TABS", 0);
    if (faq.type !== "FAQ" || tabs.type !== "TABS") throw new Error("Unexpected block");
    expect(
      validatePage([{ ...faq, data: { ...faq.data, items: Array(30).fill(faq.data.items[0]) } }]),
    ).toEqual([]);
    expect(
      validatePage([{ ...faq, data: { ...faq.data, items: Array(31).fill(faq.data.items[0]) } }]),
    ).not.toEqual([]);
    expect(validatePage([{ ...faq, data: { ...faq.data, items: [] } }])).not.toEqual([]);
    expect(
      validatePage([
        { ...faq, data: { ...faq.data, items: [{ question: " ", answer: "Resposta" }] } },
      ]),
    ).not.toEqual([]);
    expect(validatePage([{ ...tabs, data: { tabs: Array(8).fill(tabs.data.tabs[0]) } }])).toEqual(
      [],
    );
    expect(
      validatePage([{ ...tabs, data: { tabs: Array(9).fill(tabs.data.tabs[0]) } }]),
    ).not.toEqual([]);
    expect(
      validatePage([{ ...tabs, data: { tabs: [{ label: "Aba", content: " " }] } }]),
    ).not.toEqual([]);
  });

  it("requires structured TABLE rows that match headers and rejects HTML fields", () => {
    const table = createBlock("TABLE", 0);
    if (table.type !== "TABLE") throw new Error("Unexpected block");
    expect(
      validatePage([{ ...table, data: { ...table.data, headers: ["Nome"], rows: [["ETMSL"]] } }]),
    ).toEqual([]);
    expect(
      validatePage([
        { ...table, data: { ...table.data, headers: ["Nome"], rows: [["ETMSL", "extra"]] } },
      ]),
    ).not.toEqual([]);
    expect(
      validatePage([{ ...table, data: { ...table.data, headers: [""], rows: [["ETMSL"]] } }]),
    ).not.toEqual([]);
    expect(
      blockSchema.safeParse({ ...table, data: { ...table.data, html: "<table></table>" } }).success,
    ).toBe(false);
  });
});
