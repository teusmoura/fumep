import type { Database } from "./client.js";
import { passwordResetTokens } from "./schema.js";

export type CreatePasswordResetTokenInput = Pick<
  typeof passwordResetTokens.$inferInsert,
  "userId" | "tokenHash" | "expiresAt"
>;

export class PasswordResetTokenRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreatePasswordResetTokenInput): Promise<void> {
    await this.db.insert(passwordResetTokens).values(input);
  }
}
