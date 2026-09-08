import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { users } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for schema tests");
}

const { client, db } = createDatabase(databaseUrl);

describe("users schema", () => {
  beforeEach(async () => {
    await db.delete(users);
  });

  afterAll(async () => {
    await db.delete(users);
    await client.end();
  });

  it.each(["ADMIN", "EDITOR"] as const)("stores the %s role with active default", async (role) => {
    const [user] = await db
      .insert(users)
      .values({
        name: `${role} User`,
        email: `${role.toLowerCase()}@fumep.test`,
        passwordHash: "$argon2id$test-hash",
        role,
      })
      .returning();

    expect(user).toMatchObject({ role, isActive: true });
  });

  it("enforces case-insensitive email uniqueness", async () => {
    await db.insert(users).values({
      name: "First User",
      email: "editor@fumep.test",
      passwordHash: "$argon2id$first-test-hash",
      role: "EDITOR",
    });

    await expect(
      db.insert(users).values({
        name: "Second User",
        email: "EDITOR@FUMEP.TEST",
        passwordHash: "$argon2id$second-test-hash",
        role: "EDITOR",
      }),
    ).rejects.toThrow();
  });
});
