import { expect, it } from "vitest";
import {
  HERO_V1_LIMITS,
  heroBlockDataSchemaV1,
  heroBlockSchemaV1,
  heroResolvedImageSchemaV1,
} from "./index.js";
const imageId = "11111111-1111-4111-8111-111111111111";
const data = () => ({
  title: "ETMSL",
  description: "Educação profissional",
  imageId,
  imageAlt: "Fachada da escola",
  button: { label: "Conheça os cursos", url: "/etmsl/cursos" },
});
const block = () => ({
  id: imageId,
  type: "HERO",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: data(),
});
const resolved = () => ({
  id: imageId,
  type: "IMAGE",
  processingStatus: "READY",
  deletionStatus: "NONE",
  mimeType: "image/webp",
  width: 1200,
  height: 800,
  src: "/media/fixtures/fachada.webp",
});
it("validates resolved image metadata separately from persisted HERO data", () => {
  expect(heroResolvedImageSchemaV1.parse(resolved())).toEqual(resolved());
  expect(heroBlockDataSchemaV1.safeParse({ ...data(), image: resolved() }).success).toBe(false);
  expect(
    heroResolvedImageSchemaV1.safeParse({ ...resolved(), storageKey: "internal" }).success,
  ).toBe(false);
});
it("requires available image metadata, allowed MIME and bounded intrinsic dimensions", () => {
  for (const extra of [
    { type: "DOCUMENT" },
    { processingStatus: "PROCESSING" },
    { deletionStatus: "REQUESTED" },
    { deletionStatus: "FAILED" },
    { mimeType: "image/svg+xml" },
    { width: 0 },
    { height: 100001 },
    { id: "invalid" },
  ])
    expect(heroResolvedImageSchemaV1.safeParse({ ...resolved(), ...extra }).success).toBe(false);
});
it("limits image delivery metadata to normalized portal media paths without tokens/internal hosts", () => {
  for (const src of [
    "http://minio:9000/file",
    "//evil.invalid/file",
    "/media/a/../b",
    "/media/a/./b",
    "/media/a/%2e%2e/b",
    "/media/a?token=secret",
    "/media/a#fragment",
    "/admin/media/a",
    "data:image/png,x",
    "/media/a\\b",
  ])
    expect(heroResolvedImageSchemaV1.safeParse({ ...resolved(), src }).success).toBe(false);
});
it("supports image-only HERO v1, optional image and explicit decorative alt", () => {
  expect(heroBlockDataSchemaV1.parse(data())).toEqual(data());
  expect(heroBlockDataSchemaV1.parse({ title: "FUMEP" })).toEqual({ title: "FUMEP" });
  expect(heroBlockDataSchemaV1.safeParse({ ...data(), imageAlt: "" }).success).toBe(true);
  expect(heroBlockSchemaV1.safeParse(block()).success).toBe(true);
});
it("requires non-blank title/CTA labels and explicit paired image alt", () => {
  for (const value of [
    {},
    { title: " " },
    { ...data(), imageAlt: undefined },
    { ...data(), imageAlt: "  " },
    { ...data(), imageId: undefined },
    { ...data(), imageId: "https://storage.invalid/file.jpg" },
    { ...data(), button: { label: " ", url: "/" } },
    { ...data(), button: { label: "Cursos" } },
  ])
    expect(heroBlockDataSchemaV1.safeParse(value).success).toBe(false);
  const result = heroBlockDataSchemaV1.safeParse({ title: "FUMEP", imageId });
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.issues[0]!.path).toEqual(["imageAlt"]);
});
it("accepts only safe CTA URL kinds and rejects script/storage credentials", () => {
  for (const url of ["https://example.org", "http://example.org", "/etmsl", "#cursos"])
    expect(
      heroBlockDataSchemaV1.safeParse({ ...data(), button: { label: "Cursos", url } }).success,
    ).toBe(true);
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.invalid",
    "https://user:password@example.org",
    "\\evil.invalid",
    "java\nscript:alert(1)",
  ])
    expect(
      heroBlockDataSchemaV1.safeParse({ ...data(), button: { label: "Cursos", url } }).success,
    ).toBe(false);
});
it("rejects video/HTML/CSS/physical source fields and unknown versions while retaining common refinements", () => {
  for (const extra of [
    { videoId: imageId },
    { videoUrl: "https://example.org/video" },
    { imageUrl: "/file.jpg" },
    { html: "<script>" },
    { css: "color:red" },
    { decorative: true },
  ])
    expect(heroBlockDataSchemaV1.safeParse({ ...data(), ...extra }).success).toBe(false);
  for (const value of [
    { ...block(), schemaVersion: 2 },
    { ...block(), type: "TEXT" },
    { ...block(), background: "IMAGE" },
    { ...block(), anchor: "invalid anchor" },
  ])
    expect(heroBlockSchemaV1.safeParse(value).success).toBe(false);
  expect(
    heroBlockSchemaV1.safeParse({ ...block(), background: "IMAGE", backgroundMediaId: imageId })
      .success,
  ).toBe(true);
});
it("enforces plaintext/control and length limits without silently truncating", () => {
  for (const [field, limit] of [
    ["title", HERO_V1_LIMITS.titleCharacters],
    ["description", HERO_V1_LIMITS.descriptionCharacters],
    ["imageAlt", HERO_V1_LIMITS.altCharacters],
  ] as const) {
    expect(heroBlockDataSchemaV1.safeParse({ ...data(), [field]: "a".repeat(limit) }).success).toBe(
      true,
    );
    expect(
      heroBlockDataSchemaV1.safeParse({ ...data(), [field]: "a".repeat(limit + 1) }).success,
    ).toBe(false);
    expect(heroBlockDataSchemaV1.safeParse({ ...data(), [field]: "unsafe\u0000" }).success).toBe(
      false,
    );
  }
  expect(
    heroBlockDataSchemaV1.safeParse({ ...data(), button: { label: "a".repeat(121), url: "/" } })
      .success,
  ).toBe(false);
  // Literal markup remains plain text, never imported/interpreted as HTML.
  expect(heroBlockDataSchemaV1.parse({ title: "<script>" }).title).toBe("<script>");
});
