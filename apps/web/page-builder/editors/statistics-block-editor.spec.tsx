// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { StatisticsBlockEditor } from "./statistics-block-editor";

const initial = {
  items: [
    { value: "98%", label: "Aprovação", description: "Turma atual" },
    { value: "1,2 mil", label: "Alunos" },
  ],
};
async function mount(onApply = vi.fn(), value: unknown = initial) {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  await act(() => root.render(<StatisticsBlockEditor initialValue={value} onApply={onApply} />));
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

it("adds/reorders indicators, retains failed changes and blocks concurrent apply", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)));
  const { main, root } = await mount(onApply);
  try {
    await click(main, "Adicionar indicador");
    await click(main, "Subir indicador 3");
    await change(main.querySelector<HTMLInputElement>('input[id$="-0-value"]')!, "99%");
    await submit(main);
    expect(main.textContent).toContain("alterações continuam no editor");
    await submit(main);
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(main.querySelector("fieldset")?.hasAttribute("disabled")).toBe(true);
    await act(async () => resolve());
    expect(onApply.mock.calls[1]![0]).toEqual({
      items: [
        { value: "99%", label: "Aprovação", description: "Turma atual" },
        { value: "0", label: "Novo indicador" },
        { value: "1,2 mil", label: "Alunos" },
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

it("rejects blank labels and empty collection without losing corrections", async () => {
  const { main, root, onApply } = await mount();
  try {
    const label = main.querySelector<HTMLInputElement>('input[id$="-0-label"]')!;
    await change(label, " ");
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    await change(label, "Aprovação corrigida");
    await click(main, "Remover indicador 2");
    await submit(main);
    expect(onApply).toHaveBeenCalledWith({
      items: [{ value: "98%", label: "Aprovação corrigida", description: "Turma atual" }],
    });
    await click(main, "Remover indicador 1");
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(1);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("rejects invalid initial content without replacing it", () => {
  expect(
    renderToStaticMarkup(<StatisticsBlockEditor initialValue={{ items: [] }} onApply={() => {}} />),
  ).toContain("conteúdo inicial STATISTICS v1 é inválido");
});
