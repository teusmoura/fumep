import { expect, it } from "vitest";
import { TIMELINE_V1_LIMITS, timelineBlockDataSchemaV1, timelineBlockSchemaV1 } from "./index.js";

const item = () => ({ date: "2026", title: "Inauguração", description: "Aberta ao público." });
const block = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  type: "TIMELINE",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: { title: "História", items: [item()] },
});

it("accepts a versioned sequence of plain-text milestones", () => {
  expect(timelineBlockSchemaV1.safeParse(block()).success).toBe(true);
  expect(
    timelineBlockDataSchemaV1.safeParse({ items: [{ title: "A", description: "B" }] }).success,
  ).toBe(true);
});

it("rejects empty/oversized sequences, blank fields, unsupported control chars and extra fields", () => {
  for (const invalid of [
    { items: [] },
    { items: Array(TIMELINE_V1_LIMITS.items + 1).fill(item()) },
    { items: [{ ...item(), title: " " }] },
    { items: [{ ...item(), description: " " }] },
    { items: [{ ...item(), date: " " }] },
    { items: [{ ...item(), description: "\u0000" }] },
    { items: [{ ...item(), html: "<script>" }] },
  ])
    expect(timelineBlockDataSchemaV1.safeParse(invalid).success).toBe(false);
  expect(timelineBlockSchemaV1.safeParse({ ...block(), schemaVersion: 2 }).success).toBe(false);
});
