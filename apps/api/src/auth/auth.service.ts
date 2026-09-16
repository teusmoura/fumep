import { randomBytes } from "node:crypto";

import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import type { LoginRequest } from "@fumep/validation";

import {
  AUTH_USER_REPOSITORY,
  SESSION_CONFIG,
  SESSION_STORE,
  type AuthUserLookup,
  type SessionData,
  type SessionConfig,
  type SessionStore,
} from "./auth.contracts.js";
import { PasswordHasherService } from "./password-hasher.service.js";

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserLookup,
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
    @Inject(SESSION_CONFIG) private readonly sessionConfig: SessionConfig,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  async login(credentials: LoginRequest): Promise<{ sessionId: string; csrfToken: string }> {
    const user = await this.users.findActiveByEmail(credentials.email);
    if (!user || !(await this.passwordHasher.verify(user.passwordHash, credentials.password))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const now = new Date();
    const session: SessionData = {
      userId: user.id,
      role: user.role,
      institutionIds: user.institutionIds,
      csrfToken: randomBytes(32).toString("base64url"),
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
      absoluteExpiresAt: new Date(
        now.getTime() + this.sessionConfig.absoluteSeconds * 1000,
      ).toISOString(),
    };
    return { sessionId: await this.sessions.create(session), csrfToken: session.csrfToken };
  }

  async getSession(sessionId: string | undefined): Promise<SessionData> {
    if (!sessionId) throw new UnauthorizedException("Authentication required");
    const session = await this.sessions.find(sessionId);
    if (!session) throw new UnauthorizedException("Authentication required");
    return session;
  }

  async findSession(sessionId: string | undefined): Promise<SessionData | undefined> {
    return sessionId ? this.sessions.find(sessionId) : undefined;
  }

  async logout(sessionId: string | undefined): Promise<void> {
    if (sessionId) await this.sessions.delete(sessionId);
  }

  requestPasswordRecovery(): { message: string } {
    return {
      message:
        "Se existir uma conta associada a esse e-mail, enviaremos as instruções para redefinição da senha.",
    };
  }
}
