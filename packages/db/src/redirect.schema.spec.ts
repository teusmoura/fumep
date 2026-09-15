import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { redirects } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for schema tests");

const { client, db } = createDatabase(databaseUrl);

describe("redirects schema", () => {
  beforeEach(async () => {
    await db.delete(redirects);
  });

  afterAll(async () => {
    await db.delete(redirects);
    await client.end();
  });

  it("stores a unique source with permanent redirect by default", async () => {
    const [redirect] = await db
      .insert(redirects)
      .values({ sourcePath: "/old-page", targetPath: "/new-page" })
      .returning();

    expect(redirect).toMatchObject({
      sourcePath: "/old-page",
      targetPath: "/new-page",
      statusCode: 301,
    });
    expect(redirect.createdAt).toBeInstanceOf(Date);

    await expect(
      db.insert(redirects).values({ sourcePath: "/old-page", targetPath: "/another-page" }),
    ).rejects.toThrow();
  });

  it.each([301, 302, 307, 308] as const)("accepts HTTP status %s", async (statusCode) => {
    const [redirect] = await db
      .insert(redirects)
      .values({ sourcePath: `/source-${statusCode}`, targetPath: "/target", statusCode })
      .returning();

    expect(redirect.statusCode).toBe(statusCode);
  });

  it("rejects an unsupported HTTP status", async () => {
    await expect(
      db
        .insert(redirects)
        .values({ sourcePath: "/invalid", targetPath: "/target", statusCode: 200 }),
    ).rejects.toThrow();
  });
});
