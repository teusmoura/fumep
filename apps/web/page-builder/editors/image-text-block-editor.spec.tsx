// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import axe from "axe-core";
import { ImageTextBlockEditor } from "./image-text-block-editor";
const id = "11111111-1111-4111-8111-111111111111";
const initial = { imageId: id, imagePosition: "IMAGE_LEFT", text: { type: "doc", nodes: [] } };
const image = {
  id,
  type: "IMAGE",
  originalFilename: "fixture.png",
  mimeType: "image/png",
  sizeBytes: 1,
  categoryId: null,
  categoryName: null,
  processingStatus: "READY",
  altText: "Fachada",
  caption: null,
  width: 1,
  height: 1,
  createdAt: "2026-09-18T12:00:00.000Z",
};
it("applies image/layout/text together, retains failed edits and prevents concurrent callbacks", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  try {
    await act(() =>
      root.render(
        <ImageTextBlockEditor initialValue={initial} images={[image]} onApply={onApply} />,
      ),
    );
    const mode = main.querySelector<HTMLSelectElement>("select")!;
    await act(() => {
      mode.value = "IMAGE_RIGHT";
      mode.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const title = main.querySelector<HTMLInputElement>('input[id$="-title"]')!;
    await act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        title,
        "Novo texto",
      );
      title.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const submit = async () => {
      await act(async () => {
        main
          .querySelector("form")!
          .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
    };
    await submit();
    expect(main.textContent).toContain("alterações continuam no editor");
    expect(title.value).toBe("Novo texto");
    expect(mode.value).toBe("IMAGE_RIGHT");
    await submit();
    await submit();
    expect(onApply).toHaveBeenCalledTimes(2);
    expect(main.querySelector("fieldset")?.disabled).toBe(true);
    await act(async () => resolve());
    expect(onApply.mock.calls[1]![0]).toMatchObject({
      title: "Novo texto",
      imageId: id,
      imagePosition: "IMAGE_RIGHT",
      text: initial.text,
    });
    expect(
      (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});
it("retains invalid initial values and blocks unavailable image or absent alt until explicit decoration", async () => {
  expect(
    renderToStaticMarkup(
      <ImageTextBlockEditor
        initialValue={{ ...initial, imagePosition: "FREE" }}
        onApply={() => {}}
      />,
    ),
  ).toContain("não foram substituídos");
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  const onApply = vi.fn();
  try {
    await act(() =>
      root.render(
        <ImageTextBlockEditor
          initialValue={initial}
          images={[{ ...image, altText: null }]}
          onApply={onApply}
        />,
      ),
    );
    const submit = async () => {
      await act(async () => {
        main
          .querySelector("form")!
          .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
    };
    await submit();
    expect(onApply).not.toHaveBeenCalled();
    await act(() => main.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await submit();
    expect(onApply).toHaveBeenCalledWith({ ...initial, imageAlt: "" });
  } finally {
    await act(() => root.unmount());
    main.remove();
  }
});
