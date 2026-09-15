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

  async login(credentials: LoginRequest): Promise<string> {
    const user = await this.users.findActiveByEmail(credentials.email);
    if (!user || !(await this.passwordHasher.verify(user.passwordHash, credentials.password))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const now = new Date();
    const session: SessionData = {
      userId: user.id,
      role: user.role,
      institutionIds: user.institutionIds,
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
      absoluteExpiresAt: new Date(
        now.getTime() + this.sessionConfig.absoluteSeconds * 1000,
      ).toISOString(),
    };
    return this.sessions.create(session);
  }

  async getSession(sessionId: string | undefined): Promise<SessionData> {
    if (!sessionId) throw new UnauthorizedException("Authentication required");
    const session = await this.sessions.find(sessionId);
    if (!session) throw new UnauthorizedException("Authentication required");
    return session;
  }
}
