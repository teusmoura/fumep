import { resolve } from "node:path";
import { config } from "dotenv";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabase } from "./client.js";
import { MediaRepository } from "./media.repository.js";
import { MediaVariantRepository } from "./media-variant.repository.js";

config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { client, db } = createDatabase(process.env.DATABASE_URL);
const media = new MediaRepository(db);
const variants = new MediaVariantRepository(db);
const ids: string[] = [];
async function fixture() {
  const result = await media.create({
    type: "IMAGE",
    originalFilename: "fixture.png",
    storedFilename: "fixture.png",
    storageKey: "images/originals/fixture.png",
    mimeType: "image/png",
    sizeBytes: 1n,
    checksumSha256: "a".repeat(64),
  });
  ids.push(result.id);
  return {
    mediaId: result.id,
    format: "WEBP",
    width: 320,
    height: 200,
    sizeBytes: 100n,
    storageKey: `images/variants/${result.id}-320.webp`,
  };
}
afterAll(async () => {
  for (const id of ids) await client`DELETE FROM media WHERE id = ${id}`;
  await client.end();
});
describe("MediaVariantRepository", () => {
  it("persists canonical fields and updates idempotently keeping identity and creation date", async () => {
    const input = await fixture();
    const first = await variants.upsert(input);
    expect(first).toMatchObject(input);
    expect(first.createdAt).toBeInstanceOf(Date);
    expect(await variants.upsert(input)).toEqual(first);
    expect(await variants.upsert({ ...input, sizeBytes: 200n })).toMatchObject({
      id: first.id,
      createdAt: first.createdAt,
      sizeBytes: 200n,
    });
    expect(await variants.findForMedia(input.mediaId)).toHaveLength(1);
  });
  it("deduplicates concurrent upserts but keeps different format/width rows", async () => {
    const input = await fixture();
    const results = await Promise.all([variants.upsert(input), variants.upsert(input)]);
    expect(results[0].id).toBe(results[1].id);
    await variants.upsert({
      ...input,
      format: "AVIF",
      storageKey: input.storageKey.replace("webp", "avif"),
    });
    await variants.upsert({ ...input, width: 640 });
    expect(await variants.findForMedia(input.mediaId)).toHaveLength(3);
  });
  it("enforces size, dimensions, format, relative keys and foreign key", async () => {
    const input = await fixture();
    for (const invalid of [
      { width: 0 },
      { height: -1 },
      { sizeBytes: 0n },
      { format: "INVALID" },
      { mediaId: crypto.randomUUID() },
      { storageKey: "../fixture.webp" },
      { storageKey: "/fixture.webp" },
      { storageKey: "https://internal/fixture.webp" },
    ]) {
      await expect(variants.upsert({ ...input, ...invalid })).rejects.toThrow();
    }
    // Two-character segments are legitimate and must not match a literal '..'.
    await expect(
      variants.upsert({ ...input, storageKey: "ab/fixture.webp" }),
    ).resolves.toBeDefined();
  });
  it("cascades variant metadata only on parent Media deletion", async () => {
    const input = await fixture();
    await variants.upsert(input);
    await client`DELETE FROM media WHERE id = ${input.mediaId}`;
    expect(await variants.findForMedia(input.mediaId)).toEqual([]);
  });
});
