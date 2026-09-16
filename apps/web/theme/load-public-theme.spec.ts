import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadPublicTheme } from "./load-public-theme";
const theme = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "fumep",
  primary: "#000000",
  primaryForeground: "#ffffff",
  accent: "#000000",
  accentForeground: "#ffffff",
  appearanceDefault: "SYSTEM",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("server-only public theme loading", () => {
  it("requests only the authorized public route, without credentials and with bounded fresh reads", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal:3001");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(theme)));
    vi.stubGlobal("fetch", fetcher);
    expect(await loadPublicTheme("fumep")).toEqual(theme);
    expect(fetcher).toHaveBeenCalledWith(
      new URL("http://api.internal:3001/api/v1/public/institutions/fumep/theme"),
      expect.objectContaining({ credentials: "omit", redirect: "error", cache: "no-store" }),
    );
  });
  it("handles missing institutions, rejects mismatched or extra private data", async () => {
    vi.stubEnv("API_INTERNAL_URL", "http://api.internal");
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await loadPublicTheme("fumep")).toBeUndefined();
    for (const data of [
      { ...theme, slug: "etmsl" },
      { ...theme, email: "private@fumep.test" },
    ]) {
      fetcher.mockResolvedValue(new Response(JSON.stringify(data)));
      await expect(loadPublicTheme("fumep")).rejects.toThrow();
    }
    fetcher.mockResolvedValue(new Response(null, { status: 500 }));
    await expect(loadPublicTheme("fumep")).rejects.toThrow("Public theme unavailable");
  });
  it("rejects malformed slugs and unsafe or missing production origins before fetching", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("API_INTERNAL_URL", "");
    await expect(loadPublicTheme("fumep")).rejects.toThrow("API_INTERNAL_URL is required");
    vi.stubEnv("API_INTERNAL_URL", "https://user:password@example.test");
    await expect(loadPublicTheme("fumep")).rejects.toThrow("Invalid API_INTERNAL_URL");
    await expect(loadPublicTheme("../admin")).rejects.toThrow();
  });
});
