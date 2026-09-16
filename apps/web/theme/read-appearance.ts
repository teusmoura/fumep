import "server-only";
import { cookies } from "next/headers";
import { appearanceCookieName, parseManualAppearance } from "./appearance";

export async function readManualAppearance() {
  return parseManualAppearance((await cookies()).get(appearanceCookieName)?.value);
}
