// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import axe from "axe-core";
import { afterEach, expect, it, vi } from "vitest";
import { TextBlockEditor } from "./text-block-editor";
import { textBlockDataSchemaV1, type TextBlockDataV1 } from "@fumep/validation";
const run = (text: string) => ({ type: "text" as const, text });
const initial = (): TextBlockDataV1 => ({
  title: "Exemplo",
  content: {
    type: "doc",
    nodes: [
      {
        type: "paragraph",
        children: [
          run("Texto inicial"),
          { type: "link", url: "/etmsl", children: [run("Cursos")] },
        ],
      },
      { type: "heading", level: 2, children: [run("Título interno")] },
      { type: "highlight", children: [run("Destaque")] },
      { type: "orderedList", items: [{ children: [run("Um")] }] },
      { type: "bulletList", items: [{ children: [run("Item")] }] },
      { type: "table", headers: ["Curso"], rows: [["Técnico"]] },
    ],
  },
});
const roots: Root[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});
async function mount(onApply = vi.fn(), disabled = false) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("main");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(() =>
    root.render(
      <>
        <h1>Editor de teste</h1>
        <TextBlockEditor initialValue={initial()} onApply={onApply} disabled={disabled} />
      </>,
    ),
  );
  return { container, onApply };
}
function button(container: HTMLElement, label: string) {
  return [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    (item) => item.textContent === label,
  )!;
}
async function change(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  await act(() => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit(container: HTMLElement) {
  await act(() =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
it("renders escaped text, no raw HTML editor, and refuses invalid initial data without replacement", () => {
  const value = initial();
  value.content.nodes[0] = { type: "paragraph", children: [run("<script>alert(1)</script>")] };
  const html = renderToStaticMarkup(<TextBlockEditor initialValue={value} onApply={() => {}} />);
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("Editor visual TEXT");
  expect(html).not.toContain("contenteditable");
  expect(
    renderToStaticMarkup(
      <TextBlockEditor initialValue={{ html: "<script>" }} onApply={() => {}} />,
    ),
  ).toContain("não substituiu seus dados");
});
it("edits text/marks, rejects dangerous URLs before callback, retains the draft and focuses status", async () => {
  const { container, onApply } = await mount();
  const textarea = container.querySelector<HTMLTextAreaElement>("textarea")!;
  await change(textarea, "Texto editado");
  await act(() => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  expect(container.querySelector("textarea")!.className).toContain("text-editor-bold");
  const url = [...container.querySelectorAll<HTMLInputElement>("input")].find((item) =>
    item.id.endsWith("-url"),
  )!;
  await change(url, "javascript:alert(1)");
  await submit(container);
  expect(onApply).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Corrija links");
  expect(url.getAttribute("aria-invalid")).toBe("true");
  await change(url, "/etmsl/cursos");
  await submit(container);
  expect(onApply).toHaveBeenCalledOnce();
  const value = onApply.mock.calls[0]![0];
  expect(textBlockDataSchemaV1.safeParse(value).success).toBe(true);
  expect(value.content.nodes[0].children[0]).toMatchObject({
    text: "Texto editado",
    marks: ["bold"],
  });
  expect(document.activeElement).toBe(container.querySelector('[role="status"]'));
  expect(container.textContent).toContain("não publica nem salva");
});
it("adds/removes rich content, undoes/redoes operations and edits rectangular tables", async () => {
  const { container, onApply } = await mount();
  await act(() => button(container, "Adicionar ao texto").click());
  expect(container.querySelectorAll(".text-editor-nodes > li")).toHaveLength(7);
  await act(() => button(container, "Desfazer").click());
  expect(container.querySelectorAll(".text-editor-nodes > li")).toHaveLength(6);
  await act(() => button(container, "Refazer").click());
  expect(container.querySelectorAll(".text-editor-nodes > li")).toHaveLength(7);
  await act(() => button(container, "Adicionar coluna").click());
  await act(() => button(container, "Adicionar linha").click());
  await act(() => button(container, "Alternar tipo de lista").click());
  await submit(container);
  const value = onApply.mock.calls[0]![0];
  const table = value.content.nodes.find((node: { type: string }) => node.type === "table");
  expect(table.headers).toHaveLength(2);
  expect(table.rows).toHaveLength(2);
  expect(table.rows.every((row: string[]) => row.length === 2)).toBe(true);
  expect(value.content.nodes[3].type).toBe("bulletList");
  await act(() => button(container, "Remover coluna 2").click());
  await act(() => button(container, "Remover parágrafo 7").click());
  await submit(container);
  expect(textBlockDataSchemaV1.safeParse(onApply.mock.calls[1]![0]).success).toBe(true);
});
it("prevents duplicate concurrent apply and retains content on callback failure", async () => {
  let finish!: () => void;
  const onApply = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    )
    .mockRejectedValueOnce(new Error("fixture"));
  const { container } = await mount(onApply);
  await act(() => {
    for (let index = 0; index < 2; index++)
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(onApply).toHaveBeenCalledOnce();
  expect(container.querySelector("fieldset")!.disabled).toBe(true);
  await act(() => finish());
  await submit(container);
  expect(container.textContent).toContain("Suas alterações continuam");
  expect(container.querySelector("textarea")!.value).toBe("Texto inicial");
});
it("blocks edits/apply when disabled and has no obvious axe violations (jsdom, no contrast/layout)", async () => {
  const { container, onApply } = await mount(undefined, true);
  await submit(container);
  expect(onApply).not.toHaveBeenCalled();
  expect(container.querySelector("fieldset")!.disabled).toBe(true);
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations).toEqual([]);
});
it("has accessible enabled controls and validation feedback (axe without layout/contrast)", async () => {
  const { container } = await mount();
  const url = [...container.querySelectorAll<HTMLInputElement>("input")].find((item) =>
    item.id.endsWith("-url"),
  )!;
  await change(url, "javascript:alert(1)");
  await submit(container);
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations).toEqual([]);
});
