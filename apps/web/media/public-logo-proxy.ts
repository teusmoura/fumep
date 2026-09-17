import "server-only";
import { IMAGE_MAX_BYTES, institutionSlugSchema } from "@fumep/validation";
export async function proxyPublicLogo(slug: string, appearance: string): Promise<Response> {
  if (!institutionSlugSchema.safeParse(slug).success || !["light", "dark"].includes(appearance))
    return new Response(null, { status: 400 });
  try {
    const origin = process.env.API_INTERNAL_URL;
    if (!origin && process.env.NODE_ENV === "production")
      throw new Error("API_INTERNAL_URL required");
    const url = new URL(
      `/api/v1/public/institutions/${slug}/logo/${appearance}`,
      origin ?? "http://127.0.0.1:3001",
    );
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
      throw new Error("Invalid API origin");
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      credentials: "omit",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return new Response(null, { status: response.status === 404 ? 404 : 503 });
    }
    const mime = response.headers.get("content-type")?.split(";")[0];
    if (!mime || !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(mime)) {
      await response.body?.cancel();
      throw new Error("Invalid image response");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Missing image response");
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > IMAGE_MAX_BYTES) throw new Error("Oversized image");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return new Response(bytes, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
