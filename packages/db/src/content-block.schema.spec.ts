import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { contentBlocks } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for schema tests");
}

const { client, db } = createDatabase(databaseUrl);

describe("content_blocks schema", () => {
  beforeEach(async () => {
    await db.delete(contentBlocks);
  });

  afterAll(async () => {
    await db.delete(contentBlocks);
    await client.end();
  });

  it("stores structured and ordered block data with defaults", async () => {
    const ownerId = crypto.randomUUID();
    const data = { title: "Welcome", actions: [{ label: "Learn more", href: "/about" }] };

    const [block] = await db
      .insert(contentBlocks)
      .values({ ownerType: "PAGE", ownerId, type: "HERO", position: 0, data })
      .returning();

    expect(block).toMatchObject({
      ownerType: "PAGE",
      ownerId,
      type: "HERO",
      position: 0,
      isVisible: true,
      schemaVersion: 1,
      background: "DEFAULT",
      backgroundMediaId: null,
      anchor: null,
      data,
    });
  });

  it("keeps positions and visibility for multiple blocks of one owner", async () => {
    const ownerId = crypto.randomUUID();

    const blocks = await db
      .insert(contentBlocks)
      .values([
        { ownerType: "ARTICLE", ownerId, type: "TEXT", position: 0, data: { html: "First" } },
        {
          ownerType: "ARTICLE",
          ownerId,
          type: "CTA",
          position: 1,
          isVisible: false,
          schemaVersion: 2,
          background: "LIGHT",
          anchor: "learn-more",
          data: { label: "Learn more" },
        },
      ])
      .returning();

    expect(blocks.map(({ position, isVisible }) => ({ position, isVisible }))).toEqual([
      { position: 0, isVisible: true },
      { position: 1, isVisible: false },
    ]);
  });

  it("rejects duplicate anchors for the same owner", async () => {
    const ownerId = crypto.randomUUID();
    const block = {
      ownerType: "PAGE" as const,
      ownerId,
      type: "TEXT",
      position: 0,
      anchor: "contact",
      data: {},
    };

    await db.insert(contentBlocks).values(block);
    await expect(db.insert(contentBlocks).values({ ...block, position: 1 })).rejects.toThrow();
  });
});
