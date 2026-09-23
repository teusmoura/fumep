import { expect, it } from "vitest";
import { CTA_V1_LIMITS, ctaBlockDataSchemaV1, ctaBlockSchemaV1 } from "./index.js";

const data = () => ({
  title: "Inscreva-se",
  text: "Conheça os cursos",
  buttonLabel: "Ver cursos",
  buttonUrl: "/etmsl#cursos",
});
const block = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  type: "CTA",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: data(),
});

it("accepts the exact CTA v1 envelope and optional text with safe links", () => {
  expect(ctaBlockSchemaV1.safeParse(block()).success).toBe(true);
  expect(
    ctaBlockDataSchemaV1.safeParse({
      ...data(),
      text: undefined,
      buttonUrl: "https://fumep.edu.br/",
    }).success,
  ).toBe(true);
  expect(ctaBlockDataSchemaV1.safeParse({ ...data(), buttonUrl: "#inicio" }).success).toBe(true);
});

it("rejects blank, oversized, unsafe and noncanonical data", () => {
  for (const value of [
    { ...data(), title: " " },
    { ...data(), buttonLabel: " " },
    { ...data(), title: "a".repeat(CTA_V1_LIMITS.titleCharacters + 1) },
    { ...data(), text: "a".repeat(CTA_V1_LIMITS.textCharacters + 1) },
    { ...data(), buttonLabel: "a".repeat(CTA_V1_LIMITS.buttonLabelCharacters + 1) },
    { ...data(), buttonUrl: "javascript:alert(1)" },
    { ...data(), buttonUrl: "//evil.example" },
    { ...data(), html: "<script>" },
  ])
    expect(ctaBlockDataSchemaV1.safeParse(value).success).toBe(false);
  expect(ctaBlockSchemaV1.safeParse({ ...block(), schemaVersion: 2 }).success).toBe(false);
  expect(ctaBlockSchemaV1.safeParse({ ...block(), css: "color:red" }).success).toBe(false);
});
