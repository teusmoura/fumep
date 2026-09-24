// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { StatisticsBlockEditor } from "../editors/statistics-block-editor";
import { StatisticsBlockRenderer } from "./statistics-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "STATISTICS",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    items: [
      { value: "98%", label: "Aprovação", description: "Turma <script>literal</script>" },
      { value: "1,2 mil", label: "Alunos" },
    ],
  },
});
const render = (value: unknown = block()) =>
  renderToStaticMarkup(<StatisticsBlockRenderer block={value} />);

it("renders a named static list with escaped text and no motion", async () => {
  const html = render({ ...block(), anchor: "indicadores" });
  expect(html).toContain('id="indicadores"');
  expect(html).toContain('aria-label="Indicadores"');
  expect(html).toContain("<ul>");
  expect(html).toContain("Turma &lt;script&gt;literal&lt;/script&gt;");
  expect(html).not.toContain("<script>");
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

it("fails closed for hidden, malformed and unsupported blocks", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render({ ...block(), schemaVersion: 2 })).toBe("");
  expect(render({ ...block(), data: { items: [] } })).toBe("");
});

it("registers STATISTICS only for PAGE with a valid initial draft", () => {
  const definition = frontendBlockRegistry.get("STATISTICS", 1, "PAGE")!;
  expect(definition.renderer).toBe(StatisticsBlockRenderer);
  expect(definition.editor).toBe(StatisticsBlockEditor);
  expect(frontendBlockRegistry.get("STATISTICS", 1, "ARTICLE")).toBeUndefined();
  expect(newBuilderBlock("STATISTICS", "PAGE", [], id)?.data).toEqual({
    items: [{ value: "0", label: "Novo indicador" }],
  });
});
