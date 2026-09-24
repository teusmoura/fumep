import { expect, it } from "vitest";
import { TABLE_V1_LIMITS, tableBlockDataSchemaV1, tableBlockSchemaV1 } from "./index.js";

const data = () => ({
  caption: "Cursos",
  headers: ["Nome", "Duração"],
  rows: [["Técnico", "2 anos"]],
});
const block = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  type: "TABLE",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: data(),
});

it("accepts a rectangular table with plain text and a versioned PAGE/ARTICLE envelope", () => {
  expect(tableBlockDataSchemaV1.safeParse(data()).success).toBe(true);
  expect(tableBlockSchemaV1.safeParse(block()).success).toBe(true);
  expect(tableBlockDataSchemaV1.safeParse({ headers: ["Nome"], rows: [[""]] }).success).toBe(true);
});

it("rejects missing headers/rows, ragged dimensions, extra HTML fields and unsupported version", () => {
  for (const invalid of [
    { headers: [], rows: [["x"]] },
    { headers: ["Nome"], rows: [] },
    { headers: ["  "], rows: [["x"]] },
    { headers: ["Nome", "Duração"], rows: [["x"]] },
    { headers: ["Nome"], rows: [Array(TABLE_V1_LIMITS.columns + 1).fill("x")] },
    { ...data(), html: "<table>" },
    { ...data(), headers: Array(TABLE_V1_LIMITS.columns + 1).fill("x") },
    { headers: ["x"], rows: Array(TABLE_V1_LIMITS.rows + 1).fill(["x"]) },
    { headers: ["x"], rows: [["\u0000"]] },
  ])
    expect(tableBlockDataSchemaV1.safeParse(invalid).success).toBe(false);
  expect(tableBlockSchemaV1.safeParse({ ...block(), schemaVersion: 2 }).success).toBe(false);
});
