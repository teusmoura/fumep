// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { CarouselBlockEditor } from "../editors/carousel-block-editor";
import { frontendBlockRegistry } from "../block-registry";
import { newBuilderBlock } from "../builder-state";
import { CarouselBlockRenderer } from "./carousel-block-renderer";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const block = () => ({
  id: first,
  type: "CAROUSEL",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    items: [
      {
        imageId: first,
        alt: "Fachada <script>literal</script>",
        caption: "Entrada",
        url: "/etmsl",
      },
      { imageId: second, alt: "Laboratório" },
    ],
  },
});
const image = (id: string) => ({
  id,
  type: "IMAGE",
  processingStatus: "READY",
  deletionStatus: "NONE",
  mimeType: "image/webp",
  width: 960,
  height: 640,
  src: `/media/carousel/${id}.webp`,
  altText: null,
});
const images = [image(first), image(second)];
const render = (value: unknown = block(), resolved: readonly unknown[] = images) =>
  renderToStaticMarkup(<CarouselBlockRenderer block={value} images={resolved} />);

it("SSR renders the first slide and accessible controls with escaped alt/caption", async () => {
  const html = render({ ...block(), anchor: "galeria" });
  expect(html).toContain('id="galeria"');
  expect(html).toContain('aria-roledescription="carrossel"');
  expect(html).toContain('href="/etmsl"');
  expect(html).toContain('alt="Fachada &lt;script&gt;literal&lt;/script&gt;"');
  expect(html).toContain('aria-label="Slide anterior"');
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

it("fails closed when hidden, malformed or any resolved image is missing/unsafe, or alt blank", () => {
  expect(render({ ...block(), isVisible: false })).toBe("");
  expect(render({ ...block(), schemaVersion: 2 })).toBe("");
  expect(render(block(), [image(first)])).toBe("");
  expect(
    render(block(), [{ ...image(first), src: "http://minio:9000/internal" }, image(second)]),
  ).toBe("");
  expect(render({ ...block(), data: { items: [{ imageId: first, alt: " " }] } })).toBe("");
});

it("registers CAROUSEL in PAGE/ARTICLE and creates draft only with an image", () => {
  for (const context of ["PAGE", "ARTICLE"] as const) {
    const definition = frontendBlockRegistry.get("CAROUSEL", 1, context)!;
    expect(definition.renderer).toBe(CarouselBlockRenderer);
    expect(definition.editor).toBe(CarouselBlockEditor);
    expect(newBuilderBlock("CAROUSEL", context, [], first, second, "Laboratório")?.data).toEqual({
      items: [{ imageId: second, alt: "Laboratório" }],
    });
    expect(newBuilderBlock("CAROUSEL", context, [], first)).toBeUndefined();
  }
});

it("changes slides by buttons and keyboard without autoplay", async () => {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  try {
    await act(() => root.render(<CarouselBlockRenderer block={block()} images={images} />));
    const figures = [...main.querySelectorAll("figure")];
    expect(figures.map((figure) => figure.hidden)).toEqual([false, true]);
    await act(() =>
      main.querySelector<HTMLButtonElement>('button[aria-label="Próximo slide"]')!.click(),
    );
    expect(figures.map((figure) => figure.hidden)).toEqual([true, false]);
    await act(() => {
      main
        .querySelector("section")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    });
    expect(figures.map((figure) => figure.hidden)).toEqual([false, true]);
    await act(() =>
      main.querySelector<HTMLButtonElement>('button[aria-label="Mostrar slide 2"]')!.click(),
    );
    expect(figures.map((figure) => figure.hidden)).toEqual([true, false]);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});
