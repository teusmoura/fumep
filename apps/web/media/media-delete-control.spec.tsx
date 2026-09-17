// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { MediaDeleteControl } from "./media-delete-control";
import { MediaDeletionRecovery } from "./media-deletion-recovery";
const id = crypto.randomUUID();
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});
it("prepares an explicit UUID recovery cycle, validates before fetch and sends POST after confirmation", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const fetcher = vi
    .fn()
    .mockResolvedValue({ status: 202, json: async () => ({ mediaId: id, status: "REQUESTED" }) });
  vi.stubGlobal("fetch", fetcher);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(() => root.render(<MediaDeletionRecovery csrfToken="csrf" />));
  const input = container.querySelector<HTMLInputElement>('input[name="id"]')!;
  const submit = () =>
    act(() =>
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
  input.value = "bad";
  await submit();
  expect(container.textContent).toContain("UUID válida");
  expect(fetcher).not.toHaveBeenCalled();
  input.value = id.toUpperCase();
  await submit();
  expect(fetcher).not.toHaveBeenCalled();
  await act(() => container.querySelector<HTMLButtonElement>("button[aria-label]")!.click());
  await act(() => container.querySelector<HTMLButtonElement>("fieldset button")!.click());
  expect(fetcher).toHaveBeenCalledWith(
    `/admin/media/delete/${id}/retry`,
    expect.objectContaining({ method: "POST", headers: { "X-CSRF-Token": "csrf" } }),
  );
  await act(() => root.unmount());
});
it("renders escaped filename, no CSRF in HTML and accessible status/confirmation", () => {
  const html = renderToStaticMarkup(
    <MediaDeleteControl id={id} name="<script>" csrfToken="secret" />,
  );
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("secret");
  expect(html).toContain('role="status"');
});
it("requires confirmation, restores cancel focus, sends CSRF and reports conflict versus asynchronous acceptance", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ status: 409 })
    .mockResolvedValueOnce({
      status: 202,
      json: async () => ({ mediaId: id, status: "REQUESTED" }),
    });
  vi.stubGlobal("fetch", fetcher);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(() => root.render(<MediaDeleteControl id={id} name="fixture.png" csrfToken="csrf" />));
  const trigger = container.querySelector<HTMLButtonElement>("button[aria-label]")!;
  await act(() => trigger.click());
  expect(fetcher).not.toHaveBeenCalled();
  const confirm = () => container.querySelector<HTMLButtonElement>("fieldset button")!;
  expect(document.activeElement).toBe(confirm());
  await act(() => container.querySelectorAll<HTMLButtonElement>("fieldset button")[1].click());
  expect(document.activeElement).toBe(trigger);
  await act(() => trigger.click());
  await act(() => confirm().click());
  expect(container.textContent).toContain("Exclusão bloqueada");
  expect(trigger.disabled).toBe(false);
  await act(() => confirm().click());
  expect(fetcher.mock.calls[1]).toEqual([
    `/admin/media/delete/${id}`,
    expect.objectContaining({
      method: "DELETE",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": "csrf" },
    }),
  ]);
  expect(container.textContent).toContain("Exclusão solicitada");
  expect(container.textContent).not.toContain("Arquivo excluído");
  expect(trigger.disabled).toBe(true);
  expect(document.activeElement).toBe(container.querySelector('[role="status"]'));
  await act(() => root.unmount());
});
