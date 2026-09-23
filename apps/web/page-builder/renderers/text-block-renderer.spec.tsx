// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { blockRegistry, type TextBlockV1 } from "@fumep/validation";
import { TextBlockRenderer } from "./text-block-renderer";
import { frontendBlockRegistry } from "../block-registry";
import { TextBlockEditor } from "../editors/text-block-editor";
const run = (text: string) => ({ type: "text" as const, text });
it("renders optional valid anchor IDs only for visible validated TEXT", () => {
  expect(
    renderToStaticMarkup(<TextBlockRenderer block={{ ...block(), anchor: "documentos" }} />),
  ).toContain('id="documentos"');
  for (const value of [
    { ...block(), anchor: "#bad" },
    { ...block(), anchor: "documentos", isVisible: false },
  ])
    expect(renderToStaticMarkup(<TextBlockRenderer block={value} />)).toBe("");
});
function block(): TextBlockV1 {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    type: "TEXT",
    position: 0,
    isVisible: true,
    schemaVersion: 1,
    background: "DEFAULT",
    data: {
      title: "Informações",
      content: {
        type: "doc",
        nodes: [
          {
            type: "paragraph",
            children: [
              { ...run("Texto forte"), marks: ["bold", "italic"] },
              { type: "link", url: "/etmsl", children: [run("Cursos")] },
            ],
          },
          { type: "heading", level: 3, children: [run("Detalhes")] },
          { type: "highlight", children: [run("Atenção")] },
          { type: "orderedList", items: [{ children: [run("Primeiro")] }] },
          { type: "bulletList", items: [{ children: [run("Item")] }] },
          {
            type: "table",
            caption: "Cursos disponíveis",
            headers: ["Curso", "Turno"],
            rows: [["Técnico", "Manhã"]],
          },
        ],
      },
    },
  };
}
const render = (value: unknown) => renderToStaticMarkup(<TextBlockRenderer block={value} />);
it("renders all TEXT resources as semantic SSR without client state", () => {
  const html = render(block());
  expect(html).toContain("<h2>Informações</h2>");
  expect(html).toContain("<h3>Detalhes</h3>");
  expect(html).toContain("<strong><em>Texto forte</em></strong>");
  expect(html).toContain('<a href="/etmsl">Cursos</a>');
  expect(html).toContain("<ol><li>Primeiro</li></ol>");
  expect(html).toContain("<ul><li>Item</li></ul>");
  expect(html).toContain("<caption>Cursos disponíveis</caption>");
  expect(html).toContain('scope="col"');
  expect(html).toContain('tabindex="0"');
  expect(html).not.toContain("<script");
});
it("escapes literal markup in every text context without interpreting HTML", () => {
  const value = block();
  const literal = '<img src=x onerror="alert(1)">';
  value.data.title = literal;
  value.data.content.nodes = [
    {
      type: "paragraph",
      children: [
        run(literal),
        { type: "link", url: "https://example.org/?a=1&b=2", children: [run(literal)] },
      ],
    },
    { type: "table", caption: literal, headers: [literal], rows: [[literal]] },
  ];
  const html = render(value);
  expect(html).not.toContain("<img");
  expect(html).toContain("&lt;img");
  expect(html).toContain('href="https://example.org/?a=1&amp;b=2"');
});
it("fails closed for malformed data, unknown versions/types, scripts and hidden blocks", () => {
  for (const value of [
    null,
    {},
    { ...block(), schemaVersion: 2 },
    { ...block(), type: "HERO" },
    { ...block(), isVisible: false },
  ])
    expect(render(value)).toBe("");
  const value = block();
  value.data.content.nodes = [
    {
      type: "paragraph",
      children: [{ type: "link", url: "javascript:alert(1)", children: [run("Perigo")] }],
    },
  ];
  expect(render(value)).toBe("");
  expect(render({ ...block(), data: { html: "<script>" } })).toBe("");
});
it("keeps supported URL kinds in the same tab and does not create empty public links", () => {
  const value = block();
  value.data.content.nodes = [
    {
      type: "paragraph",
      children: [
        ...["https://example.org", "http://example.org", "/cramam", "#cursos"].map((url) => ({
          type: "link" as const,
          url,
          children: [run("Conheça")],
        })),
        { type: "link", url: "/", children: [run(" ")] },
      ],
    },
  ];
  const html = render(value);
  expect(html.match(/<a /g) ?? []).toHaveLength(4);
  expect(html).not.toContain("target=");
  expect(html).not.toContain('href="/"');
});
it("registers only the complete TEXT version for PAGE/ARTICLE without polluting API infrastructure", () => {
  expect(frontendBlockRegistry.list()).toHaveLength(7);
  const definition = frontendBlockRegistry.get("TEXT", 1, "PAGE")!;
  expect(definition.renderer).toBe(TextBlockRenderer);
  expect(definition.editor).toBe(TextBlockEditor);
  expect(definition.zodSchema.safeParse(block()).success).toBe(true);
  expect(frontendBlockRegistry.get("TEXT", 1, "ARTICLE")).toBe(definition);
  expect(frontendBlockRegistry.get("TEXT", 2)).toBeUndefined();
  expect(frontendBlockRegistry.get("HERO", 1, "ARTICLE")).toBeUndefined();
  expect(blockRegistry.list()).toEqual([]);
});
it("has no semantic axe violations for links/lists/headings/table (jsdom, no contrast)", async () => {
  const main = document.createElement("main");
  main.innerHTML = `<h1>Portal FUMEP</h1>${render(block())}`;
  document.body.append(main);
  try {
    const result = await axe.run(main, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  } finally {
    main.remove();
  }
});
