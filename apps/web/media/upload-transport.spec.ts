import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  proxyImageUpload,
  proxyPdfUpload,
  proxyMediaSelection,
  proxyMediaCategory,
  proxyMediaDeletion,
} from "./upload-proxy";
import { loadUploadContext } from "./upload-context";
import { loadCategoryContext } from "./category-context";
import { loadMediaLibrary } from "./library-context";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("server-only upload transport", () => {
  it("uses fixed DELETE/retry endpoints, forwarded session/CSRF and rejects unsafe IDs", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ status: "REQUESTED" }, { status: 202 }));
    vi.stubGlobal("fetch", fetcher);
    const id = crypto.randomUUID();
    const request = new Request("http://localhost:3000/admin/media/delete/fixture", {
      method: "DELETE",
      headers: {
        cookie: "fumep_session=fixture",
        origin: "http://localhost:3000",
        "x-csrf-token": "csrf",
      },
    });
    expect((await proxyMediaDeletion(request, "../secret")).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await proxyMediaDeletion(request, id)).status).toBe(202);
    expect(fetcher.mock.calls[0][0].pathname).toBe(`/api/v1/media/${id}`);
    expect(fetcher.mock.calls[0][1].method).toBe("DELETE");
    expect(fetcher.mock.calls[0][1].headers.get("x-csrf-token")).toBe("csrf");
    await proxyMediaDeletion(request, id, true);
    expect(fetcher.mock.calls[1][0].pathname).toBe(`/api/v1/media/${id}/deletion/retry`);
    expect(fetcher.mock.calls[1][1].method).toBe("POST");
  });
  it("loads paginated library results through no-store API and rejects invalid queries before fetch", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await loadMediaLibrary("fumep_session=fixture", { page: "0" })).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal:3001");
    fetcher
      .mockResolvedValueOnce(Response.json({ user: { role: "EDITOR" }, csrfToken: "a".repeat(43) }))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({ items: [], total: 0, page: 2, limit: 10 }));
    expect(
      await loadMediaLibrary("fumep_session=fixture", { q: "A & B", page: "2", limit: "10" }),
    ).toMatchObject({ query: { q: "A & B", page: 2, limit: 10 }, result: { items: [], total: 0 } });
    expect(fetcher.mock.calls[2][0].pathname).toBe("/api/v1/media");
    expect(fetcher.mock.calls[2][0].searchParams.get("q")).toBe("A & B");
    expect(fetcher.mock.calls[2][1]).toMatchObject({
      cache: "no-store",
      headers: { cookie: "fumep_session=fixture" },
    });
  });
  it("loads category management context through authorized no-store API projections", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal:3001");
    const category = {
      id: crypto.randomUUID(),
      institutionId: crypto.randomUUID(),
      name: "Laboratórios",
      slug: "laboratorios",
    };
    const institutions = [{ id: category.institutionId, name: "ETMSL" }];
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ user: { role: "EDITOR" }, csrfToken: "a".repeat(43) }))
      .mockResolvedValueOnce(
        Response.json([
          { id: category.id, institutionId: category.institutionId, name: category.name },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ categories: [category], institutions }));
    vi.stubGlobal("fetch", fetcher);
    expect(await loadCategoryContext("fumep_session=fixture")).toEqual({
      categories: [category],
      institutions,
      csrfToken: "a".repeat(43),
      isAdmin: false,
    });
    expect(fetcher.mock.calls[2][0].pathname).toBe("/api/v1/media/categories");
    expect(fetcher.mock.calls[2][1]).toMatchObject({
      cache: "no-store",
      headers: { cookie: "fumep_session=fixture" },
    });
  });
  it("preserves category mutation methods only on fixed backend paths and rejects unsafe IDs", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal:3001");
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    const id = crypto.randomUUID();
    const response = await proxyMediaCategory(
      new Request("http://localhost/category", {
        method: "DELETE",
        headers: { "x-csrf-token": "csrf" },
      }),
      id,
    );
    expect(response.status).toBe(204);
    expect(fetcher.mock.calls[0][0].pathname).toBe(`/api/v1/media/categories/${id}`);
    expect(fetcher.mock.calls[0][1].method).toBe("DELETE");
    const invalid = await proxyMediaCategory(
      new Request("http://localhost/category", { method: "PATCH" }),
      "../images",
    );
    expect(invalid.status).toBe(400);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("streams PDF only to documents endpoint with independent 30 MB transport limit", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal:3001");
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const headers = {
      "content-length": String(30 * 1024 * 1024 + 4096),
      "x-csrf-token": "fixture",
    };
    const response = await proxyPdfUpload(
      new Request("http://localhost/upload-pdf", { method: "POST", headers }),
    );
    expect(response.status).toBe(201);
    expect(fetcher.mock.calls[0][0].pathname).toBe("/api/v1/media/documents");
    expect(fetcher.mock.calls[0][1].headers.get("x-csrf-token")).toBe("fixture");
    const rejected = await proxyPdfUpload(
      new Request("http://localhost/upload-pdf", {
        method: "POST",
        headers: { "content-length": String(30 * 1024 * 1024 + 4097) },
      }),
    );
    expect(rejected.status).toBe(413);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("forwards selection only to the defined backend endpoint with CSRF and JSON", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal:3001");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "fixture" }));
    vi.stubGlobal("fetch", fetcher);
    const response = await proxyMediaSelection(
      new Request("http://localhost/admin/media/select", {
        method: "POST",
        body: '{"id":"fixture"}',
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "token",
          origin: "http://localhost:3000",
        },
      }),
    );
    expect(response.status).toBe(200);
    const [url, options] = fetcher.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/media/selection");
    expect(options.headers.get("x-csrf-token")).toBe("token");
    expect(options.headers.get("content-type")).toBe("application/json");
  });
  it("streams multipart to the fixed NestJS endpoint preserving CSRF and origin, not arbitrary headers", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal:3001");
    const fetcher = vi.fn().mockResolvedValue(new Response('{"id":"fixture"}', { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const request = new Request("http://localhost:3000/admin/media/upload", {
      method: "POST",
      body: "multipart fixture",
      headers: {
        cookie: "fumep_session=fixture",
        origin: "http://localhost:3000",
        "x-csrf-token": "token",
        "content-type": "multipart/form-data; boundary=fixture",
        "x-extra": "not-forwarded",
      },
    });
    const response = await proxyImageUpload(request);
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const [url, options] = fetcher.mock.calls[0];
    expect(url.href).toBe("http://api.internal:3001/api/v1/media/images");
    expect(options.body).toBe(request.body);
    expect(options.headers.get("origin")).toBe("http://localhost:3000");
    expect(options.headers.get("cookie")).toBe("fumep_session=fixture");
    expect(options.headers.get("x-csrf-token")).toBe("token");
    expect(options.headers.has("x-extra")).toBe(false);
  });
  it("rejects oversized content length and handles infrastructure failures without disclosure", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("internal secret"));
    vi.stubGlobal("fetch", fetcher);
    expect(
      (
        await proxyImageUpload(
          new Request("http://localhost/upload", {
            method: "POST",
            headers: { "content-length": "16000000" },
          }),
        )
      ).status,
    ).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
    const response = await proxyImageUpload(
      new Request("http://localhost/upload", { method: "POST" }),
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });
  it("loads only session and scoped category projection without caching or exposing internal origin", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal:3001");
    const category = { id: crypto.randomUUID(), name: "ETMSL", institutionId: crypto.randomUUID() };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ user: { role: "EDITOR" }, csrfToken: "a".repeat(43) }))
      .mockResolvedValueOnce(Response.json([category]));
    vi.stubGlobal("fetch", fetcher);
    expect(await loadUploadContext("fumep_session=fixture")).toEqual({
      csrfToken: "a".repeat(43),
      isAdmin: false,
      categories: [category],
    });
    expect(fetcher.mock.calls.map(([url]) => url.pathname)).toEqual([
      "/api/v1/auth/session",
      "/api/v1/media/upload-categories",
    ]);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      cache: "no-store",
      redirect: "error",
      headers: { cookie: "fumep_session=fixture" },
    });
  });
  it("fails closed for absent session and invalid category responses", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await loadUploadContext("fixture")).toBeUndefined();
    expect(fetcher).toHaveBeenCalledOnce();
    fetcher
      .mockResolvedValueOnce(Response.json({ user: { role: "EDITOR" }, csrfToken: "a".repeat(43) }))
      .mockResolvedValueOnce(Response.json([{ id: "invalid" }]));
    expect(await loadUploadContext("fixture")).toBeUndefined();
  });
});
