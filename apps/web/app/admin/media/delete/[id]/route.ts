import { proxyMediaDeletion } from "../../../../../media/upload-proxy";
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return proxyMediaDeletion(request, (await context.params).id);
}
