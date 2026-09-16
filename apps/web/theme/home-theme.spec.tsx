import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./load-public-theme", () => ({ loadPublicTheme: vi.fn() }));
import { loadPublicTheme } from "./load-public-theme";
import HomePage from "../app/page";
afterEach(() => vi.resetAllMocks());
describe("public home theme integration", () => {
  it("renders server-loaded public tokens into the shared provider and preserves semantic content", async () => {
    vi.mocked(loadPublicTheme).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      slug: "fumep",
      primary: "#123456",
      primaryForeground: "#ffffff",
      accent: "#000000",
      accentForeground: "#ffffff",
      appearanceDefault: "DARK",
    });
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain('data-institution="fumep"');
    expect(html).toContain('data-appearance="DARK"');
    expect(html).toContain("--color-primary:#123456");
    expect(html).toContain("<main");
    expect(html).toContain('id="main-content"');
    expect(html).toContain("Portal FUMEP");
  });
  it("keeps the neutral construction page available without leaking an API error", async () => {
    vi.mocked(loadPublicTheme).mockRejectedValue(new Error("private internal detail"));
    const html = renderToStaticMarkup(await HomePage());
    expect(html).toContain("Portal FUMEP");
    expect(html).not.toContain("private internal detail");
    expect(html).not.toContain("data-institution");
  });
});
