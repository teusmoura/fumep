// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import axe from "axe-core";
import { heroBlockDataSchemaV1 } from "@fumep/validation";
import { HeroBlockEditor } from "./hero-block-editor";
const id = "11111111-1111-4111-8111-111111111111";
const image = () => ({
  id,
  type: "IMAGE",
  originalFilename: "fachada.webp",
  mimeType: "image/webp",
  sizeBytes: 1000,
  categoryId: null,
  categoryName: null,
  processingStatus: "READY",
  altText: null,
  caption: null,
  width: 1200,
  height: 800,
  createdAt: "2026-09-17T12:00:00.000Z",
});
const roots: Root[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});
async function mount(onApply = vi.fn(), disabled = false) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  roots.push(root);
  await act(() =>
    root.render(
      <>
        <h1>Editor</h1>
        <HeroBlockEditor
          initialValue={{ title: "ETMSL" }}
          images={[
            image(),
            { ...image(), id: "22222222-2222-4222-8222-222222222222", processingStatus: "PENDING" },
            { ...image(), type: "DOCUMENT" },
          ]}
          onApply={onApply}
          disabled={disabled}
        />
      </>,
    ),
  );
  return { main, onApply };
}
async function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype =
    element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(() => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }),
    );
  });
}
async function submit(main: HTMLElement) {
  await act(() =>
    main
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
it("refuses invalid initial data without replacement and escapes literal title", () => {
  expect(
    renderToStaticMarkup(<HeroBlockEditor initialValue={{ title: "" }} onApply={() => {}} />),
  ).toContain("não foram substituídos");
  expect(
    renderToStaticMarkup(
      <HeroBlockEditor initialValue={{ title: "<script>" }} onApply={() => {}} />,
    ),
  ).not.toContain("<script>");
});
it("filters image options, requires informative alt or explicit decoration, and emits only validated UUID data", async () => {
  const { main, onApply } = await mount();
  expect(main.querySelectorAll("select option")).toHaveLength(2);
  await change(main.querySelector("select")!, id);
  await submit(main);
  expect(onApply).not.toHaveBeenCalled();
  const alt = [...main.querySelectorAll<HTMLInputElement>("input")].find((item) =>
    item.id.endsWith("-alt"),
  )!;
  expect(alt.getAttribute("aria-invalid")).toBe("true");
  await change(alt, "Fachada contextual");
  await submit(main);
  expect(onApply.mock.calls[0]![0]).toMatchObject({ imageId: id, imageAlt: "Fachada contextual" });
  await act(() => main.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  await submit(main);
  expect(onApply.mock.calls[1]![0].imageAlt).toBe("");
  expect(heroBlockDataSchemaV1.safeParse(onApply.mock.calls[1]![0]).success).toBe(true);
  await change(main.querySelector("select")!, "");
  await submit(main);
  expect(onApply.mock.calls[2]![0]).not.toHaveProperty("imageId");
  expect(onApply.mock.calls[2]![0]).not.toHaveProperty("imageAlt");
  expect(document.activeElement).toBe(main.querySelector('[role="status"]'));
});
it("retains invalid CTA draft until correction and preserves changes on callback failure", async () => {
  const onApply = vi.fn().mockRejectedValue(new Error("fixture"));
  const { main } = await mount(onApply);
  await act(() => main.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  const label = [...main.querySelectorAll<HTMLInputElement>("input")].find((item) =>
    item.id.endsWith("-label"),
  )!;
  const url = [...main.querySelectorAll<HTMLInputElement>("input")].find((item) =>
    item.id.endsWith("-url"),
  )!;
  await change(label, "Cursos");
  await change(url, "javascript:alert(1)");
  await submit(main);
  expect(onApply).not.toHaveBeenCalled();
  expect(url.value).toBe("javascript:alert(1)");
  expect(url.getAttribute("aria-invalid")).toBe("true");
  await change(url, "/etmsl/cursos");
  await submit(main);
  expect(onApply).toHaveBeenCalledOnce();
  expect(main.textContent).toContain("Suas alterações continuam");
  expect(label.value).toBe("Cursos");
});
it("blocks disabled and concurrent apply without replacing local state", async () => {
  const disabled = await mount(undefined, true);
  await submit(disabled.main);
  expect(disabled.onApply).not.toHaveBeenCalled();
  let finish!: () => void;
  const callback = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const { main } = await mount(callback);
  await act(() => {
    for (let index = 0; index < 2; index++)
      main
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(callback).toHaveBeenCalledOnce();
  expect(main.querySelector("fieldset")!.disabled).toBe(true);
  await act(() => finish());
  expect(main.querySelector("fieldset")!.disabled).toBe(false);
});
it("has no semantic axe violations including alt and invalid CTA feedback (no contrast/layout)", async () => {
  const { main } = await mount();
  await change(main.querySelector("select")!, id);
  await act(() =>
    [...main.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')][1]!.click(),
  );
  await submit(main);
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
});
