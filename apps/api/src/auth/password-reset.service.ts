import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { ResetPasswordRequest } from "@fumep/validation";
import { SESSION_STORE, type SessionStore } from "./auth.contracts.js";
import { PasswordHasherService } from "./password-hasher.service.js";
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  hashPasswordResetToken,
} from "./password-reset-token.service.js";

export interface PasswordResetExecutor {
  reset(
    tokenHash: string,
    passwordHash: string,
    revokeSessions: (userId: string) => Promise<void>,
  ): Promise<boolean>;
}

@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY) private readonly tokens: PasswordResetExecutor,
    private readonly hasher: PasswordHasherService,
    @Inject(SESSION_STORE) private readonly sessions: SessionStore,
  ) {}

  async reset(input: ResetPasswordRequest) {
    const hash = await this.hasher.hash(input.password);
    const success = await this.tokens.reset(hashPasswordResetToken(input.token), hash, (userId) =>
      this.sessions.deleteForUser(userId),
    );
    if (!success) throw new BadRequestException("Invalid or expired reset token");
    return { message: "Senha redefinida com sucesso. Realize um novo login." };
  }
}
