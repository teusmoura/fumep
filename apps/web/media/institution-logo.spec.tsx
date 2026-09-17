import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InstitutionLogo } from "./institution-logo";
const theme = {
  id: crypto.randomUUID(),
  slug: "fumep",
  primary: "#000000",
  primaryForeground: "#ffffff",
  accent: "#000000",
  accentForeground: "#ffffff",
  appearanceDefault: "SYSTEM" as const,
};
describe("SSR institutional logos", () => {
  it("keeps construction pages valid without selected logos", () => {
    expect(renderToStaticMarkup(<InstitutionLogo theme={theme} name="FUMEP" homePath="/" />)).toBe(
      "",
    );
  });
  it("renders both variants for CSS theme selection without client-side initial switching", () => {
    const html = renderToStaticMarkup(
      <InstitutionLogo
        theme={{
          ...theme,
          logoLightUrl: "/media/institutions/fumep/logo/light",
          logoDarkUrl: "/media/institutions/fumep/logo/dark",
        }}
        name="FUMEP"
        homePath="/"
      />,
    );
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="Página inicial — FUMEP"');
    expect(html).toContain('class="institution-logo-light"');
    expect(html).toContain('class="institution-logo-dark"');
    expect(html).toContain('alt="FUMEP"');
    expect(html).not.toContain("/_next/image");
  });
  it("falls back to light in dark mode and retains institution home/escaped name", () => {
    const html = renderToStaticMarkup(
      <InstitutionLogo
        theme={{ ...theme, slug: "etmsl", logoLightUrl: "/media/institutions/etmsl/logo/light" }}
        name="ETMSL <script>"
        homePath="/etmsl"
      />,
    );
    expect(html.match(/src="\/media\/institutions\/etmsl\/logo\/light"/g)).toHaveLength(2);
    expect(html).toContain('href="/etmsl"');
    expect(html).not.toContain("<script>");
  });
});
