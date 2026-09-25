// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { VideoBlockEditor } from "../editors/video-block-editor";
import { VideoBlockRenderer } from "./video-block-renderer";

const id = "11111111-1111-4111-8111-111111111111";
const block = () => ({
  id,
  type: "VIDEO",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    url: "https://vimeo.com/123456789",
    title: "Aula <script>literal</script>",
    description: "Descrição",
  },
});
const render = (value: unknown = block()) =>
  renderToStaticMarkup(<VideoBlockRenderer block={value} />);

it("renders accessible SSR fallback without external iframe before consent", async () => {
  const html = render({ ...block(), anchor: "aula" });
  expect(html).toContain('id="aula"');
  expect(html).toContain("Aula &lt;script&gt;literal&lt;/script&gt;");
  expect(html).toContain("Carregar vídeo:");
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

it("loads only a generated provider iframe after activation", async () => {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  try {
    await act(() => root.render(<VideoBlockRenderer block={block()} />));
    expect(main.querySelector("iframe")).toBeNull();
    await act(() => main.querySelector("button")!.click());
    expect(main.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
    expect(main.querySelector("iframe")?.getAttribute("title")).toBe(
      "Aula <script>literal</script>",
    );
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("fails closed and registers VIDEO for PAGE and ARTICLE only", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render({ ...block(), data: { ...block().data, url: "https://evil.test" } })).toBe("");
  expect(frontendBlockRegistry.get("VIDEO", 1, "PAGE")?.editor).toBe(VideoBlockEditor);
  expect(frontendBlockRegistry.get("VIDEO", 1, "ARTICLE")?.renderer).toBe(VideoBlockRenderer);
  expect(newBuilderBlock("VIDEO", "ARTICLE", [], id)?.data).toEqual({
    url: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
    title: "Novo vídeo",
  });
});
