import type { AppearanceDefault } from "@fumep/validation";

export type AppearanceMode = "LIGHT" | "DARK";
export const appearanceCookieName = "fumep_appearance";
export function parseManualAppearance(value: unknown): AppearanceMode | undefined {
  return value === "LIGHT" || value === "DARK" ? value : undefined;
}
export function resolveAppearance(
  manual: AppearanceMode | undefined,
  admin: AppearanceDefault,
  systemDark: boolean,
): AppearanceMode {
  return manual ?? (admin === "SYSTEM" ? (systemDark ? "DARK" : "LIGHT") : admin);
}
export function persistManualAppearance(mode: AppearanceMode) {
  // Visual preference only. Never read, write or expose the authentication cookie.
  try {
    document.cookie = `${appearanceCookieName}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    // Switching still works in memory when browser storage is unavailable.
  }
}
