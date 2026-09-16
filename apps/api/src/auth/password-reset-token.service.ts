import { createHash, randomBytes } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import type { CreatePasswordResetTokenInput } from "@fumep/db";

export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol("PASSWORD_RESET_TOKEN_REPOSITORY");

export interface PasswordResetTokenWriter {
  create(input: CreatePasswordResetTokenInput): Promise<void>;
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class PasswordResetTokenService {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY) private readonly tokens: PasswordResetTokenWriter,
  ) {}

  // The original token is returned only to the internal caller preparing the recovery link.
  async issue(userId: string): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await this.tokens.create({
      userId,
      tokenHash: hashPasswordResetToken(token),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    return token;
  }
}
