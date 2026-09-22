// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { CardsBlockEditor } from "./cards-block-editor";

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
    { imageId: first, title: "Primeiro" },
    { imageId: second, title: "Segundo", description: "Descrição", url: "/segundo" },
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
    root.render(<CardsBlockEditor initialValue={value} images={images} onApply={onApply} />),
  );
  return { main, root, onApply };
}
async function click(main: HTMLElement, label: string) {
  const button = [...main.querySelectorAll("button")].find((item) => item.textContent === label)!;
  await act(() => button.click());
}
async function change(control: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    control instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype;
  await act(() => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit(main: HTMLElement) {
  await act(async () => {
    main
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

it("adds/reorders image cards, retains a failed draft and prevents concurrent apply", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)));
  const { main, root } = await mount(onApply);
  try {
    await click(main, "Adicionar card");
    await click(main, "Subir card 3");
    await change(
      main.querySelectorAll<HTMLInputElement>('input[id$="-title"]')[0]!,
      "Primeiro editado",
    );
    await submit(main);
    expect(main.textContent).toContain("alterações continuam no editor");
    expect(main.querySelectorAll<HTMLInputElement>('input[id$="-title"]')[0]!.value).toBe(
      "Primeiro editado",
    );
    await submit(main);
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(main.querySelector("fieldset")?.hasAttribute("disabled")).toBe(true);
    await act(async () => resolve());
    expect(onApply.mock.calls[1]![0]).toEqual({
      items: [
        { imageId: first, title: "Primeiro editado" },
        { imageId: first, title: "Novo card" },
        { imageId: second, title: "Segundo", description: "Descrição", url: "/segundo" },
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

it("requires READY library images with fallback alt and safe links before applying", async () => {
  const value = { items: [{ imageId: first, title: "Curso" }] };
  const { main, root, onApply } = await mount(vi.fn(), value, [media(first, null), media(second)]);
  try {
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    expect(main.textContent).toContain("alts da Biblioteca");
    const selection = main.querySelector("select")!;
    await act(() => {
      selection.value = second;
      selection.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click(main, "Adicionar card");
    await click(main, "Remover card 2");
    const linkToggle = main.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    await act(() => linkToggle.click());
    const url = main.querySelector<HTMLInputElement>('input[id$="-url"]')!;
    await change(url, "javascript:alert(1)");
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    await change(url, "/curso");
    await submit(main);
    expect(onApply).toHaveBeenCalledWith({
      items: [{ imageId: second, title: "Curso", url: "/curso" }],
    });
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("rejects invalid initial collections and exposes the twelve-card limit", async () => {
  const thirteen = { items: Array.from({ length: 13 }, () => ({ imageId: first, title: "Card" })) };
  expect(
    renderToStaticMarkup(<CardsBlockEditor initialValue={thirteen} onApply={() => {}} />),
  ).toContain("conteúdo inicial CARDS v1 é inválido");
  const twelve = {
    items: Array.from({ length: 12 }, (_, index) => ({ imageId: first, title: `Card ${index}` })),
  };
  const { main, root } = await mount(vi.fn(), twelve, [media(first)]);
  try {
    expect(
      [...main.querySelectorAll("button")].find((item) => item.textContent === "Adicionar card")
        ?.disabled,
    ).toBe(true);
    expect(main.querySelectorAll("ol.cards-editor-items > li")).toHaveLength(12);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});
