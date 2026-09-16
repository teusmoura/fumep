import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicInstitutionTheme } from "@fumep/validation";
vi.mock("../theme/load-public-theme", () => ({ loadPublicTheme: vi.fn() }));
import { loadPublicTheme } from "../theme/load-public-theme";
import HomePage from "../app/page";
import EtmslHomePage from "../app/etmsl/page";
import CramamHomePage from "../app/cramam/page";
import { InstitutionProvider, useInstitution } from "./institution-context";
import { publicInstitutions, resolveInstitution } from "./institution-route";

afterEach(() => vi.resetAllMocks());
const themes: Record<string, PublicInstitutionTheme> = Object.fromEntries(
  ["fumep", "etmsl", "cramam"].map((slug, index) => [
    slug,
    {
      id: `11111111-1111-4111-8111-11111111111${index}`,
      slug,
      primary: ["#123456", "#234567", "#345678"][index]!,
      primaryForeground: "#ffffff",
      accent: "#000000",
      accentForeground: "#ffffff",
      appearanceDefault: "LIGHT",
    },
  ]),
);
function Probe() {
  const institution = useInstitution();
  return (
    <span>
      {institution.slug}:{institution.name}:{institution.homePath}
    </span>
  );
}
describe("institution route context", () => {
  it.each([
    ["/", "fumep"],
    ["/etmsl", "etmsl"],
    ["/cramam", "cramam"],
    ["/etmsl/cursos", "etmsl"],
    ["/cramam/noticias", "cramam"],
    ["/etmsl-other", "fumep"],
    ["/other/etmsl", "fumep"],
  ])("resolves %s to %s using complete segments", (path, slug) => {
    expect(resolveInstitution(path).slug).toBe(slug);
  });
  it("shares the route identity through context without mutable global state", () => {
    for (const institution of Object.values(publicInstitutions)) {
      const html = renderToStaticMarkup(
        <InstitutionProvider institution={institution}>
          <Probe />
        </InstitutionProvider>,
      );
      expect(html).toContain(`${institution.slug}:${institution.name}:${institution.homePath}`);
    }
    expect(() => renderToStaticMarkup(<Probe />)).toThrow("InstitutionProvider");
  });
  it("renders each actual route with its own server-loaded theme, including a return to FUMEP", async () => {
    vi.mocked(loadPublicTheme).mockImplementation(async (slug) => themes[slug]);
    for (const [page, slug] of [
      [HomePage, "fumep"],
      [EtmslHomePage, "etmsl"],
      [CramamHomePage, "cramam"],
      [HomePage, "fumep"],
    ] as const) {
      const element = await page();
      expect(element.props.institution).toEqual(publicInstitutions[slug]);
      const html = renderToStaticMarkup(element);
      expect(html).toContain(`Portal ${publicInstitutions[slug].name}`);
      expect(html).toContain(`data-institution="${slug}"`);
      expect(html).toContain(`--color-primary:${themes[slug]!.primary}`);
      expect(html).toContain('id="main-content"');
      for (const other of Object.keys(themes).filter((key) => key !== slug)) {
        expect(html).not.toContain(`data-institution="${other}"`);
        expect(html).not.toContain(`--color-primary:${themes[other]!.primary}`);
      }
    }
    expect(vi.mocked(loadPublicTheme).mock.calls.map(([slug]) => slug)).toEqual([
      "fumep",
      "etmsl",
      "cramam",
      "fumep",
    ]);
  });
  it("preserves route identity with a neutral fallback for unavailable or mismatched themes", async () => {
    for (const value of [undefined, themes.fumep]) {
      vi.mocked(loadPublicTheme).mockResolvedValue(value);
      const element = await EtmslHomePage();
      expect(element.props.institution).toEqual(publicInstitutions.etmsl);
      const html = renderToStaticMarkup(element);
      expect(html).toContain("Portal ETMSL");
      expect(html).not.toContain("--color-primary:");
    }
    vi.mocked(loadPublicTheme).mockRejectedValue(new Error("internal secret"));
    const html = renderToStaticMarkup(await CramamHomePage());
    expect(html).toContain("Portal CRAMAM");
    expect(html).not.toContain("internal secret");
  });
});
