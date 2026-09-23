// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { SpacerBlockEditor } from "./spacer-block-editor";

async function mount(onApply = vi.fn()) {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  await act(() =>
    root.render(<SpacerBlockEditor initialValue={{ size: "MEDIUM" }} onApply={onApply} />),
  );
  return { main, root, onApply };
}
async function submit(main: HTMLElement) {
  await act(async () =>
    main
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

it("chooses a canonical size, retains it on failure and blocks concurrent apply", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)));
  const { main, root } = await mount(onApply);
  try {
    const select = main.querySelector("select")!;
    expect([...select.options].map((option) => option.value)).toEqual(["SMALL", "MEDIUM", "LARGE"]);
    await act(() => {
      select.value = "LARGE";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await submit(main);
    expect(main.textContent).toContain("escolha continua no editor");
    await submit(main);
    await submit(main);
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(main.querySelector("fieldset")?.hasAttribute("disabled")).toBe(true);
    await act(async () => resolve());
    expect(onApply.mock.calls[1]![0]).toEqual({ size: "LARGE" });
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});

it("rejects malformed initial data instead of replacing it", () => {
  expect(
    renderToStaticMarkup(<SpacerBlockEditor initialValue={{ size: "24px" }} onApply={() => {}} />),
  ).toContain("conteúdo inicial SPACER v1 é inválido");
});
