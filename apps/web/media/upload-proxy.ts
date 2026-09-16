import "server-only";

export async function proxyImageUpload(request: Request): Promise<Response> {
  const length = Number(request.headers.get("content-length"));
  if (length > 15 * 1024 * 1024 + 4096)
    return Response.json({ message: "Imagem excede 15 MB" }, { status: 413 });
  const headers = new Headers();
  for (const name of ["cookie", "origin", "referer", "x-csrf-token", "content-type"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const origin = process.env.API_INTERNAL_URL;
    if (!origin && process.env.NODE_ENV === "production")
      throw new Error("API_INTERNAL_URL is required");
    const response = await fetch(
      new URL("/api/v1/media/images", origin ?? "http://127.0.0.1:3001"),
      {
        method: "POST",
        headers,
        body: request.body,
        duplex: "half",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      } as RequestInit & { duplex: "half" },
    );
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { message: "Não foi possível enviar a imagem. Tente novamente." },
      { status: 503 },
    );
  }
}
