import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { institutions, userInstitutions, users } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for schema tests");
}

const { client, db } = createDatabase(databaseUrl);

describe("user_institutions schema", () => {
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

  it("associates one user with multiple institutions", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Institutional Editor",
        email: "institutional-editor@fumep.test",
        passwordHash: "$argon2id$test-hash",
        role: "EDITOR",
      })
      .returning();
    const createdInstitutions = await db
      .insert(institutions)
      .values([
        { name: "FUMEP", slug: "fumep" },
        { name: "ETMSL", slug: "etmsl" },
      ])
      .returning();

    await db.insert(userInstitutions).values(
      createdInstitutions.map((institution) => ({
        userId: user.id,
        institutionId: institution.id,
      })),
    );

    const associations = await db.select().from(userInstitutions);

    expect(associations).toHaveLength(2);
    expect(associations.map(({ institutionId }) => institutionId).sort()).toEqual(
      createdInstitutions.map(({ id }) => id).sort(),
    );
  });

  it("rejects a duplicate user and institution association", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Editor",
        email: "editor-association@fumep.test",
        passwordHash: "$argon2id$test-hash",
        role: "EDITOR",
      })
      .returning();
    const [institution] = await db
      .insert(institutions)
      .values({ name: "CRAMAM", slug: "cramam" })
      .returning();
    const association = { userId: user.id, institutionId: institution.id };

    await db.insert(userInstitutions).values(association);

    await expect(db.insert(userInstitutions).values(association)).rejects.toThrow();
  });
});
