// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { ImageBlockRenderer } from "./image-block-renderer";
import { ImageBlockEditor } from "../editors/image-block-editor";
import { frontendBlockRegistry } from "../block-registry";
const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "IMAGE",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: { imageId: id, decorative: false, alt: "Fachada contextual", caption: "Escola técnica" },
});
const image = () => ({
  id,
  type: "IMAGE",
  processingStatus: "READY",
  deletionStatus: "NONE",
  mimeType: "image/webp",
  width: 1200,
  height: 800,
  src: "/media/fixtures/fachada.webp",
  altText: "Fachada da Biblioteca",
});
const render = (value: unknown = block(), descriptor: unknown = image()) =>
  renderToStaticMarkup(<ImageBlockRenderer block={value} image={descriptor} />);
it("exposes validated anchors without rendering hidden or invalid images", () => {
  expect(render({ ...block(), anchor: "foto" })).toContain('id="foto"');
  expect(render({ ...block(), anchor: "<script>" })).toBe("");
  expect(render({ ...block(), anchor: "foto", isVisible: false })).toBe("");
});
it("renders a semantic figure with contextual alt preferred over valid fallback and escaped caption", () => {
  const html = render();
  expect(html).toContain("<figure");
  expect(html).toContain('alt="Fachada contextual"');
  expect(html).toContain("<figcaption>Escola técnica</figcaption>");
  const value = block();
  value.data.alt = " ";
  expect(render(value)).toContain('alt="Fachada da Biblioteca"');
  value.data.caption = "<script>alert(1)</script>";
  expect(render(value)).toContain("&lt;script&gt;");
  expect(render(value)).not.toContain("<script>");
});
it("requires informative alt/contextual or valid library fallback and explicit decoration", () => {
  const value = block();
  value.data.alt = "";
  expect(render(value, { ...image(), altText: null })).toBe("");
  value.data.decorative = true;
  expect(render(value)).toContain('alt=""');
  expect(
    render({ ...value, data: { ...value.data, link: "/etmsl", caption: "Conheça a escola" } }),
  ).toContain('aria-label="Conheça a escola"');
  expect(render({ ...value, data: { ...value.data, link: "/etmsl", caption: "" } })).toBe("");
});
it("refuses malformed/unavailable/mismatched media and unknown versions without leaking raw data", () => {
  for (const descriptor of [
    null,
    {},
    { ...image(), id: "22222222-2222-4222-8222-222222222222" },
    { ...image(), deletionStatus: "FAILED" },
    { ...image(), deletionStatus: "REQUESTED" },
    { ...image(), processingStatus: "PENDING" },
    { ...image(), src: "http://minio:9000/internal" },
  ])
    expect(render(block(), descriptor)).toBe("");
  for (const value of [
    null,
    { ...block(), schemaVersion: 2 },
    { ...block(), isVisible: false },
    { ...block(), data: { ...block().data, link: "javascript:alert(1)" } },
  ])
    expect(render(value)).toBe("");
});
it("registers complete IMAGE v1 in PAGE/ARTICLE without changing HERO restrictions", () => {
  const definition = frontendBlockRegistry.get("IMAGE", 1, "PAGE")!;
  expect(definition.renderer).toBe(ImageBlockRenderer);
  expect(definition.editor).toBe(ImageBlockEditor);
  expect(definition.zodSchema.safeParse(block()).success).toBe(true);
  expect(frontendBlockRegistry.get("IMAGE", 1, "ARTICLE")).toBe(definition);
  expect(frontendBlockRegistry.get("IMAGE", 2)).toBeUndefined();
  expect(frontendBlockRegistry.get("HERO", 1, "ARTICLE")).toBeUndefined();
});
it("has no semantic axe violations for informative links and caption-named decorative links (no contrast/layout)", async () => {
  for (const data of [
    { ...block().data, link: "/etmsl" },
    { imageId: id, decorative: true, caption: "Conheça a escola", link: "/etmsl" },
  ]) {
    const main = document.createElement("main");
    main.innerHTML = `<h1>Portal</h1>${render({ ...block(), data })}`;
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
