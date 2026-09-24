// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { TabsBlockEditor } from "./tabs-block-editor";

const content = (text: string) => ({
  type: "doc" as const,
  nodes: [{ type: "paragraph" as const, children: [{ type: "text" as const, text }] }],
});
const initial = {
  tabs: [
    { label: "Primeira", content: content("Primeiro conteúdo") },
    { label: "Segunda", content: content("Segundo conteúdo") },
  ],
};
async function mount(onApply = vi.fn()) {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  await act(() => root.render(<TabsBlockEditor initialValue={initial} onApply={onApply} />));
  return { main, root, onApply };
}
async function click(main: HTMLElement, name: string) {
  const button = [...main.querySelectorAll("button")].find((item) => item.textContent === name)!;
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

it("adds/reorders tabs, edits rich text, retains failures and blocks concurrent apply", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)));
  const { main, root } = await mount(onApply);
  try {
    await click(main, "Adicionar aba");
    await click(main, "Subir aba 3");
    await change(main.querySelector<HTMLInputElement>('input[id$="-label"]')!, "Editada");
    await change(main.querySelector<HTMLTextAreaElement>("textarea")!, "Conteúdo alterado");
    await submit(main);
    expect(main.textContent).toContain("alterações continuam no editor");
    await submit(main);
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(main.querySelector("fieldset")?.hasAttribute("disabled")).toBe(true);
    await act(async () => resolve());
    expect(onApply.mock.calls[1]![0].tabs.map((tab: { label: string }) => tab.label)).toEqual([
      "Editada",
      "Nova aba",
      "Segunda",
    ]);
    expect(onApply.mock.calls[1]![0].tabs[0].content.nodes[0].children[0].text).toBe(
      "Conteúdo alterado",
    );
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("blocks empty content and invalid initial data", async () => {
  const { main, root, onApply } = await mount();
  try {
    const textarea = main.querySelector("textarea")!;
    await change(textarea, " ");
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
  expect(
    renderToStaticMarkup(<TabsBlockEditor initialValue={{ tabs: [] }} onApply={() => {}} />),
  ).toContain("conteúdo inicial TABS v1 é inválido");
});
