import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { AuthUserRepository } from "./auth-user.repository.js";
import { createDatabase } from "./client.js";
import { institutions, userInstitutions, users } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for repository tests");

const { client, db } = createDatabase(databaseUrl);
const repository = new AuthUserRepository(db);

describe("AuthUserRepository", () => {
  beforeEach(async () => {
    await db.delete(userInstitutions);
    await db.delete(users);
    await db.delete(institutions);
  });

  afterAll(async () => {
    await db.delete(userInstitutions);
    await db.delete(users);
    await db.delete(institutions);
    await client.end();
  });

  it("finds an active user by normalized email with institution scope", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Scoped Editor",
        email: "Editor@Fumep.Test",
        passwordHash: "$argon2id$hash",
        role: "EDITOR",
      })
      .returning();
    const [institution] = await db
      .insert(institutions)
      .values({ name: "FUMEP Auth", slug: "fumep-auth" })
      .returning();
    await db.insert(userInstitutions).values({ userId: user.id, institutionId: institution.id });

    await expect(repository.findActiveByEmail("  EDITOR@FUMEP.TEST  ")).resolves.toEqual({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: "EDITOR",
      institutionIds: [institution.id],
    });
  });

  it("does not return an inactive user", async () => {
    await db.insert(users).values({
      name: "Inactive User",
      email: "inactive@fumep.test",
      passwordHash: "$argon2id$hash",
      role: "ADMIN",
      isActive: false,
    });

    await expect(repository.findActiveByEmail("inactive@fumep.test")).resolves.toBeUndefined();
  });
});
