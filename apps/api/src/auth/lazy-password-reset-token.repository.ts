import type { OnModuleDestroy } from "@nestjs/common";

import {
  createDatabase,
  PasswordResetTokenRepository,
  type CreatePasswordResetTokenInput,
} from "@fumep/db";

import type { PasswordResetTokenWriter } from "./password-reset-token.service.js";

export class LazyPasswordResetTokenRepository implements PasswordResetTokenWriter, OnModuleDestroy {
  private connection?: ReturnType<typeof createDatabase>;

  async create(input: CreatePasswordResetTokenInput): Promise<void> {
    if (!this.connection) {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL is required");
      this.connection = createDatabase(url);
    }
    await new PasswordResetTokenRepository(this.connection.db).create(input);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) await this.connection.client.end();
  }
}
