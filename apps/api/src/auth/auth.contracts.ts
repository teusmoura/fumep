import type { AuthUser } from "@fumep/db";

export const AUTH_USER_REPOSITORY = Symbol("AUTH_USER_REPOSITORY");
export const SESSION_STORE = Symbol("SESSION_STORE");

export interface AuthUserLookup {
  findActiveByEmail(email: string): Promise<AuthUser | undefined>;
}

export interface SessionData {
  userId: string;
  role: "ADMIN" | "EDITOR";
  institutionIds: string[];
  createdAt: string;
  lastActivityAt: string;
  absoluteExpiresAt: string;
}

export interface SessionStore {
  create(data: SessionData): Promise<string>;
}
