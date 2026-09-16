import { describe, expect, it } from "vitest";
import { contrastRatio, institutionThemeSchema, publicInstitutionThemeSchema } from "./index.js";
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
  it("matches sRGB reference ratios without rounding a failing pair up to 4.5", () => {
    for (const [background, foreground, expected] of [
      ["#000000", "#ffffff", 21],
      ["#ff0000", "#000000", 5.252],
      ["#00ff00", "#000000", 15.304],
      ["#0000ff", "#000000", 2.444],
      ["#767676", "#ffffff", 4.54222496],
      ["#777777", "#ffffff", 4.47808945],
    ] as const) {
      expect(contrastRatio(background, foreground)).toBeCloseTo(expected, 6);
      expect(contrastRatio(foreground, background)).toBeCloseTo(expected, 6);
    }
    expect(Number(contrastRatio("#777777", "#ffffff").toFixed(1))).toBe(4.5);
    expect(institutionThemeSchema.safeParse({ ...theme, primary: "#777777" }).success).toBe(false);
  });
  it("checks either pair independently in both foreground/background directions", () => {
    for (const [background, foreground] of [
      ["primary", "primaryForeground"],
      ["accent", "accentForeground"],
    ] as const) {
      for (const reverse of [false, true]) {
        expect(
          institutionThemeSchema.safeParse({
            ...theme,
            [background]: reverse ? "#ffffff" : "#767676",
            [foreground]: reverse ? "#767676" : "#ffffff",
          }).success,
        ).toBe(true);
        expect(
          institutionThemeSchema.safeParse({
            ...theme,
            [background]: reverse ? "#ffffff" : "#777777",
            [foreground]: reverse ? "#777777" : "#ffffff",
          }).success,
        ).toBe(false);
      }
    }
  });
  it("normalizes every token and keeps contrast validation on the public contract in either appearance", () => {
    const colors = {
      primary: "#0000FF",
      primaryForeground: "#FFFFFF",
      accent: "#FF0000",
      accentForeground: "#000000",
    };
    expect(institutionThemeSchema.parse(colors)).toEqual({
      primary: "#0000ff",
      primaryForeground: "#ffffff",
      accent: "#ff0000",
      accentForeground: "#000000",
    });
    for (const appearanceDefault of ["LIGHT", "DARK", "SYSTEM"] as const) {
      const publicTheme = {
        ...colors,
        id: "11111111-1111-4111-8111-111111111111",
        slug: "fumep",
        appearanceDefault,
      };
      expect(publicInstitutionThemeSchema.safeParse(publicTheme).success).toBe(true);
      expect(
        publicInstitutionThemeSchema.safeParse({ ...publicTheme, accentForeground: "#FF0000" })
          .success,
      ).toBe(false);
      expect(
        publicInstitutionThemeSchema.safeParse({ ...publicTheme, primaryForeground: "#0000FF" })
          .success,
      ).toBe(false);
    }
  });
});
