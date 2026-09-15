import type { CookieOptions } from "express";

import type { SessionConfig } from "./auth.contracts.js";

export const SESSION_COOKIE_NAME = "fumep_session";

export function readSessionId(cookieHeader: string | undefined): string | undefined {
  return cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim().split("="))
    .find(([name]) => name === SESSION_COOKIE_NAME)?.[1];
}

export function sessionCookieOptions(config: SessionConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.secureCookie,
    sameSite: "lax",
    path: "/",
  };
}
