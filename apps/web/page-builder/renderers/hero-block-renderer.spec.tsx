// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { heroResolvedImageSchemaV1 } from "@fumep/validation";
import { HeroBlockRenderer } from "./hero-block-renderer";
import { HeroBlockEditor } from "../editors/hero-block-editor";
import { frontendBlockRegistry } from "../block-registry";
const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "HERO",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    title: "ETMSL",
    description: "Ensino técnico",
    imageId: id,
    imageAlt: "Fachada da escola",
    button: { label: "Conheça os cursos", url: "/etmsl/cursos" },
  },
});
const image = () => ({
  id,
  src: "/media/fixtures/fachada.webp",
  type: "IMAGE",
  processingStatus: "READY",
  deletionStatus: "NONE",
  mimeType: "image/webp",
  width: 1200,
  height: 800,
});
const render = (value: unknown = block(), descriptor: unknown = image()) =>
  renderToStaticMarkup(<HeroBlockRenderer block={value} image={descriptor} />);
it("exposes a valid anchor only on visible valid hero blocks", () => {
  expect(render({ ...block(), anchor: "destaque" })).toContain('id="destaque"');
  expect(render({ ...block(), anchor: "bad anchor" })).toBe("");
  expect(render({ ...block(), anchor: "destaque", isVisible: false })).toBe("");
  expect(render({ ...block(), anchor: null })).not.toContain('id="');
});
it("renders image-only SSR with contextual alt, safe CTA and explicit decorative alt", () => {
  const html = render();
  expect(html).toContain("<h2>ETMSL</h2>");
  expect(html).toContain('src="/media/fixtures/fachada.webp"');
  expect(html).toContain('alt="Fachada da escola"');
  expect(html).toContain('width="1200"');
  expect(html).toContain('href="/etmsl/cursos"');
  const value = block();
  value.data.imageAlt = "";
  expect(render(value)).toContain('alt=""');
  expect(html).not.toContain("<video");
});
it("fails closed for unavailable/mismatched/internal/unsafe sources, malformed data and versions", () => {
  for (const descriptor of [
    null,
    {},
    { ...image(), id: "22222222-2222-4222-8222-222222222222" },
    { ...image(), deletionStatus: "REQUESTED" },
    { ...image(), deletionStatus: "FAILED" },
    { ...image(), processingStatus: "PENDING" },
    { ...image(), type: "DOCUMENT" },
    { ...image(), mimeType: "image/svg+xml" },
    { ...image(), width: 0 },
  ])
    expect(render(block(), descriptor)).toBe("");
  for (const src of [
    "http://minio:9000/file",
    "https://example.org/file.jpg",
    "//evil.invalid/file",
    "/media/a/../b",
    "/media/a/%2e%2e/b",
    "/admin/media/file",
    "data:image/png,x",
    "/media/a/file?token=secret",
  ])
    expect(heroResolvedImageSchemaV1.safeParse({ ...image(), src }).success).toBe(false);
  for (const value of [
    null,
    { ...block(), schemaVersion: 2 },
    { ...block(), isVisible: false },
    { ...block(), data: { ...block().data, button: { label: "X", url: "javascript:alert(1)" } } },
  ])
    expect(render(value)).toBe("");
});
it("supports text-only HERO and escapes titles/descriptions/alt/CTA labels", () => {
  const value = block();
  const literal = "<script>alert(1)</script>";
  Object.assign(value.data, {
    title: literal,
    description: literal,
    imageAlt: literal,
    button: { label: literal, url: "#cursos" },
  });
  const html = render(value);
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  expect(render({ ...block(), data: { title: "FUMEP" } }, null)).toContain("FUMEP");
});
it("registers complete HERO only for PAGE with exact version and existing TEXT unchanged", () => {
  const definition = frontendBlockRegistry.get("HERO", 1, "PAGE")!;
  expect(definition.renderer).toBe(HeroBlockRenderer);
  expect(definition.editor).toBe(HeroBlockEditor);
  expect(definition.zodSchema.safeParse(block()).success).toBe(true);
  expect(frontendBlockRegistry.get("HERO", 1, "ARTICLE")).toBeUndefined();
  expect(frontendBlockRegistry.get("HERO", 2)).toBeUndefined();
  expect(frontendBlockRegistry.list("ARTICLE").map((item) => item.type)).toEqual([
    "TEXT",
    "IMAGE",
    "IMAGE_TEXT",
    "CTA",
    "TABLE",
  ]);
});
it("has no semantic axe violations for informative/decorative image and CTA (no contrast/layout)", async () => {
  for (const alt of ["Fachada da escola", ""]) {
    const value = block();
    value.data.imageAlt = alt;
    const main = document.createElement("main");
    main.innerHTML = `<h1>Portal</h1>${render(value)}`;
    document.body.append(main);
    try {
      expect(
        (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
      ).toEqual([]);
    } finally {
      main.remove();
    }
  }
});
