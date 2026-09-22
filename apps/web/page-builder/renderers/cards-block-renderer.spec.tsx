// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { CardsBlockEditor } from "../editors/cards-block-editor";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { CardsBlockRenderer } from "./cards-block-renderer";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const block = () => ({
  id: first,
  type: "CARDS",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    items: [
      { imageId: first, title: "Curso <script>", description: "Formação prática", url: "/curso" },
      { imageId: second, title: "Laboratório" },
    ],
  },
});
const image = (id: string, altText = `Alt ${id}`) => ({
  id,
  type: "IMAGE",
  processingStatus: "READY",
  deletionStatus: "NONE",
  mimeType: "image/webp",
  width: 960,
  height: 640,
  src: `/media/cards/${id}.webp`,
  altText,
});
const render = (
  value: unknown = block(),
  images: readonly unknown[] = [image(first), image(second)],
) => renderToStaticMarkup(<CardsBlockRenderer block={value} images={images} />);

it("renders image-only cards, safe optional links/text and the external anchor", () => {
  const html = render({ ...block(), anchor: "cursos" });
  expect(html).toContain('class="cards-block" id="cursos"');
  expect(html).toContain('href="/curso"');
  expect(html).toContain('alt="Alt 11111111-1111-4111-8111-111111111111"');
  expect(html).toContain("Curso &lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html.match(/cards-block-card/g)).toHaveLength(2);
});

it("fails closed for hidden/invalid blocks and every missing, unsafe or inaccessible image", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render({ ...block(), schemaVersion: 2 })).toBe("");
  expect(render(block(), [image(first)])).toBe("");
  expect(render(block(), [image(first, " "), image(second)])).toBe("");
  expect(render(block(), [{ ...image(first), processingStatus: "PENDING" }, image(second)])).toBe(
    "",
  );
  expect(
    render(block(), [{ ...image(first), src: "http://minio:9000/internal" }, image(second)]),
  ).toBe("");
});

it("registers complete CARDS v1 only for PAGE and creates a one-card image draft", () => {
  const definition = frontendBlockRegistry.get("CARDS", 1, "PAGE")!;
  expect(definition.renderer).toBe(CardsBlockRenderer);
  expect(definition.editor).toBe(CardsBlockEditor);
  expect(definition.zodSchema.safeParse(block()).success).toBe(true);
  expect(frontendBlockRegistry.get("CARDS", 1, "ARTICLE")).toBeUndefined();
  expect(frontendBlockRegistry.get("CARDS", 2)).toBeUndefined();
  expect(newBuilderBlock("CARDS", "PAGE", [], first, second)?.data).toEqual({
    items: [{ imageId: second, title: "Novo card" }],
  });
  expect(newBuilderBlock("CARDS", "PAGE", [], first)).toBeUndefined();
  expect(newBuilderBlock("CARDS", "ARTICLE", [], first, second)).toBeUndefined();
});

it("has no semantic axe violations for linked and static cards (without contrast/layout)", async () => {
  const main = document.createElement("main");
  main.innerHTML = `<h1>Portal</h1>${render()}`;
  document.body.append(main);
  try {
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    main.remove();
  }
});
