import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";

import { eq } from "drizzle-orm";
import { config as loadEnvironment } from "dotenv";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { PasswordResetTokenRepository } from "./password-reset-token.repository.js";
import { passwordResetTokens, users } from "./schema.js";

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
    for (const id of userIds) await db.delete(users).where(eq(users.id, id));
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
});
