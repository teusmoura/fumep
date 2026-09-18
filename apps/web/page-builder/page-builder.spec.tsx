// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import axe from "axe-core";
import { PageBuilder } from "./page-builder";
import { newBuilderBlock } from "./builder-state";
const id = "11111111-1111-4111-8111-111111111111";
const image = {
  id,
  type: "IMAGE",
  originalFilename: "fixture.png",
  mimeType: "image/png",
  sizeBytes: 68,
  categoryId: null,
  categoryName: null,
  processingStatus: "READY",
  altText: "Fachada",
  caption: null,
  width: 1,
  height: 1,
  createdAt: "2026-09-17T12:00:00.000Z",
};
const roots: Root[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});
async function mount(onApply = vi.fn(), images: unknown[] = [image]) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  roots.push(root);
  await act(() =>
    root.render(
      <>
        <h1>Draft</h1>
        <PageBuilder context="PAGE" initialBlocks={[]} images={images} onApply={onApply} />
      </>,
    ),
  );
  return { main, onApply };
}
async function click(main: HTMLElement, name: string) {
  const button = [...main.querySelectorAll("button")].find((b) => b.textContent === name)!;
  await act(() => button.click());
}
async function apply(main: HTMLElement) {
  await act(() =>
    main
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
it("rejects invalid initial blocks and enforces ARTICLE and missing media in the UI", () => {
  const hero = newBuilderBlock("HERO", "PAGE", [], id)!;
  expect(
    renderToStaticMarkup(
      <PageBuilder context="ARTICLE" initialBlocks={[hero]} onApply={() => {}} />,
    ),
  ).toContain("não foram substituídos");
  const html = renderToStaticMarkup(
    <PageBuilder context="ARTICLE" initialBlocks={[]} onApply={() => {}} />,
  );
  expect(html).not.toContain("Adicionar HERO");
  expect(html).toContain("Adicionar TEXT");
  expect(html).toContain("Adicionar IMAGE");
  expect(html).toContain("disabled");
});
it("adds TEXT/HERO/IMAGE through their validated editors without altering the initial data", async () => {
  const { main, onApply } = await mount();
  for (const type of ["TEXT", "HERO", "IMAGE"]) {
    await click(main, `Adicionar ${type}`);
    const candidate = main.querySelector('section[aria-label="Novo bloco"]')!;
    await act(async () =>
      candidate
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
  }
  expect(onApply).toHaveBeenCalledTimes(3);
  const blocks = onApply.mock.calls[2]![0];
  expect(blocks.map((b: { type: string }) => b.type)).toEqual(["TEXT", "HERO", "IMAGE"]);
  expect(blocks.map((b: { position: number }) => b.position)).toEqual([0, 1, 2]);
  expect(new Set(blocks.map((b: { id: string }) => b.id)).size).toBe(3);
  expect(blocks[2].data).toEqual({ imageId: id, decorative: false });
  expect(main.querySelector('section[aria-label="Novo bloco"]')).toBeNull();
  expect(document.activeElement?.getAttribute("role")).toBe("status");
});
it("retains failed additions for correction/retry and blocks concurrent callbacks", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
  const { main } = await mount(onApply);
  await click(main, "Adicionar HERO");
  await apply(main);
  expect(main.textContent).toContain("continuam no editor");
  expect(main.querySelector('section[aria-label="Novo bloco"]')).not.toBeNull();
  await apply(main);
  await apply(main);
  expect(onApply).toHaveBeenCalledTimes(2);
  expect(main.querySelector("fieldset")?.disabled).toBe(true);
  await act(() => resolve());
  expect(main.querySelector('section[aria-label="Novo bloco"]')).toBeNull();
});
it("provides accessible empty and active drafts with native named controls", async () => {
  const { main } = await mount();
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
  await click(main, "Adicionar IMAGE");
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
});
