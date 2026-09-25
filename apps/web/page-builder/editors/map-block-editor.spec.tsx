// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { MapBlockEditor } from "./map-block-editor";

const initial = { latitude: -22.735, longitude: -47.647, address: "Campus", zoom: 16 };
async function mount(onApply = vi.fn(), value: unknown = initial) {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  await act(() => root.render(<MapBlockEditor initialValue={value} onApply={onApply} />));
  return { main, root, onApply };
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

it("edits structured location and retains changes after async failure", async () => {
  const onApply = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
  const { main, root } = await mount(onApply);
  try {
    await change(main.querySelector<HTMLInputElement>('input[id$="-title"]')!, "Campus novo");
    await submit(main);
    expect(main.textContent).toContain("alterações continuam no editor");
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(onApply.mock.calls[1]![0]).toEqual({ ...initial, title: "Campus novo" });
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("rejects invalid coordinates and invalid initial content", async () => {
  const { main, root, onApply } = await mount();
  try {
    await change(main.querySelector<HTMLInputElement>('input[id$="-latitude"]')!, "99");
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    await change(main.querySelector<HTMLInputElement>('input[id$="-latitude"]')!, "-22.736");
    await submit(main);
    expect(onApply).toHaveBeenCalledWith({ ...initial, latitude: -22.736 });
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
  expect(
    renderToStaticMarkup(<MapBlockEditor initialValue={{ address: "" }} onApply={() => {}} />),
  ).toContain("conteúdo inicial MAP v1 é inválido");
});
