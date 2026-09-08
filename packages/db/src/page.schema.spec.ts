import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { institutions, pages, users } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for schema tests");
}

const { client, db } = createDatabase(databaseUrl);

async function createInstitution(slug: string) {
  const [institution] = await db
    .insert(institutions)
    .values({ name: slug.toUpperCase(), slug })
    .returning();
  return institution;
}

describe("pages schema", () => {
  beforeEach(async () => {
    await db.delete(pages);
    await db.delete(users);
    await db.delete(institutions);
  });

  afterAll(async () => {
    await db.delete(pages);
    await db.delete(users);
    await db.delete(institutions);
    await client.end();
  });

  it("stores the minimum page structure with draft status by default", async () => {
    const institution = await createInstitution("fumep-page-test");
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
        institutionId: institution.id,
        createdBy: author.id,
        updatedBy: author.id,
      })
      .returning();

    expect(page).toMatchObject({
      title: "Institutional Page",
      slug: "institutional-page",
      institutionId: institution.id,
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
      const institution = await createInstitution(`${status.toLowerCase()}-institution`);
      const [page] = await db
        .insert(pages)
        .values({
          institutionId: institution.id,
          title: `${status} Page`,
          slug: `${status.toLowerCase()}-page`,
          status,
        })
        .returning();

      expect(page.status).toBe(status);
      expect(page.createdBy).toBeNull();
      expect(page.updatedBy).toBeNull();
    },
  );

  it("allows the same slug in different institutions and rejects it in the same one", async () => {
    const firstInstitution = await createInstitution("first-institution");
    const secondInstitution = await createInstitution("second-institution");

    await db.insert(pages).values([
      { institutionId: firstInstitution.id, title: "Contact", slug: "contact" },
      { institutionId: secondInstitution.id, title: "Contact", slug: "contact" },
    ]);

    await expect(
      db.insert(pages).values({
        institutionId: firstInstitution.id,
        title: "Duplicate Contact",
        slug: "contact",
      }),
    ).rejects.toThrow();
  });
});
