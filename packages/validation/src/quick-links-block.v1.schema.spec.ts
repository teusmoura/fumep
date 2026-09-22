import { expect, it } from "vitest";
import {
  QUICK_LINK_ICON_VALUES,
  QUICK_LINKS_V1_LIMITS,
  quickLinksBlockDataSchemaV1,
  quickLinksBlockSchemaV1,
} from "./index.js";

const id = "11111111-1111-4111-8111-111111111111";
const data = () => ({
  title: "Acesso rápido",
  items: [{ label: "Cursos", url: "/etmsl#cursos", icon: "ARROW_RIGHT" }],
});

it("accepts safe links with each optional system-controlled icon", () => {
  for (const icon of QUICK_LINK_ICON_VALUES)
    expect(
      quickLinksBlockDataSchemaV1.safeParse({ items: [{ label: "Acesso", url: "/", icon }] })
        .success,
    ).toBe(true);
  expect(
    quickLinksBlockDataSchemaV1.safeParse({ items: [{ label: "Sem ícone", url: "#inicio" }] })
      .success,
  ).toBe(true);
});

it("rejects empty collections, blank/oversized labels, unsafe URLs and arbitrary icons/content", () => {
  for (const value of [
    { items: [] },
    { items: [{ label: " ", url: "/" }] },
    { items: [{ label: "a".repeat(QUICK_LINKS_V1_LIMITS.labelCharacters + 1), url: "/" }] },
    { title: "a".repeat(QUICK_LINKS_V1_LIMITS.titleCharacters + 1), items: data().items },
    { items: [{ label: "Curso", url: "javascript:alert(1)" }] },
    { items: [{ label: "Curso", url: "/", icon: "STAR" }] },
    { items: [{ label: "Curso", url: "/", svg: "<svg>" }] },
    { items: [{ label: "Curso", url: "/", html: "<script>" }] },
  ])
    expect(quickLinksBlockDataSchemaV1.safeParse(value).success).toBe(false);
});

it("requires the exact QUICK_LINKS v1 envelope", () => {
  const block = {
    id,
    type: "QUICK_LINKS",
    schemaVersion: 1,
    position: 0,
    isVisible: true,
    background: "DEFAULT",
    data: data(),
  };
  expect(quickLinksBlockSchemaV1.safeParse(block).success).toBe(true);
  expect(quickLinksBlockSchemaV1.safeParse({ ...block, schemaVersion: 2 }).success).toBe(false);
  expect(quickLinksBlockSchemaV1.safeParse({ ...block, type: "CTA" }).success).toBe(false);
  expect(quickLinksBlockSchemaV1.safeParse({ ...block, css: "display:grid" }).success).toBe(false);
});
