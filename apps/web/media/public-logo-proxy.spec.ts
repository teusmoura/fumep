import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { proxyPublicLogo } from "./public-logo-proxy";
import { proxyInstitutionLogos } from "./upload-proxy";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("delivers same-origin bytes only from the fixed public API route, never forwards a session", async () => {
  vi.stubEnv("API_INTERNAL_URL", "http://api.internal:3001");
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(new Uint8Array([1, 2]), { headers: { "Content-Type": "image/webp" } }),
    );
  vi.stubGlobal("fetch", fetcher);
  const result = await proxyPublicLogo("fumep", "dark");
  expect(result.status).toBe(200);
  expect(result.headers.get("content-type")).toBe("image/webp");
  expect([...new Uint8Array(await result.arrayBuffer())]).toEqual([1, 2]);
  expect(fetcher).toHaveBeenCalledWith(
    new URL("http://api.internal:3001/api/v1/public/institutions/fumep/logo/dark"),
    expect.objectContaining({ credentials: "omit", cache: "no-store", redirect: "error" }),
  );
});
it("rejects path injection, invalid MIME, upstream errors and oversized streamed logos", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await proxyPublicLogo("../media", "light")).status).toBe(400);
  expect((await proxyPublicLogo("fumep", "../light")).status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
  for (const response of [
    new Response(null, { status: 404 }),
    new Response("secret", { status: 500 }),
    new Response("<script>", { headers: { "Content-Type": "image/svg+xml" } }),
    new Response(new Uint8Array(15 * 1024 * 1024 + 1), {
      headers: { "Content-Type": "image/png" },
    }),
  ]) {
    fetcher.mockResolvedValueOnce(response);
    const result = await proxyPublicLogo("fumep", "light");
    expect(result.status).toBe(response.status === 404 ? 404 : 503);
    expect(await result.text()).toBe("");
  }
});
it("forwards cookie/origin/CSRF to the fixed administrative mutation and validates the institution ID", async () => {
  const id = crypto.randomUUID();
  vi.stubEnv("API_INTERNAL_URL", "http://api.internal");
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ id, logoLightId: null, logoDarkId: null }));
  vi.stubGlobal("fetch", fetcher);
  const request = new Request("http://localhost:3000/admin/institutions/unused/logos", {
    method: "PATCH",
    headers: {
      cookie: "fumep_session=fixture",
      origin: "http://localhost:3000",
      "X-CSRF-Token": "csrf",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ logoLightId: null }),
  });
  expect((await proxyInstitutionLogos(request, "../media")).status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
  expect((await proxyInstitutionLogos(request, id)).status).toBe(200);
  const [url, init] = fetcher.mock.calls[0]!;
  expect(url.pathname).toBe(`/api/v1/institutions/${id}/logos`);
  expect(init.method).toBe("PATCH");
  expect(init.headers.get("cookie")).toBe("fumep_session=fixture");
  expect(init.headers.get("x-csrf-token")).toBe("csrf");
});
