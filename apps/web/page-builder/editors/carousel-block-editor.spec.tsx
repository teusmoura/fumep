// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { CarouselBlockEditor } from "./carousel-block-editor";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const media = (id: string, altText: string | null = `Alt ${id}`) => ({
  id,
  type: "IMAGE",
  originalFilename: `${id}.png`,
  mimeType: "image/png",
  sizeBytes: 68,
  categoryId: null,
  categoryName: null,
  processingStatus: "READY",
  altText,
  caption: null,
  width: 1,
  height: 1,
  createdAt: "2026-09-22T12:00:00.000Z",
});
const initial = {
  items: [
    { imageId: first, alt: "Fachada" },
    { imageId: second, alt: "Laboratório", caption: "Ambiente" },
  ],
};
async function mount(
  onApply = vi.fn(),
  value: unknown = initial,
  images: readonly unknown[] = [media(first), media(second)],
) {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  await act(() =>
    root.render(<CarouselBlockEditor initialValue={value} images={images} onApply={onApply} />),
  );
  return { main, root, onApply };
}
async function click(main: HTMLElement, name: string) {
  const button = [...main.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === name,
  )!;
  await act(() => button.click());
}
async function change(control: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(() => {
    const prototype =
      control instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit(main: HTMLElement) {
  await act(async () =>
    main
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

it("adds/reorders slides, retains failed changes and blocks concurrent apply", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)));
  const { main, root } = await mount(onApply);
  try {
    await click(main, "Adicionar slide");
    await click(main, "Subir slide 3");
    await change(main.querySelector<HTMLInputElement>('input[id$="-0-alt"]')!, "Fachada editada");
    await submit(main);
    expect(main.textContent).toContain("alterações continuam no editor");
    await submit(main);
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(main.querySelector("fieldset")?.hasAttribute("disabled")).toBe(true);
    await act(async () => resolve());
    expect(onApply.mock.calls[1]![0]).toEqual({
      items: [
        { imageId: first, alt: "Fachada editada" },
        { imageId: first, alt: `Alt ${first}` },
        { imageId: second, alt: "Laboratório", caption: "Ambiente" },
      ],
    });
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("requires READY images, nonblank alt and safe URL before apply", async () => {
  const { main, root, onApply } = await mount(vi.fn(), { items: [{ imageId: first, alt: "" }] }, [
    media(first, null),
    media(second),
  ]);
  try {
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    await change(
      main.querySelector<HTMLInputElement>('input[id$="-0-alt"]')!,
      "Imagem informativa",
    );
    await act(() => main.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    const url = main.querySelector<HTMLInputElement>('input[id$="-url"]')!;
    await change(url, "javascript:alert(1)");
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    await change(url, "/curso");
    await submit(main);
    expect(onApply).toHaveBeenCalledWith({
      items: [{ imageId: first, alt: "Imagem informativa", url: "/curso" }],
    });
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("rejects invalid initial collections and enforces ten slides", async () => {
  expect(
    renderToStaticMarkup(<CarouselBlockEditor initialValue={{ items: [] }} onApply={() => {}} />),
  ).toContain("conteúdo inicial CAROUSEL v1 é inválido");
  const ten = { items: Array.from({ length: 10 }, () => ({ imageId: first, alt: "Slide" })) };
  const { main, root } = await mount(vi.fn(), ten, [media(first)]);
  try {
    expect(
      [...main.querySelectorAll("button")].find((item) => item.textContent === "Adicionar slide")
        ?.disabled,
    ).toBe(true);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});
