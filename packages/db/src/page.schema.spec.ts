import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { pages, users } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for schema tests");
}

const { client, db } = createDatabase(databaseUrl);

describe("pages schema", () => {
  beforeEach(async () => {
    await db.delete(pages);
    await db.delete(users);
  });

  afterAll(async () => {
    await db.delete(pages);
    await db.delete(users);
    await client.end();
  });

  it("stores the minimum page structure with draft status by default", async () => {
    const [author] = await db
      .insert(users)
      .values({
        name: "Page Editor",
        email: "page-editor@fumep.test",
        passwordHash: "$argon2id$test-hash",
        role: "EDITOR",
      })
      .returning();

    const [page] = await db
      .insert(pages)
      .values({
        title: "Institutional Page",
        slug: "institutional-page",
        createdBy: author.id,
        updatedBy: author.id,
      })
      .returning();

    expect(page).toMatchObject({
      title: "Institutional Page",
      slug: "institutional-page",
      status: "DRAFT",
      createdBy: author.id,
      updatedBy: author.id,
    });
    expect(page.id).toBeTypeOf("string");
    expect(page.createdAt).toBeInstanceOf(Date);
    expect(page.updatedAt).toBeInstanceOf(Date);
  });

  it.each(["SCHEDULED", "PUBLISHED", "EXPIRED"] as const)(
    "accepts the %s publication status",
    async (status) => {
      const [page] = await db
        .insert(pages)
        .values({ title: `${status} Page`, slug: `${status.toLowerCase()}-page`, status })
        .returning();

      expect(page.status).toBe(status);
      expect(page.createdBy).toBeNull();
      expect(page.updatedBy).toBeNull();
    },
  );
});
