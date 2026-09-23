import { expect, it } from "vitest";
import { SPACER_SIZE_VALUES, spacerBlockDataSchemaV1, spacerBlockSchemaV1 } from "./index.js";

const block = (size: string) => ({
  id: "11111111-1111-4111-8111-111111111111",
  type: "SPACER",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: { size },
});

it("accepts only the three canonical spacer sizes in the exact v1 envelope", () => {
  for (const size of SPACER_SIZE_VALUES)
    expect(spacerBlockSchemaV1.safeParse(block(size)).success).toBe(true);
});

it("rejects arbitrary sizes, pixels, CSS and unsupported versions", () => {
  for (const data of [
    { size: "TINY" },
    { size: 24 },
    { size: "24px" },
    { size: "SMALL", pixels: 16 },
    { size: "MEDIUM", css: "height:2rem" },
  ])
    expect(spacerBlockDataSchemaV1.safeParse(data).success).toBe(false);
  expect(spacerBlockSchemaV1.safeParse({ ...block("MEDIUM"), schemaVersion: 2 }).success).toBe(
    false,
  );
});
