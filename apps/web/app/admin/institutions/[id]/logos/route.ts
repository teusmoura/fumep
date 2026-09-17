import { proxyInstitutionLogos } from "../../../../../media/upload-proxy";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return proxyInstitutionLogos(request, (await params).id);
}
