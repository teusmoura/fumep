// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { FaqBlockEditor } from "../editors/faq-block-editor";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { FaqBlockRenderer } from "./faq-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "FAQ",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    title: "Dúvidas",
    items: [{ question: "Curso <b>aberto</b>?", answer: "Sim <script>teste</script>." }],
  },
});
const render = (value: unknown = block()) =>
  renderToStaticMarkup(<FaqBlockRenderer block={value} />);

it("renders an accessible native accordion with escaped text", () => {
  const html = render({ ...block(), anchor: "duvidas" });
  expect(html).toContain('class="faq-block" id="duvidas"');
  expect(html).toContain("<details>");
  expect(html).toContain("<summary>Curso &lt;b&gt;aberto&lt;/b&gt;?</summary>");
  expect(html).toContain("Sim &lt;script&gt;teste&lt;/script&gt;.");
  expect(html).not.toContain("<script>");
});

it("fails closed for hidden, malformed and oversized content", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render({ ...block(), schemaVersion: 2 })).toBe("");
  expect(render({ ...block(), data: { items: [] } })).toBe("");
});

it("registers FAQ v1 only in PAGE and creates its minimum draft", () => {
  const definition = frontendBlockRegistry.get("FAQ", 1, "PAGE")!;
  expect(definition.renderer).toBe(FaqBlockRenderer);
  expect(definition.editor).toBe(FaqBlockEditor);
  expect(frontendBlockRegistry.get("FAQ", 1, "ARTICLE")).toBeUndefined();
  expect(newBuilderBlock("FAQ", "PAGE", [], id)?.data).toEqual({
    items: [{ question: "Nova pergunta", answer: "Nova resposta" }],
  });
});

it("has no semantic axe violations with or without a title", async () => {
  for (const value of [block(), { ...block(), data: { ...block().data, title: undefined } }]) {
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
