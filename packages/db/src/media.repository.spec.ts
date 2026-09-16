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
  await client.end();
});
describe("MediaRepository", () => {
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
