import { expect, it } from "vitest";
import { TABS_V1_LIMITS, tabsBlockDataSchemaV1, tabsBlockSchemaV1 } from "./index.js";

const content = () => ({
  type: "doc",
  nodes: [
    { type: "paragraph", children: [{ type: "text", text: "Texto seguro", marks: ["bold"] }] },
  ],
});
const item = () => ({ label: "Aba", content: content() });
const block = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  type: "TABS",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: { tabs: [item()] },
});

it("accepts 1 to 8 tabs with simple paragraphs, emphasis and safe links", () => {
  expect(tabsBlockSchemaV1.safeParse(block()).success).toBe(true);
  expect(
    tabsBlockDataSchemaV1.safeParse({ tabs: Array.from({ length: TABS_V1_LIMITS.tabs }, item) })
      .success,
  ).toBe(true);
  expect(
    tabsBlockDataSchemaV1.safeParse({
      tabs: [
        {
          label: "Links",
          content: {
            type: "doc",
            nodes: [
              {
                type: "paragraph",
                children: [
                  { type: "link", url: "/etmsl", children: [{ type: "text", text: "Cursos" }] },
                ],
              },
            ],
          },
        },
      ],
    }).success,
  ).toBe(true);
});

it("rejects empty, overflow, unsafe, nested and unsupported rich content", () => {
  for (const value of [
    { tabs: [] },
    { tabs: Array.from({ length: TABS_V1_LIMITS.tabs + 1 }, item) },
    { tabs: [{ ...item(), label: " " }] },
    { tabs: [{ ...item(), label: "a".repeat(TABS_V1_LIMITS.labelCharacters + 1) }] },
    { tabs: [{ ...item(), content: { type: "doc", nodes: [] } }] },
    {
      tabs: [
        {
          ...item(),
          content: {
            type: "doc",
            nodes: [{ type: "paragraph", children: [{ type: "text", text: " " }] }],
          },
        },
      ],
    },
    {
      tabs: [
        {
          ...item(),
          content: { type: "doc", nodes: [{ type: "table", headers: ["A"], rows: [] }] },
        },
      ],
    },
    {
      tabs: [
        {
          ...item(),
          content: {
            type: "doc",
            nodes: [
              {
                type: "paragraph",
                children: [
                  {
                    type: "link",
                    url: "javascript:alert(1)",
                    children: [{ type: "text", text: "x" }],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      tabs: [
        {
          ...item(),
          content: {
            type: "doc",
            nodes: [
              {
                type: "paragraph",
                children: [
                  { type: "text", text: "a".repeat(TABS_V1_LIMITS.contentCharacters + 1) },
                ],
              },
            ],
          },
        },
      ],
    },
    { tabs: [{ ...item(), html: "<script>" }] },
  ])
    expect(tabsBlockDataSchemaV1.safeParse(value).success).toBe(false);
  expect(tabsBlockSchemaV1.safeParse({ ...block(), schemaVersion: 2 }).success).toBe(false);
});
