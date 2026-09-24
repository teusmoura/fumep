// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { TableBlockEditor } from "./table-block-editor";

const initial = { caption: "Cursos", headers: ["Nome"], rows: [["Técnico"]] };
async function mount(onApply = vi.fn(), value: unknown = initial) {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  await act(() => root.render(<TableBlockEditor initialValue={value} onApply={onApply} />));
  return { main, root, onApply };
}
async function click(main: HTMLElement, name: string) {
  const button = [...main.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === name,
  )!;
  await act(() => button.click());
}
async function change(control: HTMLInputElement, value: string) {
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(control, value);
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

it("edits columns and rows, preserves failure and prevents concurrent apply", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)));
  const { main, root } = await mount(onApply);
  try {
    await click(main, "Adicionar coluna");
    await click(main, "Adicionar linha");
    await change(main.querySelector<HTMLInputElement>('input[id$="-cell-0-1"]')!, "2 anos");
    await click(main, "Subir linha 2");
    await submit(main);
    expect(main.textContent).toContain("alterações continuam no editor");
    await submit(main);
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(main.querySelector("fieldset")?.hasAttribute("disabled")).toBe(true);
    await act(async () => resolve());
    expect(onApply.mock.calls[1]![0]).toEqual({
      caption: "Cursos",
      headers: ["Nome", "Coluna 2"],
      rows: [
        ["", ""],
        ["Técnico", "2 anos"],
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

it("rejects blank headers and retains corrections", async () => {
  const { main, root, onApply } = await mount();
  try {
    const header = main.querySelector<HTMLInputElement>('input[id$="-header-0"]')!;
    await change(header, "  ");
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    await change(header, "Nome corrigido");
    await submit(main);
    expect(onApply).toHaveBeenCalledWith({
      caption: "Cursos",
      headers: ["Nome corrigido"],
      rows: [["Técnico"]],
    });
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("rejects invalid initial table without replacing it", () => {
  expect(
    renderToStaticMarkup(
      <TableBlockEditor initialValue={{ headers: [], rows: [] }} onApply={() => {}} />,
    ),
  ).toContain("conteúdo inicial TABLE v1 é inválido");
});
