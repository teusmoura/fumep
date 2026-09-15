import { resolve } from "node:path";

import { eq } from "drizzle-orm";
import { config as loadEnvironment } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { institutions, pages, pageVersions, users } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required for schema tests");

const { client, db } = createDatabase(databaseUrl);

async function createPage() {
  const [institution] = await db
    .insert(institutions)
    .values({ name: "FUMEP Versions", slug: "fumep-versions" })
    .returning();
  const [page] = await db
    .insert(pages)
    .values({ institutionId: institution.id, title: "Original", slug: "original" })
    .returning();
  return page;
}

describe("page_versions schema", () => {
  beforeEach(async () => {
    await db.delete(pageVersions);
    await db.delete(pages);
    await db.delete(users);
    await db.delete(institutions);
  });

  afterAll(async () => {
    await db.delete(pageVersions);
    await db.delete(pages);
    await db.delete(users);
    await db.delete(institutions);
    await client.end();
  });

  it("preserves numbered snapshots when the live page changes", async () => {
    const page = await createPage();
    const snapshot = {
      page: { title: page.title, slug: page.slug },
      blocks: [{ type: "TEXT", position: 0, isVisible: true, data: { html: "Saved" } }],
    };

    const [version] = await db
      .insert(pageVersions)
      .values({ pageId: page.id, versionNumber: 1, snapshot })
      .returning();
    await db.update(pages).set({ title: "Changed" }).where(eq(pages.id, page.id));
    const [storedVersion] = await db
      .select()
      .from(pageVersions)
      .where(eq(pageVersions.id, version.id));

    expect(storedVersion).toMatchObject({ pageId: page.id, versionNumber: 1, snapshot });
    expect(storedVersion.createdAt).toBeInstanceOf(Date);
  });

  it("rejects duplicate version numbers for the same page", async () => {
    const page = await createPage();
    const version = { pageId: page.id, versionNumber: 1, snapshot: { page: {} } };

    await db.insert(pageVersions).values(version);
    await expect(db.insert(pageVersions).values(version)).rejects.toThrow();
  });
});
