// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { MapBlockEditor } from "../editors/map-block-editor";
import { MapBlockRenderer } from "./map-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "MAP",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    title: "Campus",
    latitude: -22.735,
    longitude: -47.647,
    address: "Rua <script>literal</script>, 1",
    zoom: 16,
  },
});
const render = (value: unknown = block()) =>
  renderToStaticMarkup(<MapBlockRenderer block={value} />);

it("renders safe, accessible location without embedded third-party content", async () => {
  const html = render({ ...block(), anchor: "campus" });
  expect(html).toContain('id="campus"');
  expect(html).toContain("Rua &lt;script&gt;literal&lt;/script&gt;, 1");
  expect(html).toContain(
    "https://www.openstreetmap.org/?mlat=-22.735&amp;mlon=-47.647&amp;zoom=16",
  );
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).not.toContain("<iframe");
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

it("fails closed for hidden, malformed and unsupported map blocks", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render({ ...block(), schemaVersion: 2 })).toBe("");
  expect(render({ ...block(), data: { ...block().data, latitude: 999 } })).toBe("");
});

it("registers MAP only for PAGE with a valid initial draft", () => {
  const definition = frontendBlockRegistry.get("MAP", 1, "PAGE")!;
  expect(definition.renderer).toBe(MapBlockRenderer);
  expect(definition.editor).toBe(MapBlockEditor);
  expect(frontendBlockRegistry.get("MAP", 1, "ARTICLE")).toBeUndefined();
  expect(newBuilderBlock("MAP", "ARTICLE", [], id)).toBeUndefined();
  expect(newBuilderBlock("MAP", "PAGE", [], id)?.data).toEqual({
    latitude: 0,
    longitude: 0,
    address: "Novo endereço",
  });
});
