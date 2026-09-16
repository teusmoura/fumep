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
