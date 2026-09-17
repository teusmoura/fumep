// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { InstitutionLogoEditor } from "./institution-logo-editor";
import type { MediaLibraryResponse } from "@fumep/validation";
const owner = { id: crypto.randomUUID(), name: "FUMEP", logoLightId: null, logoDarkId: null };
const image = crypto.randomUUID();
const items: MediaLibraryResponse["items"] = [
  {
    id: image,
    type: "IMAGE",
    originalFilename: "logo.png",
    mimeType: "image/png",
    sizeBytes: 1,
    processingStatus: "READY",
    categoryId: null,
    categoryName: null,
    altText: null,
    caption: null,
    width: 1,
    height: 1,
    createdAt: new Date().toISOString(),
  },
];
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
it("renders labeled library choices, excludes documents/pending images and doesn't expose CSRF", () => {
  const html = renderToStaticMarkup(
    <InstitutionLogoEditor
      institutions={[owner]}
      items={[
        ...items,
        {
          ...items[0]!,
          id: crypto.randomUUID(),
          type: "DOCUMENT",
          originalFilename: "private.pdf",
          mimeType: "application/pdf",
        },
        {
          ...items[0]!,
          id: crypto.randomUUID(),
          processingStatus: "PENDING",
          originalFilename: "pending.png",
        },
      ]}
      csrfToken="secret-token"
    />,
  );
  expect(html).toContain('for="logo-institution"');
  expect(html).toContain('for="logoLightId"');
  expect(html).toContain('for="logoDarkId"');
  expect(html).toContain("logo.png");
  expect(html).not.toContain("private.pdf");
  expect(html).not.toContain("pending.png");
  expect(html).not.toContain("secret-token");
  expect(html).toContain("fallback");
});
it("sends only selected media IDs with CSRF, reports failure then success and focuses status", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 400 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: owner.id, logoLightId: image, logoDarkId: null }),
    });
  vi.stubGlobal("fetch", fetcher);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(() =>
    root.render(<InstitutionLogoEditor institutions={[owner]} items={items} csrfToken="csrf" />),
  );
  container.querySelector<HTMLSelectElement>('select[name="logoLightId"]')!.value = image;
  const submit = () =>
    act(() =>
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
  await submit();
  expect(container.textContent).toContain("imagem pronta e disponível");
  await submit();
  expect(container.textContent).toContain("Logos salvos sem duplicar arquivos");
  expect(fetcher).toHaveBeenLastCalledWith(
    `/admin/institutions/${owner.id}/logos`,
    expect.objectContaining({
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": "csrf" },
      body: JSON.stringify({ logoLightId: image, logoDarkId: null }),
    }),
  );
  expect(document.activeElement).toBe(container.querySelector('[role="status"]'));
  await act(() => root.unmount());
});
