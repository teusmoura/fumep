import { describe, expect, it } from "vitest";
import {
  blockRegistry,
  TEXT_V1_LIMITS,
  textBlockDataSchemaV1,
  textBlockSchemaV1,
  textDocumentSchemaV1,
  textLinkUrlSchemaV1,
} from "./index.js";
const run = (text = "Texto") => ({ type: "text", text });
const data = (nodes: unknown[] = []) => ({ title: "Instituição", content: { type: "doc", nodes } });
const envelope = () => ({
  id: crypto.randomUUID(),
  type: "TEXT",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: data(),
});
describe("TEXT v1 safe rich document", () => {
  it("supports every canonical text structure and formatting without registering an incomplete block", () => {
    const value = data([
      {
        type: "paragraph",
        children: [
          run(),
          { ...run("ênfase"), marks: ["bold", "italic"] },
          { type: "link", url: "/etmsl/cursos", children: [run("Cursos")] },
        ],
      },
      { type: "heading", level: 2, children: [run("Título")] },
      { type: "highlight", children: [run("Destaque")] },
      { type: "orderedList", items: [{ children: [run("Primeiro")] }] },
      { type: "bulletList", items: [{ children: [run("Item")] }] },
      { type: "table", caption: "Horários", headers: ["Curso", "Hora"], rows: [["Técnico", "8h"]] },
    ]);
    expect(textBlockDataSchemaV1.parse(value)).toEqual(value);
    expect(textBlockSchemaV1.safeParse({ ...envelope(), data: value }).success).toBe(true);
    expect(blockRegistry.list()).toEqual([]);
  });
  it("requires exact TEXT/version 1, composes common fields/refinements and permits empty structured drafts", () => {
    expect(textBlockSchemaV1.safeParse(envelope()).success).toBe(true);
    for (const patch of [
      { type: "HERO" },
      { schemaVersion: 2 },
      { schemaVersion: undefined },
      { position: -1 },
      { background: "IMAGE" },
      { css: "free" },
    ])
      expect(textBlockSchemaV1.safeParse({ ...envelope(), ...patch }).success).toBe(false);
    expect(
      textBlockSchemaV1.safeParse({
        ...envelope(),
        background: "IMAGE",
        backgroundMediaId: crypto.randomUUID(),
      }).success,
    ).toBe(true);
    expect(textBlockDataSchemaV1.safeParse({ content: { type: "doc", nodes: [] } }).success).toBe(
      true,
    );
  });
  it("allows safe navigation links and rejects script/data/protocol-relative/credentials/control-character links", () => {
    for (const url of [
      "https://fumep.org.br/cursos",
      "http://example.test/info",
      "/etmsl/cursos?busca=curso%20técnico",
      "#documentos",
    ])
      expect(textLinkUrlSchemaV1.safeParse(url).success).toBe(true);
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>",
      "vbscript:x",
      "//evil.test",
      "/\\evil.test",
      "https://user:password@example.test",
      "https://example.test/a\nb",
      "java\nscript:alert(1)",
      "javascript&#58;alert(1)",
      "javascript%3Aalert(1)",
      "relative/path",
      "#",
      " https://example.test",
      "file:///etc/passwd",
    ]) {
      expect(textLinkUrlSchemaV1.safeParse(url).success).toBe(false);
      expect(
        textBlockDataSchemaV1.safeParse(
          data([{ type: "paragraph", children: [{ type: "link", url, children: [run()] }] }]),
        ).success,
      ).toBe(false);
    }
  });
  it("rejects arbitrary HTML/iframe/script/styles/marks, nested blocks and unsupported heading levels", () => {
    for (const node of [
      { type: "html", html: "<script>alert(1)</script>" },
      { type: "iframe", url: "https://example.test" },
      { type: "paragraph", children: [run()], style: { color: "red" } },
      { type: "paragraph", children: [{ ...run(), marks: ["underline"] }] },
      { type: "paragraph", children: [{ ...run(), marks: ["bold", "bold"] }] },
      { type: "paragraph", children: [{ type: "paragraph", children: [run()] }] },
      { type: "heading", level: 1, children: [run()] },
      {
        type: "paragraph",
        children: [
          { type: "link", url: "/", children: [{ type: "link", url: "/", children: [run()] }] },
        ],
      },
    ])
      expect(textBlockDataSchemaV1.safeParse(data([node])).success).toBe(false);
    for (const content of ["<p>HTML livre</p>", { type: "doc", nodes: [], html: "<script>" }])
      expect(textBlockDataSchemaV1.safeParse({ content }).success).toBe(false);
    expect(textBlockDataSchemaV1.safeParse({ ...data(), fontFamily: "arbitrary" }).success).toBe(
      false,
    );
    expect(
      textBlockDataSchemaV1.safeParse(
        data([{ type: "paragraph", children: [run("<script> literal — texto, não HTML")] }]),
      ).success,
    ).toBe(true);
  });
  it("requires rectangular simple tables with nonempty header labels", () => {
    for (const table of [
      { type: "table", headers: ["A", "B"], rows: [["one"]] },
      { type: "table", headers: [" "], rows: [["one"]] },
      { type: "table", headers: [], rows: [] },
      { type: "table", headers: ["A"], rows: [["one"]], css: "free" },
    ])
      expect(textBlockDataSchemaV1.safeParse(data([table])).success).toBe(false);
    const result = textBlockDataSchemaV1.safeParse(
      data([{ type: "table", headers: ["A", "B"], rows: [["one"]] }]),
    );
    if (!result.success)
      expect(
        result.error.issues.some((issue) => issue.path.join(".") === "content.nodes.0.rows.0"),
      ).toBe(true);
  });
  it("bounds node/run/list/table/document sizes and rejects unsupported controls", () => {
    const paragraph = { type: "paragraph", children: [run()] };
    for (const nodes of [
      Array.from({ length: TEXT_V1_LIMITS.nodes + 1 }, () => paragraph),
      [
        {
          type: "paragraph",
          children: Array.from({ length: TEXT_V1_LIMITS.inlineNodes + 1 }, () => run()),
        },
      ],
      [{ type: "paragraph", children: [run("a".repeat(TEXT_V1_LIMITS.runCharacters + 1))] }],
      [
        {
          type: "bulletList",
          items: Array.from({ length: TEXT_V1_LIMITS.listItems + 1 }, () => ({
            children: [run()],
          })),
        },
      ],
      [
        {
          type: "table",
          headers: ["A"],
          rows: Array.from({ length: TEXT_V1_LIMITS.tableRows + 1 }, () => ["a"]),
        },
      ],
      [{ type: "paragraph", children: [run("bad\u0000text")] }],
    ])
      expect(textBlockDataSchemaV1.safeParse(data(nodes)).success).toBe(false);
    expect(
      textDocumentSchemaV1.safeParse({
        type: "doc",
        nodes: [
          { type: "paragraph", children: Array.from({ length: 21 }, () => run("a".repeat(5000))) },
        ],
      }).success,
    ).toBe(false);
    expect(textBlockDataSchemaV1.safeParse({ ...data(), title: "a".repeat(201) }).success).toBe(
      false,
    );
  });
  it("counts total document characters across paragraphs, URLs, lists and table cells/headers", () => {
    const runs = Array.from({ length: 20 }, () => run("a".repeat(5000)));
    expect(
      textBlockDataSchemaV1.safeParse(data([{ type: "paragraph", children: runs }])).success,
    ).toBe(true);
    expect(
      textBlockDataSchemaV1.safeParse(data([{ type: "paragraph", children: [...runs, run("a")] }]))
        .success,
    ).toBe(false);
    expect(
      textBlockDataSchemaV1.safeParse(
        data([
          {
            type: "paragraph",
            children: [...runs, { type: "link", url: "/", children: [run("")] }],
          },
        ]),
      ).success,
    ).toBe(false);
    expect(
      textBlockDataSchemaV1.safeParse(
        data([
          {
            type: "orderedList",
            items: Array.from({ length: 21 }, () => ({ children: [run("a".repeat(5000))] })),
          },
        ]),
      ).success,
    ).toBe(false);
    expect(
      textBlockDataSchemaV1.safeParse(
        data([
          {
            type: "table",
            headers: ["A"],
            rows: Array.from({ length: 20 }, () => ["a".repeat(5000)]),
          },
        ]),
      ).success,
    ).toBe(false);
  });
});
