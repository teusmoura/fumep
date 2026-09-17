import { proxyMediaCategory } from "../../../../media/upload-proxy";
export function POST(request: Request) {
  return proxyMediaCategory(request);
}
