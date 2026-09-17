// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaCategoryManager } from "./category-manager";
const institution = { id: crypto.randomUUID(), name: "ETMSL" };
const row = {
  id: crypto.randomUUID(),
  institutionId: institution.id,
  name: "Laboratórios",
  slug: "laboratorios",
};
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
describe("MediaCategoryManager", () => {
  it("renders labeled required institutional controls, status and scoped actions", () => {
    const html = renderToStaticMarkup(
      <MediaCategoryManager
        categories={[row]}
        institutions={[institution]}
        csrfToken="secret"
        isAdmin={false}
      />,
    );
    expect(html).toContain('for="category-name"');
    expect(html).toContain('for="category-slug"');
    expect(html).toContain('for="category-institution"');
    expect(html).toContain('role="status"');
    expect(html).toContain("ETMSL");
    expect(html).not.toContain("secret");
    expect(html).not.toContain(">Global</option>");
    const empty = renderToStaticMarkup(
      <MediaCategoryManager categories={[]} institutions={[]} csrfToken="" isAdmin={false} />,
    );
    expect(empty).toContain('disabled=""');
    expect(empty).toContain("Nenhuma categoria");
  });
  it("creates, edits without institution transfer and confirms deletion with CSRF", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
      setTimeout(callback, 0);
      return 0;
    });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => row })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...row, name: "Renamed" }) })
      .mockResolvedValueOnce({ ok: false, status: 409 })
      .mockResolvedValueOnce({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetcher);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(() =>
      root.render(
        <MediaCategoryManager
          categories={[]}
          institutions={[institution]}
          csrfToken="csrf"
          isAdmin={false}
        />,
      ),
    );
    container.querySelector<HTMLInputElement>('[name="name"]')!.value = row.name;
    container.querySelector<HTMLInputElement>('[name="slug"]')!.value = row.slug;
    container.querySelector<HTMLSelectElement>("select")!.value = institution.id;
    const submit = async () =>
      act(() => {
        container
          .querySelector("form")!
          .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
    await submit();
    expect(fetcher.mock.calls[0][0]).toBe("/admin/media/categories");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      name: row.name,
      slug: row.slug,
      institutionId: institution.id,
    });
    expect(fetcher.mock.calls[0][1].headers["X-CSRF-Token"]).toBe("csrf");
    await act(() =>
      container.querySelector<HTMLButtonElement>('[aria-label="Editar Laboratórios"]')!.click(),
    );
    expect(container.querySelector("select")).toBeNull();
    container.querySelector<HTMLInputElement>('[name="name"]')!.value = "Renamed";
    await submit();
    expect(fetcher.mock.calls[1][1].method).toBe("PATCH");
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).not.toHaveProperty("institutionId");
    await act(() =>
      container.querySelector<HTMLButtonElement>('[aria-label="Excluir Renamed"]')!.click(),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    const confirm = () =>
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Confirmar exclusão",
      )!;
    expect(document.activeElement).toBe(confirm());
    await act(() => confirm().click());
    expect(container.querySelector('[role="status"]')!.textContent).toContain("Conflito");
    expect(container.querySelector("li")).not.toBeNull();
    await act(() => confirm().click());
    expect(fetcher.mock.calls[3][1].method).toBe("DELETE");
    expect(container.querySelector("li")).toBeNull();
    expect(container.querySelector('[role="status"]')!.textContent).toContain("Categoria excluída");
    await act(() => root.unmount());
  });
});
