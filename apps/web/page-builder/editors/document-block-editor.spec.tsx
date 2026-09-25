// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { DocumentBlockEditor } from "./document-block-editor";
const pdfFixture = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "DOCUMENT",
  originalFilename: "edital.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1000,
  categoryId: null,
  categoryName: null,
  processingStatus: "READY",
  altText: null,
  caption: null,
  width: null,
  height: null,
  createdAt: "2026-09-17T12:00:00.000Z",
};

const initial = { mediaId: pdfFixture.id, title: "Edital" };
async function mount(onApply = vi.fn(), documents: unknown[] = [pdfFixture]) {
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  await act(() =>
    root.render(
      <DocumentBlockEditor initialValue={initial} documents={documents} onApply={onApply} />,
    ),
  );
  return { main, root, onApply };
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

it("requires ready PDF and retains draft after failed apply", async () => {
  const onApply = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
  const { main, root } = await mount(onApply);
  try {
    await change(main.querySelector<HTMLInputElement>('input[id$="-title"]')!, "Edital novo");
    await submit(main);
    expect(main.textContent).toContain("alterações continuam no editor");
    await submit(main);
    expect(onApply.mock.calls[1]![0]).toEqual({ mediaId: pdfFixture.id, title: "Edital novo" });
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
  const unavailable = await mount(vi.fn(), [{ ...pdfFixture, processingStatus: "FAILED" }]);
  try {
    await submit(unavailable.main);
    expect(unavailable.onApply).not.toHaveBeenCalled();
  } finally {
    await act(() => unavailable.root.unmount());
    unavailable.main.remove();
  }
});
