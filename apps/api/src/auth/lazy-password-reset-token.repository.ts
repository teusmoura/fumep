import type { OnModuleDestroy } from "@nestjs/common";

import {
  createDatabase,
  PasswordResetTokenRepository,
  type CreatePasswordResetTokenInput,
} from "@fumep/db";

import type { PasswordResetTokenWriter } from "./password-reset-token.service.js";
import type { PasswordResetExecutor } from "./password-reset.service.js";

export class LazyPasswordResetTokenRepository
  implements PasswordResetTokenWriter, PasswordResetExecutor, OnModuleDestroy
{
  private connection?: ReturnType<typeof createDatabase>;

  async create(input: CreatePasswordResetTokenInput): Promise<void> {
    await this.repository().create(input);
  }

  async reset(
    tokenHash: string,
    passwordHash: string,
    revokeSessions: (userId: string) => Promise<void>,
  ): Promise<boolean> {
    return this.repository().reset(tokenHash, passwordHash, revokeSessions);
  }

  private repository(): PasswordResetTokenRepository {
    if (!this.connection) {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL is required");
      this.connection = createDatabase(url);
    }
    return new PasswordResetTokenRepository(this.connection.db);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) await this.connection.client.end();
  }
}
