// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import axe from "axe-core";
import { contrastRatio } from "@fumep/validation";
import { TextBlockRenderer } from "./text-block-renderer";
import { HeroBlockRenderer } from "./hero-block-renderer";
import { ImageBlockRenderer } from "./image-block-renderer";
import { newBuilderBlock } from "../builder-state";
const id = "11111111-1111-4111-8111-111111111111";
const descriptor = {
  id,
  type: "IMAGE",
  processingStatus: "READY",
  deletionStatus: "NONE",
  mimeType: "image/png",
  width: 1,
  height: 1,
  src: "/media/fixtures/bg.png",
};
const theme = {
  id,
  slug: "etmsl",
  primary: "#123456",
  primaryForeground: "#ffffff",
  accent: "#000000",
  accentForeground: "#ffffff",
  appearanceDefault: "LIGHT",
};
it("renders default/light and a validated institution pair without trusting arbitrary styles", () => {
  const text = newBuilderBlock("TEXT", "PAGE", [], id)!;
  for (const background of ["DEFAULT", "LIGHT", "INSTITUTION"] as const)
    expect(
      renderToStaticMarkup(<TextBlockRenderer block={{ ...text, background }} theme={theme} />),
    ).toContain(`data-background="${background}"`);
  const institutional = { ...text, background: "INSTITUTION" };
  expect(renderToStaticMarkup(<TextBlockRenderer block={institutional} />)).toBe("");
  expect(
    renderToStaticMarkup(
      <TextBlockRenderer
        block={institutional}
        theme={{ ...theme, primaryForeground: theme.primary }}
      />,
    ),
  ).toBe("");
  expect(contrastRatio("#f3f4f6", "#1f2937")).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio("#111827", "#f9fafb")).toBeGreaterThanOrEqual(4.5);
});
it("shares decorative image/panel rendering across existing blocks, preserving anchors", async () => {
  const main = document.createElement("main");
  for (const type of ["TEXT", "HERO", "IMAGE"] as const) {
    const initial = newBuilderBlock(type, "PAGE", [], id, id)!;
    const block = {
      ...initial,
      background: "IMAGE",
      backgroundMediaId: id,
      anchor: "conteudo",
      ...(type === "IMAGE" ? { data: { imageId: id, decorative: true } } : {}),
    };
    const Renderer =
      type === "TEXT"
        ? TextBlockRenderer
        : type === "HERO"
          ? HeroBlockRenderer
          : ImageBlockRenderer;
    const html = renderToStaticMarkup(
      <Renderer block={block} image={descriptor} backgroundImage={descriptor} />,
    );
    expect(html).toContain('data-background="IMAGE"');
    expect(html).toContain('alt=""');
    expect(html).toContain('id="conteudo"');
    expect(renderToStaticMarkup(<Renderer block={block} image={descriptor} />)).toBe("");
    expect(
      renderToStaticMarkup(
        <Renderer
          block={{ ...block, isVisible: false }}
          image={descriptor}
          backgroundImage={descriptor}
        />,
      ),
    ).toBe("");
    main.innerHTML = html;
    document.body.append(main);
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
    main.remove();
  }
});
it("refuses mismatched/unready/deleting/unsafe background descriptors", () => {
  const text = {
    ...newBuilderBlock("TEXT", "PAGE", [], id)!,
    background: "IMAGE",
    backgroundMediaId: id,
  };
  for (const invalid of [
    { ...descriptor, id: crypto.randomUUID() },
    { ...descriptor, processingStatus: "PENDING" },
    { ...descriptor, deletionStatus: "REQUESTED" },
    { ...descriptor, src: "http://minio:9000/private" },
    { ...descriptor, src: "/media/../private" },
  ])
    expect(renderToStaticMarkup(<TextBlockRenderer block={text} backgroundImage={invalid} />)).toBe(
      "",
    );
});
