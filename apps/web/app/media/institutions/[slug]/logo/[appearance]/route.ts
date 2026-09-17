import { proxyPublicLogo } from "../../../../../../media/public-logo-proxy";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; appearance: string }> },
) {
  const { slug, appearance } = await params;
  return proxyPublicLogo(slug, appearance);
}
