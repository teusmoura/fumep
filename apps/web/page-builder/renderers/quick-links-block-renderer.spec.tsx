// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { QuickLinksBlockEditor } from "../editors/quick-links-block-editor";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { QuickLinksBlockRenderer } from "./quick-links-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "QUICK_LINKS",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    title: "Acesso <script>rápido</script>",
    items: [
      { label: "Cursos", url: "/etmsl", icon: "ARROW_RIGHT" },
      { label: "Calendário", url: "#agenda" },
    ],
  },
});
const render = (value: unknown = block()) =>
  renderToStaticMarkup(<QuickLinksBlockRenderer block={value} />);

it("renders named safe links with escaped text and only decorative system icons", () => {
  const html = render({ ...block(), anchor: "atalhos" });
  expect(html).toContain('class="quick-links-block" id="atalhos"');
  expect(html).toContain('href="/etmsl"');
  expect(html).toContain('href="#agenda"');
  expect(html).toContain("Acesso &lt;script&gt;rápido&lt;/script&gt;");
  expect(html).not.toContain("<script>");
  expect(html.match(/<svg/g)).toHaveLength(1);
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('focusable="false"');
});

it("fails closed for hidden, malformed, unsafe and unknown-icon content", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render({ ...block(), schemaVersion: 2 })).toBe("");
  expect(
    render({ ...block(), data: { items: [{ label: "Ruim", url: "javascript:alert(1)" }] } }),
  ).toBe("");
  expect(render({ ...block(), data: { items: [{ label: "Ruim", url: "/", icon: "STAR" }] } })).toBe(
    "",
  );
});

it("registers complete QUICK_LINKS v1 only for PAGE and creates its minimum draft", () => {
  const definition = frontendBlockRegistry.get("QUICK_LINKS", 1, "PAGE")!;
  expect(definition.renderer).toBe(QuickLinksBlockRenderer);
  expect(definition.editor).toBe(QuickLinksBlockEditor);
  expect(definition.zodSchema.safeParse(block()).success).toBe(true);
  expect(frontendBlockRegistry.get("QUICK_LINKS", 1, "ARTICLE")).toBeUndefined();
  expect(frontendBlockRegistry.get("QUICK_LINKS", 2)).toBeUndefined();
  expect(newBuilderBlock("QUICK_LINKS", "PAGE", [], id)?.data).toEqual({
    items: [{ label: "Novo link", url: "/" }],
  });
});

it("has no semantic axe violations with or without a visible title", async () => {
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
