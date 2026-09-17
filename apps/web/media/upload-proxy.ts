import "server-only";

export function proxyImageUpload(request: Request): Promise<Response> {
  return proxy(request, "/api/v1/media/images", 15 * 1024 * 1024 + 4096);
}
export function proxyPdfUpload(request: Request): Promise<Response> {
  return proxy(request, "/api/v1/media/documents", 30 * 1024 * 1024 + 4096);
}
export function proxyMediaSelection(request: Request): Promise<Response> {
  return proxy(request, "/api/v1/media/selection", 4096);
}
export function proxyMediaCategory(request: Request, id?: string): Promise<Response> {
  if (id && !/^[0-9a-f-]{36}$/i.test(id))
    return Promise.resolve(Response.json({ message: "Categoria inválida" }, { status: 400 }));
  return proxy(request, `/api/v1/media/categories${id ? `/${id}` : ""}`, 4096, request.method);
}
export function proxyMediaDeletion(request: Request, id: string, retry = false): Promise<Response> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return Promise.resolve(Response.json({ message: "Mídia inválida" }, { status: 400 }));
  return proxy(
    request,
    `/api/v1/media/${id}${retry ? "/deletion/retry" : ""}`,
    4096,
    retry ? "POST" : "DELETE",
  );
}
async function proxy(
  request: Request,
  endpoint: string,
  maximumLength: number,
  method = "POST",
): Promise<Response> {
  const length = Number(request.headers.get("content-length"));
  if (length > maximumLength)
    return Response.json({ message: "Arquivo excede o limite permitido" }, { status: 413 });
  const headers = new Headers();
  for (const name of ["cookie", "origin", "referer", "x-csrf-token", "content-type"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const origin = process.env.API_INTERNAL_URL;
    if (!origin && process.env.NODE_ENV === "production")
      throw new Error("API_INTERNAL_URL is required");
    const response = await fetch(new URL(endpoint, origin ?? "http://127.0.0.1:3001"), {
      method,
      headers,
      body: request.body,
      duplex: "half",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    } as RequestInit & { duplex: "half" });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { message: "Não foi possível enviar o arquivo. Tente novamente." },
      { status: 503 },
    );
  }
}
