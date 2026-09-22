// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { QuickLinksBlockEditor } from "./quick-links-block-editor";

const initial = {
  title: "Atalhos",
  items: [
    { label: "Primeiro", url: "/primeiro" },
    { label: "Segundo", url: "/segundo", icon: "DOCUMENT" as const },
  ],
};
async function mount(onApply = vi.fn(), value: unknown = initial) {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  await act(() => root.render(<QuickLinksBlockEditor initialValue={value} onApply={onApply} />));
  return { main, root, onApply };
}
async function click(main: HTMLElement, label: string) {
  const button = [...main.querySelectorAll("button")].find((item) => item.textContent === label)!;
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

it("adds/reorders controlled links, retains failed fields and prevents concurrent apply", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)));
  const { main, root } = await mount(onApply);
  try {
    await click(main, "Adicionar link rápido");
    await click(main, "Subir link 3");
    await change(
      main.querySelectorAll<HTMLInputElement>('input[id$="-label"]')[0]!,
      "Primeiro editado",
    );
    const icon = main.querySelectorAll<HTMLSelectElement>("select")[0]!;
    await act(() => {
      icon.value = "CALENDAR";
      icon.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await submit(main);
    expect(main.textContent).toContain("alterações continuam no editor");
    await submit(main);
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(main.querySelector("fieldset")?.hasAttribute("disabled")).toBe(true);
    await act(async () => resolve());
    expect(onApply.mock.calls[1]![0]).toEqual({
      title: "Atalhos",
      items: [
        { label: "Primeiro editado", url: "/primeiro", icon: "CALENDAR" },
        { label: "Novo link", url: "/" },
        { label: "Segundo", url: "/segundo", icon: "DOCUMENT" },
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

it("blocks blank labels, unsafe URLs and an empty collection while retaining corrections", async () => {
  const { main, root, onApply } = await mount();
  try {
    const label = main.querySelectorAll<HTMLInputElement>('input[id$="-label"]')[0]!;
    const url = main.querySelectorAll<HTMLInputElement>('input[id$="-url"]')[0]!;
    await change(label, " ");
    await change(url, "javascript:alert(1)");
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    await change(label, "Seguro");
    await change(url, "/seguro");
    await click(main, "Remover link 2");
    await submit(main);
    expect(onApply).toHaveBeenCalledWith({
      title: "Atalhos",
      items: [{ label: "Seguro", url: "/seguro" }],
    });
    await click(main, "Remover link 1");
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(main.textContent).toContain("ao menos um link");
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("rejects invalid initial data instead of replacing it", () => {
  expect(
    renderToStaticMarkup(
      <QuickLinksBlockEditor
        initialValue={{ items: [{ label: "Ruim", url: "/", icon: "STAR" }] }}
        onApply={() => {}}
      />,
    ),
  ).toContain("conteúdo inicial QUICK_LINKS v1 é inválido");
});
