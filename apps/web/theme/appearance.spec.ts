import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { cookies } from "next/headers";
import { readManualAppearance } from "./read-appearance";
import {
  appearanceCookieName,
  parseManualAppearance,
  resolveAppearance,
  persistManualAppearance,
} from "./appearance";

afterEach(() => vi.unstubAllGlobals());

describe("appearance precedence", () => {
  it("scopes the visual cookie to the portal and uses Secure over HTTPS, tolerating blocked storage", () => {
    const write = vi.fn();
    vi.stubGlobal("document", Object.defineProperty({}, "cookie", { set: write }));
    vi.stubGlobal("location", { protocol: "https:" });
    persistManualAppearance("DARK");
    expect(write).toHaveBeenCalledWith(
      "fumep_appearance=DARK; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
    );
    write.mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    expect(() => persistManualAppearance("LIGHT")).not.toThrow();
  });
  it("uses manual before ADMIN and SYSTEM for every combination", () => {
    for (const manual of [undefined, "LIGHT", "DARK"] as const) {
      for (const admin of ["SYSTEM", "LIGHT", "DARK"] as const) {
        for (const systemDark of [false, true]) {
          const expected = manual ?? (admin === "SYSTEM" ? (systemDark ? "DARK" : "LIGHT") : admin);
          expect(resolveAppearance(manual, admin, systemDark)).toBe(expected);
        }
      }
    }
  });
  it("accepts only a visual LIGHT/DARK cookie and ignores arbitrary values", async () => {
    for (const value of [undefined, "SYSTEM", "light", "<script>", "DARK", "LIGHT"]) {
      const get = vi.fn().mockReturnValue(value === undefined ? undefined : { value });
      vi.mocked(cookies).mockResolvedValue({ get } as unknown as Awaited<
        ReturnType<typeof cookies>
      >);
      expect(await readManualAppearance()).toBe(parseManualAppearance(value));
      expect(get).toHaveBeenCalledWith(appearanceCookieName);
    }
    expect(parseManualAppearance("DARK")).toBe("DARK");
    expect(parseManualAppearance("LIGHT")).toBe("LIGHT");
    expect(parseManualAppearance("SYSTEM")).toBeUndefined();
  });
});
