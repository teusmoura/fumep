import type { AuthUser } from "@fumep/db";
import type { SessionData as ValidatedSessionData } from "@fumep/validation";

export const AUTH_USER_REPOSITORY = Symbol("AUTH_USER_REPOSITORY");
export const SESSION_STORE = Symbol("SESSION_STORE");
export const SESSION_CONFIG = Symbol("SESSION_CONFIG");

export interface AuthUserLookup {
  findActiveByEmail(email: string): Promise<AuthUser | undefined>;
}

export type SessionData = ValidatedSessionData;

export interface SessionStore {
  create(data: SessionData): Promise<string>;
  find(sessionId: string): Promise<SessionData | undefined>;
}

export interface SessionConfig {
  inactivitySeconds: number;
  absoluteSeconds: number;
  secureCookie: boolean;
}
