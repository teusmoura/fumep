// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { CtaBlockEditor } from "../editors/cta-block-editor";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { CtaBlockRenderer } from "./cta-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "CTA",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    title: "Venha <script>estudar</script>",
    text: "Cursos abertos",
    buttonLabel: "Ver cursos",
    buttonUrl: "/etmsl",
  },
});
const render = (value: unknown = block()) =>
  renderToStaticMarkup(<CtaBlockRenderer block={value} />);

it("renders escaped CTA text and a named link", () => {
  const html = render({ ...block(), anchor: "inscricao" });
  expect(html).toContain('class="cta-block" id="inscricao"');
  expect(html).toContain("Venha &lt;script&gt;estudar&lt;/script&gt;");
  expect(html).toContain('href="/etmsl"');
  expect(html).toContain(">Ver cursos</a>");
  expect(html).not.toContain("<script>");
});

it("fails closed for invisible, unknown-version and unsafe content", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render({ ...block(), schemaVersion: 2 })).toBe("");
  expect(render({ ...block(), data: { ...block().data, buttonUrl: "javascript:alert(1)" } })).toBe(
    "",
  );
});

it("registers CTA v1 for PAGE and ARTICLE and creates a valid draft", () => {
  for (const context of ["PAGE", "ARTICLE"] as const) {
    const definition = frontendBlockRegistry.get("CTA", 1, context)!;
    expect(definition.renderer).toBe(CtaBlockRenderer);
    expect(definition.editor).toBe(CtaBlockEditor);
    expect(newBuilderBlock("CTA", context, [], id)?.data).toEqual({
      title: "Nova chamada",
      buttonLabel: "Saiba mais",
      buttonUrl: "/",
    });
  }
  expect(frontendBlockRegistry.get("CTA", 2)).toBeUndefined();
});

it("has no semantic axe violations", async () => {
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
