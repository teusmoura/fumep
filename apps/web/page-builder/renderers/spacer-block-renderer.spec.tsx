// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { SpacerBlockEditor } from "../editors/spacer-block-editor";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { SpacerBlockRenderer } from "./spacer-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const block = (size = "MEDIUM") => ({
  id,
  type: "SPACER",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: { size },
});
const render = (value: unknown) => renderToStaticMarkup(<SpacerBlockRenderer block={value} />);

it("renders only a decorative controlled space and preserves a valid anchor", () => {
  const html = render({ ...block("LARGE"), anchor: "separador" });
  expect(html).toContain(
    'class="spacer-block" data-size="LARGE" id="separador" aria-hidden="true"',
  );
  expect(html).not.toContain("style=");
});

it("fails closed for hidden, invalid, versioned and free-pixel data", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render(block("24px"))).toBe("");
  expect(render({ ...block(), schemaVersion: 2 })).toBe("");
  expect(render({ ...block(), data: { size: "MEDIUM", pixels: 32 } })).toBe("");
});

it("registers SPACER v1 only for PAGE", () => {
  const definition = frontendBlockRegistry.get("SPACER", 1, "PAGE")!;
  expect(definition.renderer).toBe(SpacerBlockRenderer);
  expect(definition.editor).toBe(SpacerBlockEditor);
  expect(frontendBlockRegistry.get("SPACER", 1, "ARTICLE")).toBeUndefined();
  expect(newBuilderBlock("SPACER", "PAGE", [], id)?.data).toEqual({ size: "MEDIUM" });
});

it("has no semantic axe violations", async () => {
  const main = document.createElement("main");
  main.innerHTML = `<h1>Portal</h1>${render(block())}`;
  document.body.append(main);
  try {
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    main.remove();
  }
});
