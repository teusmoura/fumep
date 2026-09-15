import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import type { LoginRequest } from "@fumep/validation";

import {
  AUTH_USER_REPOSITORY,
  SESSION_STORE,
  type AuthUserLookup,
  type SessionData,
  type SessionStore,
} from "./auth.contracts.js";
import { PasswordHasherService } from "./password-hasher.service.js";

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserLookup,
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
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
      absoluteExpiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
    };
    return this.sessions.create(session);
  }
}
