import "server-only";
import { institutionLogoSelectionSchema } from "@fumep/validation";
export async function loadLogoInstitutions(cookie: string) {
  try {
    const origin = process.env.API_INTERNAL_URL;
    if (!origin && process.env.NODE_ENV === "production") return undefined;
    const response = await fetch(
      new URL("/api/v1/institutions", origin ?? "http://127.0.0.1:3001"),
      {
        headers: { cookie },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return undefined;
    // Explicit selection projection strips all other institutional fields.
    return institutionLogoSelectionSchema.array().parse(await response.json());
  } catch {
    return undefined;
  }
}
