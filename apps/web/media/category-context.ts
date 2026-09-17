import "server-only";
import { mediaCategoryContextSchema } from "@fumep/validation";
import { loadUploadContext } from "./upload-context";
export async function loadCategoryContext(cookie: string) {
  const session = await loadUploadContext(cookie);
  if (!session) return undefined;
  try {
    const response = await fetch(
      new URL("/api/v1/media/categories", process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3001"),
      {
        headers: { cookie },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return undefined;
    return {
      ...mediaCategoryContextSchema.parse(await response.json()),
      csrfToken: session.csrfToken,
      isAdmin: session.isAdmin,
    };
  } catch {
    return undefined;
  }
}
