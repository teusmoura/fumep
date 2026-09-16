import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicInstitutionTheme } from "@fumep/validation";
import { ThemeProvider, useTheme } from "./theme-context";
const theme: PublicInstitutionTheme = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "fumep",
  primary: "#123456",
  primaryForeground: "#ffffff",
  accent: "#000000",
  accentForeground: "#ffffff",
  appearanceDefault: "LIGHT",
};
function Probe() {
  const { theme, mode } = useTheme();
  return (
    <span>
      {theme.slug}:{mode}
    </span>
  );
}
describe("ThemeContext SSR", () => {
  it("renders the saved visual preference ahead of every ADMIN default in all institutions", () => {
    for (const slug of ["fumep", "etmsl", "cramam"]) {
      for (const appearanceDefault of ["SYSTEM", "LIGHT", "DARK"] as const) {
        for (const manual of ["LIGHT", "DARK"] as const) {
          const html = renderToStaticMarkup(
            <ThemeProvider
              theme={{ ...theme, slug, appearanceDefault }}
              initialManualAppearance={manual}
            >
              <Probe />
            </ThemeProvider>,
          );
          expect(html).toContain(`data-appearance="${manual}"`);
          expect(html).toContain(`${slug}:${manual}`);
        }
      }
    }
  });
  it("shares institution tokens and appearance without browser APIs during SSR", () => {
    for (const appearanceDefault of ["LIGHT", "DARK", "SYSTEM"] as const) {
      const html = renderToStaticMarkup(
        <ThemeProvider theme={{ ...theme, appearanceDefault }}>
          <Probe />
        </ThemeProvider>,
      );
      expect(html).toContain(`data-appearance="${appearanceDefault}"`);
      expect(html).toContain("--color-primary:#123456");
      expect(html).toContain(`fumep:${appearanceDefault === "DARK" ? "DARK" : "LIGHT"}`);
      expect(html).not.toContain("API_INTERNAL_URL");
    }
  });
  it("uses the same provider for another institution and rejects missing context", () => {
    expect(
      renderToStaticMarkup(
        <ThemeProvider theme={{ ...theme, slug: "etmsl" }}>
          <Probe />
        </ThemeProvider>,
      ),
    ).toContain("etmsl:LIGHT");
    expect(() => renderToStaticMarkup(<Probe />)).toThrow("useTheme requires ThemeProvider");
  });
});
