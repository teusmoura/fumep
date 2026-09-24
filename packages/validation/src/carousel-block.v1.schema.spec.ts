import { expect, it } from "vitest";
import { CAROUSEL_V1_LIMITS, carouselBlockDataSchemaV1, carouselBlockSchemaV1 } from "./index.js";

const id = "11111111-1111-4111-8111-111111111111";
const item = () => ({ imageId: id, alt: "Fachada da escola", caption: "Entrada", url: "/etmsl" });
const block = () => ({
  id,
  type: "CAROUSEL",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: { items: [item()] },
});

it("accepts one to ten versioned image references with safe optional link and incomplete draft alt", () => {
  expect(carouselBlockSchemaV1.safeParse(block()).success).toBe(true);
  expect(carouselBlockDataSchemaV1.safeParse({ items: [{ imageId: id, alt: "" }] }).success).toBe(
    true,
  );
});

it("rejects empty/oversized collection, invalid media IDs, unsafe links, controls and HTML keys", () => {
  for (const invalid of [
    { items: [] },
    { items: Array(CAROUSEL_V1_LIMITS.items + 1).fill(item()) },
    { items: [{ ...item(), imageId: "bad" }] },
    { items: [{ ...item(), url: "javascript:alert(1)" }] },
    { items: [{ ...item(), alt: "\u0000" }] },
    { items: [{ ...item(), html: "<img>" }] },
  ])
    expect(carouselBlockDataSchemaV1.safeParse(invalid).success).toBe(false);
  expect(carouselBlockSchemaV1.safeParse({ ...block(), schemaVersion: 2 }).success).toBe(false);
});
