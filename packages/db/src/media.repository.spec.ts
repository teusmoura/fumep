import { resolve } from "node:path";
import { config } from "dotenv";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabase } from "./client.js";
import { MediaRepository } from "./media.repository.js";
import type { NewMedia } from "./schema.js";

config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const { client, db } = createDatabase(process.env.DATABASE_URL);
const repository = new MediaRepository(db);
const ids: string[] = [];
const categoryIds: string[] = [];
const institutionIds: string[] = [];
const input: NewMedia = {
  type: "IMAGE",
  originalFilename: "fixture.png",
  storedFilename: "fixture-id.png",
  mimeType: "image/png",
  sizeBytes: 1024n,
  storageKey: "images/originals/fixture-id.png",
  checksumSha256: "a".repeat(64),
};
async function create(values: NewMedia = input) {
  const result = await repository.create(values);
  ids.push(result.id);
  return result;
}
afterAll(async () => {
  for (const id of ids) await client`DELETE FROM media WHERE id = ${id}`;
  for (const id of categoryIds) await client`DELETE FROM media_categories WHERE id = ${id}`;
  for (const id of institutionIds) await client`DELETE FROM institutions WHERE id = ${id}`;
  await client.end();
});
describe("MediaRepository", () => {
  it("searches each canonical field with scoped pagination and literal wildcard escaping", async () => {
    const institution = crypto.randomUUID();
    institutionIds.push(institution);
    await client`INSERT INTO institutions (id,name,slug) VALUES (${institution},'Search fixture',${`search-${institution}`})`;
    const category = crypto.randomUUID();
    categoryIds.push(category);
    await client`INSERT INTO media_categories (id,institution_id,name,slug) VALUES (${category},${institution},'search-category','search')`;
    for (const fields of [
      { originalFilename: "search-name.png" },
      { originalFilename: "plain-a.png", altText: "search-alt" },
      { originalFilename: "plain-b.png", caption: "search-caption" },
    ])
      await create({ ...input, ...fields, categoryId: category });
    for (const q of ["search-name", "SEARCH-ALT", "search-caption"])
      expect((await repository.search({ q, page: 1, limit: 20 }, [institution])).total).toBe(1);
    const first = await repository.search({ q: "search-category", page: 1, limit: 2 }, [
      institution,
    ]);
    const second = await repository.search({ q: "search-category", page: 2, limit: 2 }, [
      institution,
    ]);
    expect(first.total).toBe(3);
    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(1);
    expect(first.items.map((row) => row.media.id)).not.toContain(second.items[0].media.id);
    for (const q of ["%", "_", "' OR 1=1 --"])
      expect((await repository.search({ q, page: 1, limit: 20 }, [institution])).total).toBe(0);
    expect((await repository.search({ page: 1, limit: 20 }, [])).items).toEqual([]);
    expect(
      (await repository.search({ categoryId: category, page: 1, limit: 20 }, [crypto.randomUUID()]))
        .total,
    ).toBe(0);
    await expect(repository.search({ page: 0, limit: 101 })).rejects.toThrow(
      "Invalid media pagination",
    );
  });
  it("updates image dimensions idempotently without changing processing state or checksum", async () => {
    const created = await create();
    const dimensions = await repository.updateDimensions(created.id, 12, 8);
    expect(dimensions).toMatchObject({
      width: 12,
      height: 8,
      checksumSha256: created.checksumSha256,
      processingStatus: "PENDING",
    });
    expect(await repository.updateDimensions(created.id, 12, 8)).toEqual(dimensions);
    await expect(repository.updateDimensions(created.id, 0, 8)).rejects.toThrow();
    expect(await repository.updateDimensions(crypto.randomUUID(), 12, 8)).toBeUndefined();
  });
  it("finds checksum duplicates deterministically only inside permitted institutions", async () => {
    const own = crypto.randomUUID();
    const foreign = crypto.randomUUID();
    for (const id of [own, foreign]) {
      await client`INSERT INTO institutions (id,name,slug) VALUES (${id},'Duplicate fixture',${`duplicate-${id}`})`;
      institutionIds.push(id);
    }
    const created = [];
    for (const [index, institutionId] of [null, own, foreign].entries()) {
      const category = crypto.randomUUID();
      categoryIds.push(category);
      await client`INSERT INTO media_categories (id,institution_id,name,slug) VALUES (${category},${institutionId},'Duplicate fixture','fixture')`;
      created.push(
        await create({
          ...input,
          checksumSha256: "b".repeat(64),
          categoryId: category,
          createdAt: new Date(`202${index}-01-01T00:00:00Z`),
        }),
      );
    }
    expect(await repository.findDuplicate("b".repeat(64))).toEqual(created[0]);
    expect(await repository.findDuplicate("b".repeat(64), [own])).toEqual(created[1]);
    expect(await repository.findDuplicate("b".repeat(64), [foreign])).toEqual(created[2]);
    expect(await repository.findDuplicate("b".repeat(64), [])).toBeUndefined();
    expect(await repository.findDuplicate("f".repeat(64), [own])).toBeUndefined();
  });
  it("creates and reads canonical metadata with PENDING, nullable fields and timestamps", async () => {
    const created = await create();
    expect(created).toMatchObject({
      ...input,
      processingStatus: "PENDING",
      processingError: null,
      uploadedBy: null,
      width: null,
      height: null,
      isDecorative: false,
    });
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(await repository.findById(created.id)).toEqual(created);
    expect(await repository.findById(crypto.randomUUID())).toBeUndefined();
  });
  it("allows duplicate checksums and all logical types/statuses without losing BIGINT precision", async () => {
    const one = await create();
    for (const [type, processingStatus] of [
      ["IMAGE", "PROCESSING"],
      ["DOCUMENT", "READY"],
      ["VIDEO", "FAILED"],
      ["OTHER", "PENDING"],
    ] as const) {
      const created = await create({
        ...input,
        type,
        processingStatus,
        sizeBytes: 9007199254740993n,
      });
      expect(created.id).not.toBe(one.id);
      expect(created.sizeBytes).toBe(9007199254740993n);
    }
  });
  it("rejects invalid size, checksum, dimensions, enums and nonexistent uploader", async () => {
    for (const invalid of [
      { ...input, sizeBytes: -1n },
      { ...input, checksumSha256: "invalid" },
      { ...input, checksumSha256: "A".repeat(64) },
      { ...input, width: 0 },
      { ...input, height: -1 },
      { ...input, uploadedBy: crypto.randomUUID() },
    ])
      await expect(repository.create(invalid)).rejects.toThrow();
    await expect(client`INSERT INTO media (type) VALUES ('INVALID')`).rejects.toThrow();
    await expect(
      client`UPDATE media SET processing_status = 'INVALID' WHERE id = ${ids[0]}`,
    ).rejects.toThrow();
  });
  it("preserves media while setting uploader NULL after exceptional user removal", async () => {
    const [user] =
      await client`INSERT INTO users (name, email, password_hash, role) VALUES ('Media fixture', ${`${crypto.randomUUID()}@fumep.test`}, 'fixture-only', 'EDITOR') RETURNING id`;
    try {
      const created = await create({ ...input, uploadedBy: user.id });
      await client`DELETE FROM users WHERE id = ${user.id}`;
      expect((await repository.findById(created.id))?.uploadedBy).toBeNull();
    } finally {
      await client`DELETE FROM users WHERE id = ${user.id}`;
    }
  });
});
