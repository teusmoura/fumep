// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageUploadForm } from "./image-upload-form";
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
describe("image upload interaction", () => {
  it("focuses duplicate choices and selects existing media without another binary upload", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const existing = {
      id: crypto.randomUUID(),
      originalFilename: "existing.png",
      mimeType: "image/png",
      sizeBytes: 100,
      categoryId: null,
      processingStatus: "PENDING",
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ duplicate: true, existing }) })
      .mockResolvedValueOnce({ ok: true, json: async () => existing });
    vi.stubGlobal("fetch", fetcher);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(() =>
      root.render(<ImageUploadForm csrfToken={"a".repeat(43)} isAdmin categories={[]} />),
    );
    const form = container.querySelector("form")!;
    await act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    const choices = container.querySelectorAll("button");
    expect(choices[1].textContent).toBe("Usar arquivo existente");
    expect(choices[2].textContent).toBe("Enviar assim mesmo");
    expect(document.activeElement).toBe(choices[1]);
    await act(() => choices[1].click());
    expect(fetcher.mock.calls[1][0]).toBe("/admin/media/select");
    expect(fetcher.mock.calls[1][1].body).toBe(JSON.stringify({ id: existing.id }));
    expect(fetcher.mock.calls[1][1].headers["X-CSRF-Token"]).toBe("a".repeat(43));
    expect(container.querySelector('[role="status"]')!.textContent).toContain("Nenhum novo upload");
    expect(container.querySelector("section")).toBeNull();
    expect(document.activeElement).toBe(container.querySelector("input"));
    await act(() => root.unmount());
  });
  it("retains pending FormData and explicitly confirms upload anyway", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const existing = {
      id: crypto.randomUUID(),
      originalFilename: "existing.png",
      mimeType: "image/png",
      sizeBytes: 100,
      categoryId: null,
      processingStatus: "PENDING",
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ duplicate: true, existing }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...existing, id: crypto.randomUUID() }),
      });
    vi.stubGlobal("fetch", fetcher);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(() =>
      root.render(<ImageUploadForm csrfToken={"a".repeat(43)} isAdmin categories={[]} />),
    );
    await act(() => {
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(fetcher.mock.calls[0][1].body.has("uploadAnyway")).toBe(false);
    await act(() => container.querySelectorAll("button")[2].click());
    expect(fetcher.mock.calls[1][0]).toBe("/admin/media/upload");
    expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[0][1].body);
    expect(fetcher.mock.calls[1][1].body.get("uploadAnyway")).toBe("true");
    expect(container.querySelector('[role="status"]')!.textContent).toContain("original salvo");
    await act(() => root.unmount());
  });
  it("preserves a failed selection for retry and invalidates stale choices when fields change", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const existing = {
      id: crypto.randomUUID(),
      originalFilename: "existing.png",
      mimeType: "image/png",
      sizeBytes: 100,
      categoryId: null,
      processingStatus: "PENDING",
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ duplicate: true, existing }) })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetcher);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(() =>
      root.render(<ImageUploadForm csrfToken={"a".repeat(43)} isAdmin categories={[]} />),
    );
    await act(() => {
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await act(() => container.querySelectorAll("button")[1].click());
    expect(container.querySelector('[role="status"]')!.textContent).toContain(
      "Não foi possível selecionar",
    );
    expect(container.querySelectorAll("button")[1].disabled).toBe(false);
    await act(() => {
      container.querySelector("select")!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.querySelector("section")).toBeNull();
    expect(container.querySelector('[role="status"]')!.textContent).toBe("");
    await act(() => root.unmount());
  });
  it("submits FormData with CSRF, reports pending processing and recovers after failure", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: crypto.randomUUID(),
          originalFilename: "fixture.png",
          mimeType: "image/png",
          sizeBytes: 100,
          categoryId: null,
          processingStatus: "PENDING",
        }),
      })
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetcher);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(() =>
      root.render(<ImageUploadForm csrfToken={"a".repeat(43)} isAdmin categories={[]} />),
    );
    const form = container.querySelector("form")!;
    const input = container.querySelector("input")!;
    input.focus();
    expect(document.activeElement).toBe(input);
    await act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(fetcher.mock.calls[0][0]).toBe("/admin/media/upload");
    const options = fetcher.mock.calls[0][1];
    expect(options.headers).toEqual({ "X-CSRF-Token": "a".repeat(43) });
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.has("categoryId")).toBe(false);
    expect(container.querySelector('[role="status"]')!.textContent).toContain(
      "processamento pendente",
    );
    await act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(container.querySelector('[role="status"]')!.textContent).toContain(
      "Não foi possível enviar",
    );
    expect(container.querySelector("button")!.disabled).toBe(false);
    await act(() => root.unmount());
  });
});
