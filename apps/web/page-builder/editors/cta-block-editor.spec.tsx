// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { CtaBlockEditor } from "./cta-block-editor";

const initial = {
  title: "Estude conosco",
  text: "Inscrições abertas",
  buttonLabel: "Saiba mais",
  buttonUrl: "/etmsl",
};
async function mount(onApply = vi.fn()) {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  await act(() => root.render(<CtaBlockEditor initialValue={initial} onApply={onApply} />));
  return { main, root, onApply };
}
async function change(control: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      control instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    )!;
    descriptor.set!.call(control, value);
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

it("retains fields after apply failure, retries as one snapshot and blocks concurrent submit", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)));
  const { main, root } = await mount(onApply);
  try {
    await change(main.querySelector<HTMLInputElement>('input[id$="-title"]')!, "Novo título");
    await change(main.querySelector<HTMLTextAreaElement>("textarea")!, "Novo texto");
    await submit(main);
    expect(main.textContent).toContain("alterações continuam no editor");
    await submit(main);
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(main.querySelector("fieldset")?.hasAttribute("disabled")).toBe(true);
    await act(async () => resolve());
    expect(onApply.mock.calls[1]![0]).toEqual({
      ...initial,
      title: "Novo título",
      text: "Novo texto",
    });
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("blocks blank labels and unsafe URLs until corrected", async () => {
  const { main, root, onApply } = await mount();
  try {
    const title = main.querySelector<HTMLInputElement>('input[id$="-title"]')!;
    const url = main.querySelector<HTMLInputElement>('input[id$="-url"]')!;
    await change(title, " ");
    await change(url, "javascript:alert(1)");
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    await change(title, "Título seguro");
    await change(url, "/seguro");
    await submit(main);
    expect(onApply).toHaveBeenCalledWith({
      ...initial,
      title: "Título seguro",
      buttonUrl: "/seguro",
    });
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("rejects invalid initial data without replacing it", () => {
  expect(
    renderToStaticMarkup(
      <CtaBlockEditor
        initialValue={{ ...initial, buttonUrl: "javascript:alert(1)" }}
        onApply={() => {}}
      />,
    ),
  ).toContain("conteúdo inicial CTA v1 é inválido");
});
