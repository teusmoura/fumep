// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { VideoBlockEditor } from "./video-block-editor";

const initial = { url: "https://www.youtube.com/watch?v=M7lc1UVf-VE", title: "Aula" };
async function mount(onApply = vi.fn(), value: unknown = initial) {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  await act(() => root.render(<VideoBlockEditor initialValue={value} onApply={onApply} />));
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

it("retains changed title and URL after async failure, then applies successfully", async () => {
  const onApply = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
  const { main, root } = await mount(onApply);
  try {
    await change(main.querySelector<HTMLInputElement>('input[id$="-title"]')!, "Aula nova");
    await change(
      main.querySelector<HTMLInputElement>('input[id$="-url"]')!,
      "https://vimeo.com/123456789",
    );
    await submit(main);
    expect(main.textContent).toContain("alterações continuam no editor");
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(onApply.mock.calls[1]![0]).toEqual({
      title: "Aula nova",
      url: "https://vimeo.com/123456789",
    });
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("rejects invalid URL and invalid initial content", async () => {
  const { main, root, onApply } = await mount();
  try {
    await change(
      main.querySelector<HTMLInputElement>('input[id$="-url"]')!,
      "https://evil.test/video",
    );
    await submit(main);
    expect(onApply).not.toHaveBeenCalled();
    await change(main.querySelector<HTMLInputElement>('input[id$="-url"]')!, initial.url);
    await submit(main);
    expect(onApply).toHaveBeenCalledWith(initial);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
  expect(
    renderToStaticMarkup(
      <VideoBlockEditor
        initialValue={{ url: "https://evil.test", title: "X" }}
        onApply={() => {}}
      />,
    ),
  ).toContain("conteúdo inicial VIDEO v1 é inválido");
});
