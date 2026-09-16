import { describe, expect, it } from "vitest";
import { createInstitutionRequestSchema, institutionLogoConfigurationSchema } from "./index.js";
describe("optional institution logo configuration", () => {
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
