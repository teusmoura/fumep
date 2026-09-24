// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { TabsBlockEditor } from "../editors/tabs-block-editor";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { TabsBlockRenderer } from "./tabs-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const content = (text: string) => ({
  type: "doc",
  nodes: [{ type: "paragraph", children: [{ type: "text", text }] }],
});
const block = () => ({
  id,
  type: "TABS",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    tabs: [
      { label: "Primeira", content: content("Conteúdo <script>literal</script>") },
      { label: "Segunda", content: content("Outra resposta") },
    ],
  },
});
const render = (value: unknown = block()) =>
  renderToStaticMarkup(<TabsBlockRenderer block={value} />);

it("renders linked tab/tabpanel semantics and escaped text", () => {
  const html = render({ ...block(), anchor: "abas" });
  expect(html).toContain('class="tabs-block" id="abas"');
  expect(html).toContain('role="tablist"');
  expect(html).toContain('role="tab"');
  expect(html).toContain('role="tabpanel"');
  expect(html).toContain("Conteúdo &lt;script&gt;literal&lt;/script&gt;");
  expect(html).not.toContain("<script>");
});

it("fails closed for hidden, unsupported version and unsafe data", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render({ ...block(), schemaVersion: 2 })).toBe("");
  expect(render({ ...block(), data: { tabs: [] } })).toBe("");
});

it("registers TABS v1 only in PAGE and creates its minimum draft", () => {
  const definition = frontendBlockRegistry.get("TABS", 1, "PAGE")!;
  expect(definition.renderer).toBe(TabsBlockRenderer);
  expect(definition.editor).toBe(TabsBlockEditor);
  expect(frontendBlockRegistry.get("TABS", 1, "ARTICLE")).toBeUndefined();
  expect(newBuilderBlock("TABS", "PAGE", [], id)?.data).toMatchObject({
    tabs: [{ label: "Nova aba" }],
  });
});

it("supports arrow, Home and End keyboard navigation with focus and aria selection", async () => {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  try {
    await act(() =>
      root.render(
        <>
          <h1>Portal</h1>
          <TabsBlockRenderer block={block()} />
        </>,
      ),
    );
    const tabs = [...main.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual(["true", "false"]);
    await act(() => {
      tabs[0]!.focus();
      tabs[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[1]);
    await act(() => {
      tabs[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    });
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
    await act(() => {
      tabs[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    });
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});
