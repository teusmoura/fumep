import { proxyMediaCategory } from "../../../../../media/upload-proxy";
async function mutate(request: Request, context: { params: Promise<{ id: string }> }) {
  return proxyMediaCategory(request, (await context.params).id);
}
export const PATCH = mutate;
export const DELETE = mutate;
