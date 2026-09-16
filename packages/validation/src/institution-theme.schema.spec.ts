import { describe, expect, it } from "vitest";
import { contrastRatio, institutionThemeSchema } from "./index.js";
describe("institution theme", () => {
  const theme = {
    primary: "#000000",
    primaryForeground: "#ffffff",
    accent: "#000000",
    accentForeground: "#ffffff",
  };
  it("validates and normalizes controlled hexadecimal colors", () => {
    expect(institutionThemeSchema.parse({ ...theme, primaryForeground: "#FFFFFF" })).toEqual(theme);
    for (const value of ["red", "#fff", "url(test)", "#xyzxyz"])
      expect(institutionThemeSchema.safeParse({ ...theme, primary: value }).success).toBe(false);
    expect(institutionThemeSchema.safeParse({ ...theme, css: "arbitrary" }).success).toBe(false);
  });
  it("requires both text/background pairs to have at least 4.5:1 contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
    expect(institutionThemeSchema.safeParse({ ...theme, primary: "#ffffff" }).success).toBe(false);
    expect(
      institutionThemeSchema.safeParse({ ...theme, accentForeground: "#000000" }).success,
    ).toBe(false);
    expect(institutionThemeSchema.safeParse({ ...theme, primary: "#767676" }).success).toBe(true);
    expect(institutionThemeSchema.safeParse({ ...theme, primary: "#777777" }).success).toBe(false);
  });
});
