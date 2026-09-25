import { expect, it } from "vitest";
import { blockRegistry, contentBlockTypeSchema } from "@fumep/validation";
import { frontendBlockRegistry } from "./block-registry";
import { newBuilderBlock, parseBuilderBlocks, type BuilderType } from "./builder-state";

const pageTypes = [
  "TEXT",
  "HERO",
  "IMAGE",
  "IMAGE_TEXT",
  "CARDS",
  "QUICK_LINKS",
  "CTA",
  "SPACER",
  "FAQ",
  "TABS",
  "TABLE",
  "TIMELINE",
  "STATISTICS",
  "CAROUSEL",
  "MAP",
  "VIDEO",
  "DOCUMENT",
] as const;
const articleTypes = [
  "TEXT",
  "IMAGE",
  "IMAGE_TEXT",
  "CTA",
  "TABLE",
  "CAROUSEL",
  "VIDEO",
  "DOCUMENT",
] as const;
const laterFeeds = [
  "NEWS_FEED",
  "EVENT_FEED",
  "COURSE_FEED",
  "CONTEST_FEED",
  "SELECTION_PROCESS_FEED",
  "GALLERY_FEED",
] as const;
const blockId = "11111111-1111-4111-8111-111111111111";
const imageId = "22222222-2222-4222-8222-222222222222";
const documentId = "33333333-3333-4333-8333-333333333333";

it("contains every complete core V1 definition in canonical order and no future feed stubs", () => {
  expect(frontendBlockRegistry.list().map((entry) => entry.type)).toEqual(pageTypes);
  expect(frontendBlockRegistry.list("PAGE").map((entry) => entry.type)).toEqual(pageTypes);
  expect(frontendBlockRegistry.list("ARTICLE").map((entry) => entry.type)).toEqual(articleTypes);
  for (const type of laterFeeds) {
    expect(contentBlockTypeSchema.safeParse(type).success).toBe(true);
    expect(frontendBlockRegistry.get(type, 1)).toBeUndefined();
  }
  expect(blockRegistry.list()).toHaveLength(0);
});

it("validates every registered version and its builder draft in allowed contexts", () => {
  for (const type of pageTypes) {
    const definition = frontendBlockRegistry.get(type, 1, "PAGE")!;
    expect(definition.schemaVersion).toBe(1);
    expect(typeof definition.renderer).toBe("function");
    expect(typeof definition.editor).toBe("function");
    expect(definition.label.trim()).not.toBe("");
    expect(frontendBlockRegistry.get(type, 2, "PAGE")).toBeUndefined();
    const draft = newBuilderBlock(
      type as BuilderType,
      "PAGE",
      [],
      blockId,
      imageId,
      "Imagem",
      documentId,
    );
    expect(draft, type).toBeDefined();
    expect(definition.zodSchema.safeParse(draft).success, type).toBe(true);
    expect(parseBuilderBlocks([draft], "PAGE"), type).toEqual([draft]);
    if (!articleTypes.includes(type as (typeof articleTypes)[number])) {
      expect(frontendBlockRegistry.get(type, 1, "ARTICLE")).toBeUndefined();
      expect(
        newBuilderBlock(type as BuilderType, "ARTICLE", [], blockId, imageId, "Imagem", documentId),
      ).toBeUndefined();
    }
  }
});

it("does not accept duplicate block IDs, positions or unsupported versions", () => {
  const first = newBuilderBlock("TEXT", "PAGE", [], blockId)!;
  const second = newBuilderBlock("CTA", "PAGE", [first], imageId)!;
  expect(parseBuilderBlocks([first, second], "PAGE")).toEqual([first, second]);
  expect(parseBuilderBlocks([first, { ...second, id: first.id }], "PAGE")).toBeUndefined();
  expect(
    parseBuilderBlocks([first, { ...second, position: first.position }], "PAGE"),
  ).toBeUndefined();
  expect(parseBuilderBlocks([{ ...first, schemaVersion: 2 }], "PAGE")).toBeUndefined();
});
