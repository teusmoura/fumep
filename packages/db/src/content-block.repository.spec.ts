import { resolve } from "node:path";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase } from "./client.js";
import { ContentBlockRepository } from "./content-block.repository.js";
import { MediaUsageRepository } from "./media-usage.repository.js";
import { contentBlocks, pageVersions } from "./schema.js";
config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { db, client } = createDatabase(process.env.DATABASE_URL);
const repo = new ContentBlockRepository(db);
const usages = new MediaUsageRepository(db);
const institution = crypto.randomUUID(),
  page = crypto.randomUUID(),
  image = crypto.randomUUID(),
  version = crypto.randomUUID();
const blocks = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
const snapshot = {
  page: { title: "Delete fixture" },
  blocks: [
    { id: blocks[0], type: "IMAGE", schemaVersion: 1, data: { imageId: image, decorative: true } },
  ],
};
beforeAll(async () => {
  await client`INSERT INTO institutions(id,name,slug) VALUES (${institution},'Delete fixture',${`delete-${institution}`})`;
  await client`INSERT INTO pages(id,institution_id,title,slug) VALUES (${page},${institution},'Delete fixture',${`delete-${page}`})`;
  await client`INSERT INTO media(id,type,original_filename,stored_filename,mime_type,size_bytes,storage_key,checksum_sha256,processing_status) VALUES (${image},'IMAGE','fixture.png',${`${image}.png`},'image/png',1,${`images/originals/${image}.png`},${"a".repeat(64)},'READY')`;
  for (const [position, id] of blocks.entries()) {
    await db.insert(contentBlocks).values({
      id,
      ownerType: "PAGE",
      ownerId: page,
      type: "IMAGE",
      position,
      data: { imageId: image, decorative: true },
    });
    await usages.synchronize("CONTENT_BLOCK", id, [{ mediaId: image, fieldName: "data.imageId" }]);
  }
  await db.insert(pageVersions).values({ id: version, pageId: page, versionNumber: 1, snapshot });
  // Historical tracking is a fixture for the future version consumer, not version creation code.
  await usages.synchronize("PAGE_VERSION", version, [
    { mediaId: image, fieldName: "blocks.imageId" },
  ]);
});
afterAll(async () => {
  for (const id of blocks) {
    await usages.removeEntity("CONTENT_BLOCK", id);
    await client`DELETE FROM content_blocks WHERE id=${id}`;
  }
  await usages.removeEntity("PAGE_VERSION", version);
  await client`DELETE FROM page_versions WHERE id=${version}`;
  await client`DELETE FROM media WHERE id=${image}`;
  await client`DELETE FROM pages WHERE id=${page}`;
  await client`DELETE FROM institutions WHERE id=${institution}`;
  await client.end();
});
describe("ContentBlock deletion consumer", () => {
  it("does not delete usages for missing/foreign owners and validates references", async () => {
    expect(await repo.deleteForOwner("PAGE", crypto.randomUUID(), blocks[0]!)).toBe(false);
    expect(await repo.deleteForOwner("ARTICLE", page, blocks[0]!)).toBe(false);
    expect(await repo.deleteForOwner("PAGE", page, crypto.randomUUID())).toBe(false);
    expect(await usages.findForMedia(image)).toHaveLength(4);
    expect(() => repo.deleteForOwner("PAGE", "bad", blocks[0]!)).toThrow("Invalid");
  });
  it("rolls block and usage removal back with the outer owner transaction", async () => {
    const before = await usages.findForMedia(image);
    await expect(
      db.transaction(async (tx) => {
        expect(await new ContentBlockRepository(tx).deleteForOwner("PAGE", page, blocks[0]!)).toBe(
          true,
        );
        throw new Error("owner mutation failed");
      }),
    ).rejects.toThrow("owner mutation failed");
    expect(await client`SELECT id FROM content_blocks WHERE id=${blocks[0]}`).toHaveLength(1);
    expect(await usages.findForMedia(image)).toEqual(before);
  });
  it("removes only live block usages, preserving shared media/other blocks/historical snapshot", async () => {
    expect(await repo.deleteForOwner("PAGE", page.toUpperCase(), blocks[0]!.toUpperCase())).toBe(
      true,
    );
    expect(await client`SELECT id FROM content_blocks WHERE id=${blocks[0]}`).toHaveLength(0);
    const remaining = await usages.findForMedia(image);
    expect(remaining).toHaveLength(3);
    expect(remaining.some((row) => row.entityId === blocks[0])).toBe(false);
    expect(
      remaining.some((row) => row.entityType === "PAGE_VERSION" && row.entityId === version),
    ).toBe(true);
    expect(await client`SELECT snapshot FROM page_versions WHERE id=${version}`).toEqual([
      { snapshot },
    ]);
    expect(await client`SELECT id FROM media WHERE id=${image}`).toHaveLength(1);
    await expect(client`DELETE FROM media WHERE id=${image}`).rejects.toThrow();
    expect(await repo.deleteForOwner("PAGE", page, blocks[0]!)).toBe(false);
  });
  it("serializes concurrent deletion and leaves historical usages protected", async () => {
    const result = await Promise.all([
      repo.deleteForOwner("PAGE", page, blocks[1]!),
      repo.deleteForOwner("PAGE", page, blocks[1]!),
    ]);
    expect(result.sort()).toEqual([false, true]);
    expect(await repo.deleteForOwner("PAGE", page, blocks[2]!)).toBe(true);
    expect(await usages.findForMedia(image)).toHaveLength(1);
    expect(await usages.hasUsage(image)).toBe(true);
  });
});
