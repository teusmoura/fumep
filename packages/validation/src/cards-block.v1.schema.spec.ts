import { expect, it } from "vitest";
import { CARDS_V1_LIMITS, cardsBlockDataSchemaV1, cardsBlockSchemaV1 } from "./index.js";

const imageId = "11111111-1111-4111-8111-111111111111";
const item = (index = 0) => ({
  imageId,
  title: `Curso ${index}`,
  description: "Formação prática",
  url: "/etmsl#cursos",
});

it("accepts one through twelve image-only cards with safe optional content", () => {
  expect(cardsBlockDataSchemaV1.safeParse({ items: [{ imageId, title: "Curso" }] }).success).toBe(
    true,
  );
  expect(
    cardsBlockDataSchemaV1.safeParse({
      items: Array.from({ length: CARDS_V1_LIMITS.items }, (_, index) => item(index)),
    }).success,
  ).toBe(true);
});

it("rejects empty/oversized collections, icons, unsafe text and URLs", () => {
  for (const data of [
    { items: [] },
    { items: Array.from({ length: CARDS_V1_LIMITS.items + 1 }, (_, index) => item(index)) },
    { items: [{ ...item(), imageId: "bad" }] },
    { items: [{ ...item(), title: " " }] },
    { items: [{ ...item(), title: "a".repeat(CARDS_V1_LIMITS.titleCharacters + 1) }] },
    {
      items: [{ ...item(), description: "a".repeat(CARDS_V1_LIMITS.descriptionCharacters + 1) }],
    },
    { items: [{ ...item(), url: "javascript:alert(1)" }] },
    { items: [{ ...item(), icon: "star" }] },
    { items: [{ ...item(), html: "<script>alert(1)</script>" }] },
  ])
    expect(cardsBlockDataSchemaV1.safeParse(data).success).toBe(false);
});

it("requires the exact CARDS v1 envelope", () => {
  const block = {
    id: imageId,
    type: "CARDS",
    schemaVersion: 1,
    position: 0,
    isVisible: true,
    background: "DEFAULT",
    data: { items: [item()] },
  };
  expect(cardsBlockSchemaV1.safeParse(block).success).toBe(true);
  expect(cardsBlockSchemaV1.safeParse({ ...block, schemaVersion: 2 }).success).toBe(false);
  expect(cardsBlockSchemaV1.safeParse({ ...block, type: "QUICK_LINKS" }).success).toBe(false);
  expect(cardsBlockSchemaV1.safeParse({ ...block, layout: "FREE" }).success).toBe(false);
});
