import type { Database } from "./client.js";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { auditLogs, passwordResetTokens, users } from "./schema.js";

export type CreatePasswordResetTokenInput = Pick<
  typeof passwordResetTokens.$inferInsert,
  "userId" | "tokenHash" | "expiresAt"
>;

export class PasswordResetTokenRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreatePasswordResetTokenInput): Promise<void> {
    await this.db.insert(passwordResetTokens).values(input);
  }

  async reset(
    tokenHash: string,
    passwordHash: string,
    revokeSessions: (userId: string) => Promise<void>,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [token] = await tx
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.consumedAt),
            gt(passwordResetTokens.expiresAt, sql`clock_timestamp()`),
          ),
        )
        .for("update");
      if (!token) return false;
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, token.userId), eq(users.isActive, true)))
        .for("update");
      if (!user) return false;
      // Fail closed: a Redis failure rolls back the transaction and leaves the token reusable.
      await revokeSessions(user.id);
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: sql`clock_timestamp()` })
        .where(eq(users.id, user.id));
      await tx
        .update(passwordResetTokens)
        .set({ consumedAt: sql`clock_timestamp()` })
        .where(eq(passwordResetTokens.id, token.id));
      await tx.insert(auditLogs).values({
        userId: user.id,
        action: "PASSWORD_RESET",
        entityType: "USER",
        entityId: user.id,
      });
      return true;
    });
  }
}
