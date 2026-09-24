import { expect, it } from "vitest";
import {
  STATISTICS_V1_LIMITS,
  statisticsBlockDataSchemaV1,
  statisticsBlockSchemaV1,
} from "./index.js";

const item = () => ({ value: "98%", label: "Aprovação", description: "Turma atual" });
const block = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  type: "STATISTICS",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: { items: [item()] },
});

it("accepts a versioned collection with numeric-looking values as controlled text", () => {
  expect(statisticsBlockSchemaV1.safeParse(block()).success).toBe(true);
  expect(
    statisticsBlockDataSchemaV1.safeParse({ items: [{ value: "1,2 mil", label: "Alunos" }] })
      .success,
  ).toBe(true);
});

it("rejects empty/oversized collections, blank fields, control chars and arbitrary HTML keys", () => {
  for (const invalid of [
    { items: [] },
    { items: Array(STATISTICS_V1_LIMITS.items + 1).fill(item()) },
    { items: [{ ...item(), value: " " }] },
    { items: [{ ...item(), label: " " }] },
    { items: [{ ...item(), description: " " }] },
    { items: [{ ...item(), value: "\u0000" }] },
    { items: [{ ...item(), html: "<script>" }] },
  ])
    expect(statisticsBlockDataSchemaV1.safeParse(invalid).success).toBe(false);
  expect(statisticsBlockSchemaV1.safeParse({ ...block(), schemaVersion: 2 }).success).toBe(false);
});
