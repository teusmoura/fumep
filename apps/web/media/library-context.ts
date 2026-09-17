import "server-only";
import { mediaLibraryQuerySchema, mediaLibraryResponseSchema } from "@fumep/validation";
import { loadUploadContext } from "./upload-context";
export async function loadMediaLibrary(cookie: string, query: unknown) {
  const parsed = mediaLibraryQuerySchema.safeParse(query);
  if (!parsed.success) return undefined;
  const context = await loadUploadContext(cookie);
  if (!context) return undefined;
  try {
    const url = new URL("/api/v1/media", process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3001");
    for (const [key, value] of Object.entries(parsed.data))
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    const response = await fetch(url, {
      headers: { cookie },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return undefined;
    return {
      query: parsed.data,
      categories: context.categories,
      result: mediaLibraryResponseSchema.parse(await response.json()),
    };
  } catch {
    return undefined;
  }
}
