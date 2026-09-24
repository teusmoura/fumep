// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import axe from "axe-core";
import { PageBuilder } from "./page-builder";
import { newBuilderBlock } from "./builder-state";
const id = "11111111-1111-4111-8111-111111111111";
const image = {
  id,
  type: "IMAGE",
  originalFilename: "fixture.png",
  mimeType: "image/png",
  sizeBytes: 68,
  categoryId: null,
  categoryName: null,
  processingStatus: "READY",
  altText: "Fachada",
  caption: null,
  width: 1,
  height: 1,
  createdAt: "2026-09-17T12:00:00.000Z",
};
const roots: Root[] = [];
it("adds IMAGE_TEXT through its composite editor using an available image and applies the full draft", async () => {
  const { main, onApply } = await mount();
  await click(main, "Adicionar IMAGE_TEXT");
  await apply(main);
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(onApply.mock.calls[0]![0][0]).toMatchObject({
    type: "IMAGE_TEXT",
    data: { imageId: id, imagePosition: "IMAGE_LEFT", text: { type: "doc", nodes: [] } },
  });
  expect(main.querySelector('section[aria-label="Novo bloco"]')).toBeNull();
});
it("adds PAGE-only CARDS with one available image through its collection editor", async () => {
  const { main, onApply } = await mount();
  await click(main, "Adicionar CARDS");
  await apply(main);
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(onApply.mock.calls[0]![0][0]).toMatchObject({
    type: "CARDS",
    data: { items: [{ imageId: id, title: "Novo card" }] },
  });
  expect(main.querySelector('section[aria-label="Novo bloco"]')).toBeNull();
});
it("adds PAGE-only QUICK_LINKS without requiring media", async () => {
  const { main, onApply } = await mount(vi.fn(), [], []);
  await click(main, "Adicionar QUICK_LINKS");
  await apply(main);
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(onApply.mock.calls[0]![0][0]).toMatchObject({
    type: "QUICK_LINKS",
    data: { items: [{ label: "Novo link", url: "/" }] },
  });
});
it("adds CTA in ARTICLE without requiring media", async () => {
  const { main, onApply } = await mount(vi.fn(), [], [], "ARTICLE");
  await click(main, "Adicionar CTA");
  await apply(main);
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(onApply.mock.calls[0]![0][0]).toMatchObject({
    type: "CTA",
    data: { title: "Nova chamada", buttonLabel: "Saiba mais", buttonUrl: "/" },
  });
});
it("adds PAGE-only SPACER without requiring media", async () => {
  const { main, onApply } = await mount(vi.fn(), [], []);
  await click(main, "Adicionar SPACER");
  await apply(main);
  expect(onApply.mock.calls[0]![0][0]).toMatchObject({ type: "SPACER", data: { size: "MEDIUM" } });
});
it("adds PAGE-only FAQ without requiring media", async () => {
  const { main, onApply } = await mount(vi.fn(), [], []);
  await click(main, "Adicionar FAQ");
  await apply(main);
  expect(onApply.mock.calls[0]![0][0]).toMatchObject({
    type: "FAQ",
    data: { items: [{ question: "Nova pergunta", answer: "Nova resposta" }] },
  });
});
it("adds PAGE-only TABS without requiring media", async () => {
  const { main, onApply } = await mount(vi.fn(), [], []);
  await click(main, "Adicionar TABS");
  await apply(main);
  expect(onApply.mock.calls[0]![0][0]).toMatchObject({
    type: "TABS",
    data: { tabs: [{ label: "Nova aba" }] },
  });
});
it("adds TABLE in ARTICLE without requiring media", async () => {
  const { main, onApply } = await mount(vi.fn(), [], [], "ARTICLE");
  await click(main, "Adicionar TABLE");
  await apply(main);
  expect(onApply.mock.calls[0]![0][0]).toMatchObject({
    type: "TABLE",
    data: { headers: ["Coluna 1"], rows: [[""]] },
  });
});
it("validates image backgrounds, retains failure/retry and clears references when switching mode", async () => {
  const onApply = vi.fn().mockRejectedValueOnce(new Error("offline"));
  const { main } = await mount(onApply, [image], initialReorderBlocks());
  const form = main.querySelector<HTMLFormElement>('form[aria-label="Fundo do bloco 1"]')!;
  const mode = form.querySelector<HTMLSelectElement>("select")!;
  await act(() => {
    mode.value = "IMAGE";
    mode.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const submit = async () => {
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  };
  await submit();
  expect(onApply).not.toHaveBeenCalled();
  const selection = form.querySelectorAll<HTMLSelectElement>("select")[1]!;
  await act(() => {
    selection.value = id;
    selection.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await submit();
  expect(form.textContent).toContain("escolhas foram mantidas");
  expect(selection.value).toBe(id);
  await submit();
  expect(onApply.mock.calls[1]![0][0]).toMatchObject({
    background: "IMAGE",
    backgroundMediaId: id,
  });
  await act(() => {
    mode.value = "LIGHT";
    mode.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await submit();
  expect(onApply.mock.calls[2]![0][0]).toMatchObject({
    background: "LIGHT",
    backgroundMediaId: null,
  });
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
});
it("retains invalid/duplicate/failed anchors, preserves editors and applies/removes only on success", async () => {
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
  const initial = initialReorderBlocks().map((block, index) =>
    index === 1 ? { ...block, anchor: "reservado", isVisible: false } : block,
  );
  const { main } = await mount(onApply, [image], initial);
  const form = main.querySelector<HTMLFormElement>('form[aria-label="Anchor do bloco 1"]')!;
  const input = form.querySelector<HTMLInputElement>("input")!;
  const content = main.querySelector(".hero-block-editor input");
  async function change(value: string) {
    await act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  async function submit() {
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  }
  for (const value of ["inválido", "reservado"]) {
    await change(value);
    await submit();
    expect(input.value).toBe(value);
    expect(form.textContent).toContain("Seu valor foi mantido");
  }
  expect(onApply).not.toHaveBeenCalled();
  await change("documentos");
  await submit();
  expect(form.textContent).toContain("Seu valor foi mantido");
  await submit();
  await submit();
  expect(onApply).toHaveBeenCalledTimes(2);
  await act(async () => resolve());
  expect(onApply.mock.calls[1]![0][0].anchor).toBe("documentos");
  expect(main.querySelector(".hero-block-editor input")).toBe(content);
  expect(document.activeElement?.getAttribute("role")).toBe("status");
  await change("");
  await submit();
  expect(onApply.mock.calls[2]![0][0].anchor).toBeNull();
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
});
it("requires cancellable confirmation, retains failed deletion and preserves other editor edits", async () => {
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
  const { main } = await mount(onApply, [image], initialReorderBlocks());
  const field = main.querySelector<HTMLInputElement>(".hero-block-editor input")!;
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      field,
      "Outro edit mantido",
    );
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const remove = main.querySelector<HTMLButtonElement>(
    'button[aria-label="Excluir bloco 1 — TEXT"]',
  )!;
  await act(() => remove.click());
  expect(onApply).not.toHaveBeenCalled();
  expect(document.activeElement?.textContent).toBe("Confirmar exclusão");
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
  await click(main, "Cancelar exclusão");
  expect(onApply).not.toHaveBeenCalled();
  expect(field.value).toBe("Outro edit mantido");
  await act(() => remove.click());
  await click(main, "Confirmar exclusão");
  expect(main.textContent).toContain("Não foi possível excluir");
  expect(main.querySelectorAll(".page-builder-blocks > li")).toHaveLength(2);
  await click(main, "Confirmar exclusão");
  await click(main, "Confirmar exclusão");
  expect(onApply).toHaveBeenCalledTimes(2);
  await act(async () => resolve());
  expect(main.querySelectorAll(".page-builder-blocks > li")).toHaveLength(1);
  expect(main.querySelector(".hero-block-editor input")).toBe(field);
  expect(field.value).toBe("Outro edit mantido");
  expect(
    onApply.mock.calls[1]![0].map((b: { id: string; position: number }) => [b.id, b.position]),
  ).toEqual([[other, 0]]);
  expect(document.activeElement?.getAttribute("role")).toBe("status");
  expect(main.textContent).not.toContain("Confirmar exclusão do bloco");
});
it("allows deleting the last draft block after confirmation without deleting media", async () => {
  const text = newBuilderBlock("TEXT", "PAGE", [], id)!;
  const { main, onApply } = await mount(vi.fn(), [image], [text]);
  await act(() =>
    main.querySelector<HTMLButtonElement>('button[aria-label="Excluir bloco 1 — TEXT"]')!.click(),
  );
  await click(main, "Confirmar exclusão");
  expect(onApply).toHaveBeenCalledWith([]);
  expect(main.textContent).toContain("Nenhum bloco adicionado");
  expect(main.querySelectorAll(".page-builder-blocks > li")).toHaveLength(0);
});
it("hides/shows only after callback success, preserving local edits and handling failure/concurrency", async () => {
  let resolve!: () => void;
  const onApply = vi
    .fn()
    .mockResolvedValue(undefined)
    .mockRejectedValueOnce(new Error("offline"))
    .mockRejectedValueOnce(new Error("offline"))
    .mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
  const { main } = await mount(onApply, [image], initialReorderBlocks());
  const field = main.querySelector<HTMLInputElement>(".text-block-editor input")!;
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      field,
      "Edit mantido",
    );
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const hide = main.querySelector<HTMLButtonElement>(
    'button[aria-label="Ocultar bloco 1 — TEXT"]',
  )!;
  await act(async () => hide.click());
  expect(main.textContent).toContain("Não foi possível alterar visibilidade");
  expect(main.querySelector('button[aria-label="Exibir bloco 1 — TEXT"]')).toBeNull();
  await act(() => field.focus());
  await act(async () => hide.click());
  expect(document.activeElement?.getAttribute("role")).toBe("status");
  await act(() => hide.click());
  await act(() => hide.click());
  expect(onApply).toHaveBeenCalledTimes(3);
  await act(async () => resolve());
  const show = main.querySelector<HTMLButtonElement>('button[aria-label="Exibir bloco 1 — TEXT"]')!;
  expect(show).not.toBeNull();
  expect(onApply.mock.calls[2]![0][0].isVisible).toBe(false);
  expect(main.querySelectorAll(".page-builder-blocks > li")).toHaveLength(2);
  expect(main.querySelector(".text-block-editor input")).toBe(field);
  expect(field.value).toBe("Edit mantido");
  expect(document.activeElement?.getAttribute("role")).toBe("status");
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
  await act(async () => show.click());
  expect(onApply.mock.calls[3]![0][0].isVisible).toBe(true);
  expect(main.querySelector('button[aria-label="Ocultar bloco 1 — TEXT"]')).not.toBeNull();
});
it("duplicates only applied content retaining original local edits, failure and concurrency", async () => {
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
  const { main } = await mount(onApply, [image], initialReorderBlocks());
  const field = main.querySelector<HTMLInputElement>(".text-block-editor input")!;
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      field,
      "Edits retidos",
    );
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const button = main.querySelector<HTMLButtonElement>(
    'button[aria-label="Duplicar bloco 1 — TEXT"]',
  )!;
  await act(async () => button.click());
  expect(main.querySelectorAll(".page-builder-blocks > li")).toHaveLength(2);
  expect(field.value).toBe("Edits retidos");
  expect(main.textContent).toContain("Não foi possível duplicar");
  await act(() => button.click());
  await act(() => button.click());
  expect(onApply).toHaveBeenCalledTimes(2);
  const snapshot = onApply.mock.calls[1]![0];
  expect(snapshot).toHaveLength(3);
  expect(snapshot[2].id).not.toBe(id);
  expect(snapshot[2].data.title).toBeUndefined();
  await act(async () => resolve());
  expect(main.querySelectorAll(".page-builder-blocks > li")).toHaveLength(3);
  expect(main.querySelector(".text-block-editor input")).toBe(field);
  expect(field.value).toBe("Edits retidos");
  expect(document.activeElement?.getAttribute("role")).toBe("status");
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
});
const other = "22222222-2222-4222-8222-222222222222";
function initialReorderBlocks() {
  const text = newBuilderBlock("TEXT", "PAGE", [], id)!;
  return [text, newBuilderBlock("HERO", "PAGE", [text], other)!];
}
it("moves via named buttons retaining unapplied editor data and accessible feedback", async () => {
  const { main, onApply } = await mount(vi.fn(), [image], initialReorderBlocks());
  const field = main.querySelector<HTMLInputElement>(".text-block-editor input")!;
  await act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      field,
      "Ainda não aplicado",
    );
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(
    main.querySelector<HTMLButtonElement>('button[aria-label="Subir bloco 1 — TEXT"]')!.disabled,
  ).toBe(true);
  await act(async () =>
    main.querySelector<HTMLButtonElement>('button[aria-label="Descer bloco 1 — TEXT"]')!.click(),
  );
  expect(onApply.mock.calls[0]![0].map((b: { id: string }) => b.id)).toEqual([other, id]);
  expect(main.querySelector(".text-block-editor input")).toBe(field);
  expect(field.value).toBe("Ainda não aplicado");
  expect(main.textContent).toContain("posição 2 de 2");
  expect(document.activeElement?.getAttribute("role")).toBe("status");
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
});
it("accepts only internal drag handles and retains order on failure or concurrent moves", async () => {
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
  const { main } = await mount(onApply, [image], initialReorderBlocks());
  const items = main.querySelectorAll(".page-builder-blocks > li");
  await act(() => items[1]!.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true })));
  expect(onApply).not.toHaveBeenCalled();
  const handle = main.querySelector('button[aria-label="Arrastar bloco 1 — TEXT"]')!;
  const start = new Event("dragstart", { bubbles: true, cancelable: true });
  Object.defineProperty(start, "dataTransfer", { value: { effectAllowed: "", setData: vi.fn() } });
  await act(() => handle.dispatchEvent(start));
  await act(async () =>
    items[1]!.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true })),
  );
  expect(main.textContent).toContain("Ordem e alterações dos editores foram mantidas");
  expect(main.querySelector(".page-builder-blocks > li h3")?.textContent).toContain("TEXT");
  await act(() =>
    main.querySelector<HTMLButtonElement>('button[aria-label="Descer bloco 1 — TEXT"]')!.click(),
  );
  await act(() =>
    main.querySelector<HTMLButtonElement>('button[aria-label="Subir bloco 2 — HERO"]')!.click(),
  );
  expect(onApply).toHaveBeenCalledTimes(2);
  await act(() => resolve());
  expect(main.querySelector(".page-builder-blocks > li h3")?.textContent).toContain("HERO");
});
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});
async function mount(
  onApply = vi.fn(),
  images: unknown[] = [image],
  initialBlocks: unknown = [],
  context: "PAGE" | "ARTICLE" = "PAGE",
) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const main = document.createElement("main");
  document.body.append(main);
  const root = createRoot(main);
  roots.push(root);
  await act(() =>
    root.render(
      <>
        <h1>Draft</h1>
        <PageBuilder
          context={context}
          initialBlocks={initialBlocks}
          images={images}
          onApply={onApply}
        />
      </>,
    ),
  );
  return { main, onApply };
}
async function click(main: HTMLElement, name: string) {
  const button = [...main.querySelectorAll("button")].find((b) => b.textContent === name)!;
  await act(() => button.click());
}
async function apply(main: HTMLElement) {
  await act(() =>
    main
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
it("rejects invalid initial blocks and enforces ARTICLE and missing media in the UI", () => {
  const hero = newBuilderBlock("HERO", "PAGE", [], id)!;
  expect(
    renderToStaticMarkup(
      <PageBuilder context="ARTICLE" initialBlocks={[hero]} onApply={() => {}} />,
    ),
  ).toContain("não foram substituídos");
  const html = renderToStaticMarkup(
    <PageBuilder context="ARTICLE" initialBlocks={[]} onApply={() => {}} />,
  );
  expect(html).not.toContain("Adicionar HERO");
  expect(html).not.toContain("Adicionar CARDS");
  expect(html).not.toContain("Adicionar QUICK_LINKS");
  expect(html).not.toContain("Adicionar SPACER");
  expect(html).not.toContain("Adicionar FAQ");
  expect(html).not.toContain("Adicionar TABS");
  expect(html).toContain("Adicionar TEXT");
  expect(html).toContain("Adicionar IMAGE");
  expect(html).toContain("Adicionar CTA");
  expect(html).toContain("disabled");
});
it("adds TEXT/HERO/IMAGE through their validated editors without altering the initial data", async () => {
  const { main, onApply } = await mount();
  for (const type of ["TEXT", "HERO", "IMAGE"]) {
    await click(main, `Adicionar ${type}`);
    const candidate = main.querySelector('section[aria-label="Novo bloco"]')!;
    await act(async () =>
      candidate
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
  }
  expect(onApply).toHaveBeenCalledTimes(3);
  const blocks = onApply.mock.calls[2]![0];
  expect(blocks.map((b: { type: string }) => b.type)).toEqual(["TEXT", "HERO", "IMAGE"]);
  expect(blocks.map((b: { position: number }) => b.position)).toEqual([0, 1, 2]);
  expect(new Set(blocks.map((b: { id: string }) => b.id)).size).toBe(3);
  expect(blocks[2].data).toEqual({ imageId: id, decorative: false });
  expect(main.querySelector('section[aria-label="Novo bloco"]')).toBeNull();
  expect(document.activeElement?.getAttribute("role")).toBe("status");
});
it("retains failed additions for correction/retry and blocks concurrent callbacks", async () => {
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
  const { main } = await mount(onApply);
  await click(main, "Adicionar HERO");
  await apply(main);
  expect(main.textContent).toContain("continuam no editor");
  expect(main.querySelector('section[aria-label="Novo bloco"]')).not.toBeNull();
  await apply(main);
  await apply(main);
  expect(onApply).toHaveBeenCalledTimes(2);
  expect(main.querySelector("fieldset")?.disabled).toBe(true);
  await act(() => resolve());
  expect(main.querySelector('section[aria-label="Novo bloco"]')).toBeNull();
});
it("provides accessible empty and active drafts with native named controls", async () => {
  const { main } = await mount();
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
  await click(main, "Adicionar IMAGE");
  expect(
    (await axe.run(main, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
});
