import { timingSafeEqual } from "node:crypto";

import { ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";

import type { SessionData } from "./auth.contracts.js";

@Injectable()
export class CsrfService {
  validate(request: Request, session: SessionData, appOrigin: string): void {
    const token = request.header("x-csrf-token");
    const source = request.header("origin") ?? request.header("referer");
    let sourceOrigin: string | undefined;
    try {
      sourceOrigin = source ? new URL(source).origin : undefined;
    } catch {
      sourceOrigin = undefined;
    }
    const expected = Buffer.from(session.csrfToken);
    const received = Buffer.from(token ?? "");
    if (
      sourceOrigin !== new URL(appOrigin).origin ||
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      throw new ForbiddenException("Invalid CSRF protection");
  }
}
