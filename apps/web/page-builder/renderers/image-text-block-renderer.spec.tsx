// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import axe from "axe-core";
import { expect, it } from "vitest";
import { ImageTextBlockRenderer } from "./image-text-block-renderer";
import { ImageTextBlockEditor } from "../editors/image-text-block-editor";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  ...newBuilderBlock("IMAGE_TEXT", "ARTICLE", [], id, id)!,
  anchor: "cursos",
  data: {
    title: "<script>literal</script>",
    imageId: id,
    imagePosition: "IMAGE_LEFT",
    text: {
      type: "doc",
      nodes: [{ type: "paragraph", children: [{ type: "text", text: "Texto seguro" }] }],
    },
    button: { label: "Cursos", url: "/etmsl" },
  },
});
const image = {
  id,
  type: "IMAGE",
  processingStatus: "READY",
  deletionStatus: "NONE",
  mimeType: "image/png",
  width: 1,
  height: 1,
  src: "/media/fixtures/foto.png",
  altText: "Fachada da Biblioteca",
};
it("renders both controlled layouts with escaped rich text, safe CTA, fallback/contextual/decorative alt and semantic A11y", async () => {
  const main = document.createElement("main");
  for (const imagePosition of ["IMAGE_LEFT", "IMAGE_RIGHT"]) {
    main.innerHTML = renderToStaticMarkup(
      <ImageTextBlockRenderer
        block={{ ...block(), data: { ...block().data, imagePosition } }}
        image={image}
      />,
    );
    expect(main.innerHTML).toContain(`data-position="${imagePosition}"`);
    expect(main.innerHTML).toContain("&lt;script&gt;literal&lt;/script&gt;");
    expect(main.querySelector("img")?.alt).toBe(image.altText);
    expect(main.querySelector(".image-text-block")?.id).toBe("cursos");
    expect(main.querySelector(".hero-block-cta")?.getAttribute("href")).toBe("/etmsl");
    document.body.append(main);
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
    main.remove();
  }
  expect(
    renderToStaticMarkup(
      <ImageTextBlockRenderer
        block={{ ...block(), data: { ...block().data, imageAlt: "Alt contextual" } }}
        image={image}
      />,
    ),
  ).toContain('alt="Alt contextual"');
  expect(
    renderToStaticMarkup(
      <ImageTextBlockRenderer
        block={{ ...block(), data: { ...block().data, imageAlt: "" } }}
        image={image}
      />,
    ),
  ).toContain('alt=""');
});
it("refuses invalid/hidden content, unsafe/mismatched/unready image and missing informative alt", () => {
  for (const invalid of [
    { ...block(), isVisible: false },
    { ...block(), schemaVersion: 2 },
    { ...block(), data: { ...block().data, imagePosition: "FREE" } },
  ])
    expect(renderToStaticMarkup(<ImageTextBlockRenderer block={invalid} image={image} />)).toBe("");
  for (const invalid of [
    { ...image, id: crypto.randomUUID() },
    { ...image, deletionStatus: "REQUESTED" },
    { ...image, processingStatus: "PENDING" },
    { ...image, src: "http://minio/private" },
    { ...image, altText: null },
  ])
    expect(renderToStaticMarkup(<ImageTextBlockRenderer block={block()} image={invalid} />)).toBe(
      "",
    );
});
it("registers complete V1 in PAGE/ARTICLE and creates only drafts with an image reference", () => {
  const definition = frontendBlockRegistry.get("IMAGE_TEXT", 1, "ARTICLE")!;
  expect(definition.renderer).toBe(ImageTextBlockRenderer);
  expect(definition.editor).toBe(ImageTextBlockEditor);
  expect(frontendBlockRegistry.get("IMAGE_TEXT", 1, "PAGE")).toBe(definition);
  expect(frontendBlockRegistry.get("IMAGE_TEXT", 2)).toBeUndefined();
  expect(definition.zodSchema.safeParse(block()).success).toBe(true);
  expect(newBuilderBlock("IMAGE_TEXT", "ARTICLE", [], id, id)?.data).toMatchObject({
    imageId: id,
    imagePosition: "IMAGE_LEFT",
    text: { type: "doc", nodes: [] },
  });
  expect(newBuilderBlock("IMAGE_TEXT", "ARTICLE", [], id)).toBeUndefined();
});
