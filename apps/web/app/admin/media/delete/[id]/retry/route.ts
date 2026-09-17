import { proxyMediaDeletion } from "../../../../../../media/upload-proxy";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return proxyMediaDeletion(request, (await context.params).id, true);
}
