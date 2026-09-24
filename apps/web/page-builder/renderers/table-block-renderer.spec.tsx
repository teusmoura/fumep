// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { TableBlockEditor } from "../editors/table-block-editor";
import { TableBlockRenderer } from "./table-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "TABLE",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    caption: "Cursos",
    headers: ["Nome", "Duração"],
    rows: [["Técnico <script>", "2 anos"]],
  },
});
const render = (value: unknown = block()) =>
  renderToStaticMarkup(<TableBlockRenderer block={value} />);

it("renders semantic accessible table and escapes all cells", async () => {
  const html = render({ ...block(), anchor: "cursos" });
  expect(html).toContain('id="cursos"');
  expect(html).toContain('role="region"');
  expect(html).toContain("<caption>Cursos</caption>");
  expect(html).toContain('scope="col"');
  expect(html).toContain("Técnico &lt;script&gt;");
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
  expect(render({ ...block(), data: { headers: ["A", "B"], rows: [["a"]] } })).toBe("");
});

it("registers TABLE in PAGE and ARTICLE with a valid initial draft", () => {
  for (const context of ["PAGE", "ARTICLE"] as const) {
    const definition = frontendBlockRegistry.get("TABLE", 1, context)!;
    expect(definition.renderer).toBe(TableBlockRenderer);
    expect(definition.editor).toBe(TableBlockEditor);
    expect(newBuilderBlock("TABLE", context, [], id)?.data).toEqual({
      headers: ["Coluna 1"],
      rows: [[""]],
    });
  }
});
