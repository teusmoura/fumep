// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { DocumentBlockEditor } from "../editors/document-block-editor";
import { DocumentBlockRenderer } from "./document-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "DOCUMENT",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    mediaId: id,
    title: "Edital",
    description: "Leia <script>literal</script>",
    buttonLabel: "Visualizar PDF",
  },
});
const media = () => ({
  id,
  type: "DOCUMENT",
  processingStatus: "READY",
  deletionStatus: "NONE",
  mimeType: "application/pdf",
  originalFilename: "edital.pdf",
  href: "/media/documents/edital.pdf",
});
const render = (value: unknown = block(), document: unknown = media()) =>
  renderToStaticMarkup(<DocumentBlockRenderer block={value} document={document} />);

it("renders escaped PDF title/description and safe native link", async () => {
  const html = render({ ...block(), anchor: "edital" });
  expect(html).toContain('id="edital"');
  expect(html).toContain("Leia &lt;script&gt;literal&lt;/script&gt;");
  expect(html).toContain('href="/media/documents/edital.pdf"');
  expect(html).not.toContain("<iframe");
  const main = document.createElement("main");
  main.innerHTML = `<h1>Portal</h1>${html}`;
  document.body.append(main);
  try {
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    main.remove();
  }
});
it("fails closed for unavailable/wrong PDF and registers in PAGE/ARTICLE", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render(block(), { ...media(), id: "22222222-2222-4222-8222-222222222222" })).toBe("");
  expect(render(block(), { ...media(), mimeType: "text/html" })).toBe("");
  expect(frontendBlockRegistry.get("DOCUMENT", 1, "PAGE")?.editor).toBe(DocumentBlockEditor);
  expect(frontendBlockRegistry.get("DOCUMENT", 1, "ARTICLE")?.renderer).toBe(DocumentBlockRenderer);
  expect(newBuilderBlock("DOCUMENT", "PAGE", [], id)).toBeUndefined();
  expect(newBuilderBlock("DOCUMENT", "ARTICLE", [], id, undefined, undefined, id)?.data).toEqual({
    mediaId: id,
  });
});
