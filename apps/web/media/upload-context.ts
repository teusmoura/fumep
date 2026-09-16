import "server-only";
import { mediaCategoryOptionSchema, type MediaCategoryOption } from "@fumep/validation";

export interface UploadContext {
  csrfToken: string;
  isAdmin: boolean;
  categories: MediaCategoryOption[];
}
export async function loadUploadContext(cookie: string): Promise<UploadContext | undefined> {
  try {
    const origin = process.env.API_INTERNAL_URL;
    if (!origin && process.env.NODE_ENV === "production") return undefined;
    const get = (path: string) =>
      fetch(new URL(path, origin ?? "http://127.0.0.1:3001"), {
        headers: { cookie },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
    const sessionResponse = await get("/api/v1/auth/session");
    if (!sessionResponse.ok) return undefined;
    const session = await sessionResponse.json();
    if (
      !/^[A-Za-z0-9_-]{43}$/.test(session.csrfToken) ||
      !["ADMIN", "EDITOR"].includes(session.user?.role)
    )
      return undefined;
    const response = await get("/api/v1/media/upload-categories");
    if (!response.ok) return undefined;
    const categories = mediaCategoryOptionSchema.array().parse(await response.json());
    return { csrfToken: session.csrfToken, isAdmin: session.user.role === "ADMIN", categories };
  } catch {
    return undefined;
  }
}
