import { describe, expect, it } from "vitest";
import {
  createInstitutionRequestSchema,
  institutionLogoConfigurationSchema,
  publicInstitutionThemeSchema,
} from "./index.js";
describe("optional institution logo configuration", () => {
  it("allows only same-origin public logo paths belonging to the theme institution", () => {
    const theme = {
      id: crypto.randomUUID(),
      slug: "fumep",
      primary: "#000000",
      primaryForeground: "#ffffff",
      accent: "#000000",
      accentForeground: "#ffffff",
      appearanceDefault: "SYSTEM",
    };
    expect(
      publicInstitutionThemeSchema.safeParse({
        ...theme,
        logoLightUrl: "/media/institutions/fumep/logo/light",
      }).success,
    ).toBe(true);
    for (const path of [
      "http://minio:9000/logo.png",
      "//minio/logo.png",
      "/media/institutions/etmsl/logo/light",
      "/media/institutions/fumep/logo/light?key=secret",
      "/media/institutions/fumep/logo/../light",
    ])
      expect(publicInstitutionThemeSchema.safeParse({ ...theme, logoLightUrl: path }).success).toBe(
        false,
      );
  });
  it("keeps institutions valid without logos and permits absent variants", () => {
    expect(createInstitutionRequestSchema.safeParse({ name: "FUMEP", slug: "fumep" }).success).toBe(
      true,
    );
    expect(institutionLogoConfigurationSchema.parse({})).toEqual({});
    expect(
      institutionLogoConfigurationSchema.parse({ logoLightId: null, logoDarkId: null }),
    ).toEqual({ logoLightId: null, logoDarkId: null });
    expect(
      institutionLogoConfigurationSchema.safeParse({
        logoLightId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
  });
  it("requires UUID references and rejects arbitrary URLs or extra fields", () => {
    for (const input of [
      { logoLightId: "https://example.test/logo.png" },
      { logoDarkId: "invalid" },
      { url: "https://example.test" },
    ])
      expect(institutionLogoConfigurationSchema.safeParse(input).success).toBe(false);
  });
});
