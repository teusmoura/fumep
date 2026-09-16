import { describe, expect, it } from "vitest";
import {
  appearanceDefaultSchema,
  institutionalLinkSchema,
  updateInstitutionSettingRequestSchema,
} from "./index.js";
describe("institution settings contracts", () => {
  it("exports exactly the three canonical appearance values", () => {
    expect(appearanceDefaultSchema.options).toEqual(["SYSTEM", "LIGHT", "DARK"]);
    for (const value of ["system", null, "AUTO", 1])
      expect(appearanceDefaultSchema.safeParse(value).success).toBe(false);
  });
  it("rejects unsafe, credential-bearing and malformed URLs without throwing", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,test",
      "https://user:password@example.test",
      "not-a-url",
      "/relative",
    ])
      expect(institutionalLinkSchema.safeParse({ label: "Link", url }).success).toBe(false);
    expect(
      institutionalLinkSchema.safeParse({ label: "Link", url: "https://example.test/path" })
        .success,
    ).toBe(true);
  });
  it("accepts appearance choices and clearing contact fields, rejects empty or unknown input", () => {
    for (const appearanceDefault of ["SYSTEM", "LIGHT", "DARK"])
      expect(
        updateInstitutionSettingRequestSchema.safeParse({ appearanceDefault, email: null }).success,
      ).toBe(true);
    for (const input of [
      {},
      { extra: true },
      { appearanceDefault: "INVALID" },
      { phone: "x".repeat(51) },
    ])
      expect(updateInstitutionSettingRequestSchema.safeParse(input).success).toBe(false);
  });
});
