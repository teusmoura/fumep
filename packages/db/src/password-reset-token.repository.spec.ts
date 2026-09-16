import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";

import { eq } from "drizzle-orm";
import { config as loadEnvironment } from "dotenv";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { PasswordResetTokenRepository } from "./password-reset-token.repository.js";
import { auditLogs, passwordResetTokens, users } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required for token repository tests");
const { client, db } = createDatabase(process.env.DATABASE_URL);

describe("password_reset_tokens", () => {
  const repository = new PasswordResetTokenRepository(db);
  const userIds: string[] = [];
  const createUser = async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Recovery User",
        email: `${crypto.randomUUID()}@fumep.test`,
        passwordHash: "test-hash",
        role: "ADMIN",
      })
      .returning();
    userIds.push(user.id);
    return user.id;
  };
  afterEach(async () => {
    for (const id of userIds) {
      await db.delete(auditLogs).where(eq(auditLogs.userId, id));
      await db.delete(users).where(eq(users.id, id));
    }
    userIds.length = 0;
  });
  afterAll(async () => client.end());

  it("persists only the hash with expiry, consumption state and timezone-aware timestamps", async () => {
    const userId = await createUser();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await repository.create({ userId, tokenHash, expiresAt });
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
    expect(row).toMatchObject({ userId, tokenHash, expiresAt, consumedAt: null });
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(JSON.stringify(row)).not.toContain(token);
  });

  it("enforces hash uniqueness and removes tokens when the user is deleted", async () => {
    const userId = await createUser();
    const input = {
      userId,
      tokenHash: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
    await repository.create(input);
    await expect(repository.create(input)).rejects.toThrow();
    await db.delete(users).where(eq(users.id, userId));
    expect(
      await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, userId)),
    ).toEqual([]);
  });

  it("rejects a token without an existing user", async () => {
    await expect(
      repository.create({
        userId: crypto.randomUUID(),
        tokenHash: crypto.randomUUID(),
        expiresAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  it("allows exactly one concurrent reset and audits without secrets", async () => {
    const userId = await createUser();
    const tokenHash = crypto.randomUUID();
    await repository.create({ userId, tokenHash, expiresAt: new Date(Date.now() + 60000) });
    let revocations = 0;
    const results = await Promise.all(
      [1, 2].map(() =>
        repository.reset(tokenHash, "replacement-hash", async (id) => {
          expect(id).toBe(userId);
          revocations++;
        }),
      ),
    );
    expect(results.sort()).toEqual([false, true]);
    expect(revocations).toBe(1);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(user.passwordHash).toBe("replacement-hash");
    const [token] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
    expect(token.consumedAt).toBeInstanceOf(Date);
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.userId, userId));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "PASSWORD_RESET",
      entityType: "USER",
      entityId: userId,
      metadata: null,
    });
    expect(JSON.stringify(logs)).not.toContain(tokenHash);
    expect(JSON.stringify(logs)).not.toContain("replacement-hash");
  });

  it("rejects unknown, expired, consumed and disabled-user tokens without revocation", async () => {
    const userId = await createUser();
    let calls = 0;
    const revoke = async () => {
      calls++;
    };
    expect(await repository.reset("unknown", "new", revoke)).toBe(false);
    for (const state of ["expired", "consumed", "disabled"]) {
      const tokenHash = crypto.randomUUID();
      await repository.create({
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + (state === "expired" ? -1000 : 60000)),
      });
      if (state === "consumed")
        await db
          .update(passwordResetTokens)
          .set({ consumedAt: new Date() })
          .where(eq(passwordResetTokens.tokenHash, tokenHash));
      if (state === "disabled")
        await db.update(users).set({ isActive: false }).where(eq(users.id, userId));
      expect(await repository.reset(tokenHash, "new", revoke)).toBe(false);
    }
    expect(calls).toBe(0);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(user.passwordHash).toBe("test-hash");
  });

  it("rolls back password, consumption and audit when revocation fails, allowing retry", async () => {
    const userId = await createUser();
    const tokenHash = crypto.randomUUID();
    await repository.create({ userId, tokenHash, expiresAt: new Date(Date.now() + 60000) });
    await expect(
      repository.reset(tokenHash, "new", async () => {
        throw new Error("Redis unavailable");
      }),
    ).rejects.toThrow("Redis unavailable");
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [token] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
    expect(user.passwordHash).toBe("test-hash");
    expect(token.consumedAt).toBeNull();
    expect(await db.select().from(auditLogs).where(eq(auditLogs.userId, userId))).toEqual([]);
    expect(await repository.reset(tokenHash, "new", async () => {})).toBe(true);
  });
});
