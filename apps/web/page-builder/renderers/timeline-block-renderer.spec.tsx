// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { TimelineBlockEditor } from "../editors/timeline-block-editor";
import { TimelineBlockRenderer } from "./timeline-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "TIMELINE",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    title: "História",
    items: [
      { date: "2025", title: "Início", description: "Primeiro marco <script>literal</script>" },
      { title: "Expansão", description: "Segundo marco" },
    ],
  },
});
const render = (value: unknown = block()) =>
  renderToStaticMarkup(<TimelineBlockRenderer block={value} />);

it("renders ordered accessible milestones with escaped text", async () => {
  const html = render({ ...block(), anchor: "historia" });
  expect(html).toContain('id="historia"');
  expect(html).toContain("<ol>");
  expect(html).toContain("<h3>Início</h3>");
  expect(html).toContain("Primeiro marco &lt;script&gt;literal&lt;/script&gt;");
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

it("registers TIMELINE only for PAGE with a valid initial draft", () => {
  const definition = frontendBlockRegistry.get("TIMELINE", 1, "PAGE")!;
  expect(definition.renderer).toBe(TimelineBlockRenderer);
  expect(definition.editor).toBe(TimelineBlockEditor);
  expect(frontendBlockRegistry.get("TIMELINE", 1, "ARTICLE")).toBeUndefined();
  expect(newBuilderBlock("TIMELINE", "PAGE", [], id)?.data).toEqual({
    items: [{ title: "Novo marco", description: "Nova descrição" }],
  });
});
