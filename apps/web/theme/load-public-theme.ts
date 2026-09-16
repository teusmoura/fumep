import "server-only";
import { institutionSlugSchema, publicInstitutionThemeSchema } from "@fumep/validation";

export async function loadPublicTheme(slug: string) {
  const parsedSlug = institutionSlugSchema.parse(slug);
  const configured = process.env.API_INTERNAL_URL;
  if (!configured && process.env.NODE_ENV === "production")
    throw new Error("API_INTERNAL_URL is required");
  const base = new URL(configured ?? "http://127.0.0.1:3001");
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password)
    throw new Error("Invalid API_INTERNAL_URL");
  const response = await fetch(
    new URL(`/api/v1/public/institutions/${encodeURIComponent(parsedSlug)}/theme`, base),
    {
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error("Public theme unavailable");
  const theme = publicInstitutionThemeSchema.parse(await response.json());
  if (theme.slug !== parsedSlug) throw new Error("Unexpected institution theme");
  return theme;
}
