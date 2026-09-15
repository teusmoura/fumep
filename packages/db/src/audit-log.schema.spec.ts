import { resolve } from "node:path";

import { eq } from "drizzle-orm";
import { config as loadEnvironment } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { auditLogs, users } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for schema tests");

const { client, db } = createDatabase(databaseUrl);

describe("audit_logs schema", () => {
  beforeEach(async () => {
    await db.delete(auditLogs);
    await db.delete(users);
  });

  afterAll(async () => {
    await db.delete(auditLogs);
    await db.delete(users);
    await client.end();
  });

  it("stores a basic administrative event", async () => {
    const entityId = crypto.randomUUID();
    const metadata = { changedFields: ["title"], source: "admin" };

    const [log] = await db
      .insert(auditLogs)
      .values({
        action: "PAGE_UPDATED",
        entityType: "PAGE",
        entityId,
        metadata,
        ipAddress: "2001:db8::1",
      })
      .returning();

    expect(log).toMatchObject({
      userId: null,
      action: "PAGE_UPDATED",
      entityType: "PAGE",
      entityId,
      metadata,
      ipAddress: "2001:db8::1",
    });
    expect(log.createdAt).toBeInstanceOf(Date);
  });

  it("preserves the event and clears its user reference after physical user deletion", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Audited User",
        email: "audited-user@fumep.test",
        passwordHash: "$argon2id$test-hash",
        role: "ADMIN",
      })
      .returning();
    const [createdLog] = await db
      .insert(auditLogs)
      .values({ userId: user.id, action: "USER_CREATED", entityType: "USER", entityId: user.id })
      .returning();

    await db.delete(users).where(eq(users.id, user.id));
    const [preservedLog] = await db.select().from(auditLogs).where(eq(auditLogs.id, createdLog.id));

    expect(preservedLog).toMatchObject({ id: createdLog.id, userId: null, entityId: user.id });
  });
});
