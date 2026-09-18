import { expect, it } from "vitest";
import { imageBlockDataSchemaV1, imageBlockSchemaV1, imageResolvedImageSchemaV1 } from "./index.js";
const id = "11111111-1111-4111-8111-111111111111";
const data = () => ({
  imageId: id,
  decorative: false,
  alt: "Fachada",
  caption: "Escola técnica",
  link: "/etmsl",
});
const block = () => ({
  id,
  type: "IMAGE",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: data(),
});
it("defines required UUID/decorative and contextual alt/caption/link with common versioned envelope", () => {
  expect(imageBlockDataSchemaV1.parse(data())).toEqual(data());
  expect(imageBlockSchemaV1.safeParse(block()).success).toBe(true);
  expect(imageBlockDataSchemaV1.safeParse({ imageId: id, decorative: false }).success).toBe(true); // incomplete draft/fallback resolved by consumers
  expect(imageBlockDataSchemaV1.safeParse({ imageId: id, decorative: true, alt: "" }).success).toBe(
    true,
  );
  for (const value of [
    { decorative: false },
    { imageId: "https://storage.invalid/a.jpg", decorative: false },
    { imageId: id },
    { imageId: id, decorative: "false" },
    { ...data(), decorative: true },
    { imageId: id, decorative: true, alt: " " },
  ])
    expect(imageBlockDataSchemaV1.safeParse(value).success).toBe(false);
});
it("requires a caption accessible label for linked decorative images", () => {
  for (const caption of [undefined, " "])
    expect(
      imageBlockDataSchemaV1.safeParse({ imageId: id, decorative: true, link: "/", caption })
        .success,
    ).toBe(false);
  expect(
    imageBlockDataSchemaV1.safeParse({
      imageId: id,
      decorative: true,
      link: "/",
      caption: "Conheça a escola",
    }).success,
  ).toBe(true);
});
it("enforces safe links, strict fields, controls and alt/caption bounds", () => {
  for (const link of ["https://example.org", "http://example.org", "/etmsl", "#cursos"])
    expect(imageBlockDataSchemaV1.safeParse({ ...data(), link }).success).toBe(true);
  for (const link of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.invalid",
    "https://user:password@example.org",
  ])
    expect(imageBlockDataSchemaV1.safeParse({ ...data(), link }).success).toBe(false);
  for (const extra of [{ src: "/media/a" }, { html: "<script>" }, { css: "color:red" }])
    expect(imageBlockDataSchemaV1.safeParse({ ...data(), ...extra }).success).toBe(false);
  expect(
    imageBlockDataSchemaV1.safeParse({ ...data(), alt: "a".repeat(300), caption: "a".repeat(500) })
      .success,
  ).toBe(true);
  for (const extra of [
    { alt: "a".repeat(301) },
    { caption: "a".repeat(501) },
    { alt: "a\u0000" },
    { caption: "a\u0000" },
  ])
    expect(imageBlockDataSchemaV1.safeParse({ ...data(), ...extra }).success).toBe(false);
});
it("preserves common refinements and refuses unknown type/version", () => {
  for (const extra of [
    { type: "HERO" },
    { schemaVersion: 2 },
    { background: "IMAGE" },
    { anchor: "invalid anchor" },
  ])
    expect(imageBlockSchemaV1.safeParse({ ...block(), ...extra }).success).toBe(false);
  expect(
    imageBlockSchemaV1.safeParse({ ...block(), background: "IMAGE", backgroundMediaId: id })
      .success,
  ).toBe(true);
});
it("validates fallback metadata without accepting unavailable images/internal addresses", () => {
  const image = {
    id,
    type: "IMAGE",
    processingStatus: "READY",
    deletionStatus: "NONE",
    mimeType: "image/webp",
    width: 1200,
    height: 800,
    src: "/media/fixtures/fachada.webp",
    altText: "Fachada padrão",
  };
  expect(imageResolvedImageSchemaV1.parse(image)).toEqual(image);
  expect(imageResolvedImageSchemaV1.safeParse({ ...image, altText: null }).success).toBe(true);
  for (const extra of [
    { altText: "a".repeat(301) },
    { altText: "a\u0000" },
    { deletionStatus: "FAILED" },
    { deletionStatus: "REQUESTED" },
    { processingStatus: "PROCESSING" },
    { src: "http://minio:9000/file" },
    { storageKey: "internal" },
  ])
    expect(imageResolvedImageSchemaV1.safeParse({ ...image, ...extra }).success).toBe(false);
});
