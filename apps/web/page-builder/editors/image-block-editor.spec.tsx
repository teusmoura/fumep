// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import axe from "axe-core";
import { imageBlockDataSchemaV1 } from "@fumep/validation";
import { ImageBlockEditor } from "./image-block-editor";
const id = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const image = (altText: string | null = "Fachada padrão") => ({
  id,
  type: "IMAGE",
  originalFilename: "fachada.webp",
  mimeType: "image/webp",
  sizeBytes: 1000,
  categoryId: null,
  categoryName: null,
  processingStatus: "READY",
  altText,
  caption: null,
  width: 1200,
  height: 800,
  createdAt: "2026-09-17T12:00:00.000Z",
});
const roots: Root[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});
async function mount(
  onApply = vi.fn(),
  disabled = false,
  fallback: string | null = "Fachada padrão",
) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  roots.push(root);
  await act(() =>
    root.render(
      <>
        <h1>Editor IMAGE</h1>
        <ImageBlockEditor
          initialValue={{ imageId: id, decorative: false }}
          images={[
            image(fallback),
            { ...image(null), id: otherId, originalFilename: "outra.webp" },
          ]}
          onApply={onApply}
          disabled={disabled}
        />
      </>,
    ),
  );
  return { main, onApply };
}
async function change(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const prototype =
    element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
  await act(() => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }),
    );
  });
}
async function submit(main: HTMLElement) {
  await act(() =>
    main
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
it("refuses malformed initial data without replacing it", () => {
  expect(
    renderToStaticMarkup(
      <ImageBlockEditor initialValue={{ src: "internal" }} onApply={() => {}} />,
    ),
  ).toContain("não foram substituídos");
});
it("uses only valid fallback, retains UUID reference without copying metadata, and clears contextual alt on image change", async () => {
  const { main, onApply } = await mount();
  await submit(main);
  expect(onApply.mock.calls[0]![0]).toEqual({ imageId: id, decorative: false });
  const alt = [...main.querySelectorAll<HTMLInputElement>("input")].find((item) =>
    item.id.endsWith("-alt"),
  )!;
  await change(alt, "Contexto da primeira imagem");
  await change(main.querySelector("select")!, otherId);
  await submit(main);
  expect(onApply).toHaveBeenCalledOnce();
  expect(alt.value).toBe("");
  await change(alt, "Contexto da outra imagem");
  await submit(main);
  expect(onApply.mock.calls[1]![0]).toEqual({
    imageId: otherId,
    decorative: false,
    alt: "Contexto da outra imagem",
  });
  expect(document.activeElement).toBe(main.querySelector('[role="status"]'));
});
it("rejects absent/oversized/unsafe fallback until contextual alt or explicit decoration", async () => {
  for (const fallback of [null, " ", "a".repeat(301), "unsafe\u0000"]) {
    const { main, onApply } = await mount(undefined, false, fallback);
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    await act(() => main.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await submit(main);
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply.mock.calls[0]![0]).toMatchObject({ decorative: true, alt: "" });
  }
});
it("validates image links, requires caption for decorative links and retains invalid draft", async () => {
  const { main, onApply } = await mount();
  await act(() => main.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  await act(() =>
    [...main.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')][1]!.click(),
  );
  await submit(main);
  expect(onApply).not.toHaveBeenCalled();
  await change(main.querySelector("textarea")!, "Conheça a escola");
  const link = [...main.querySelectorAll<HTMLInputElement>("input")].find((item) =>
    item.id.endsWith("-link"),
  )!;
  await change(link, "javascript:alert(1)");
  await submit(main);
  expect(onApply).not.toHaveBeenCalled();
  expect(link.value).toBe("javascript:alert(1)");
  await change(link, "/etmsl");
  await submit(main);
  expect(imageBlockDataSchemaV1.safeParse(onApply.mock.calls[0]![0]).success).toBe(true);
});
it("blocks disabled/concurrent apply and retains draft on callback failure", async () => {
  const disabled = await mount(undefined, true);
  await submit(disabled.main);
  expect(disabled.onApply).not.toHaveBeenCalled();
  let finish!: () => void;
  const callback = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    )
    .mockRejectedValueOnce(new Error("fixture"));
  const { main } = await mount(callback);
  await act(() => {
    for (let index = 0; index < 2; index++)
      main
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(callback).toHaveBeenCalledOnce();
  expect(main.querySelector("fieldset")!.disabled).toBe(true);
  await act(() => finish());
  await submit(main);
  expect(main.textContent).toContain("Suas alterações continuam");
});
it("has no semantic axe violations for alt/fallback/invalid link feedback (no contrast/layout)", async () => {
  const { main } = await mount(undefined, false, null);
  await act(() =>
    [...main.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')][1]!.click(),
  );
  await submit(main);
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
});
