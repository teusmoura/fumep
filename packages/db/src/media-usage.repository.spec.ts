import { resolve } from "node:path";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase } from "./client.js";
import { MediaUsageRepository } from "./media-usage.repository.js";
config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { db, client } = createDatabase(process.env.DATABASE_URL);
const repository = new MediaUsageRepository(db);
const ids = [crypto.randomUUID(), crypto.randomUUID()];
const owners = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
beforeAll(async () => {
  for (const id of ids)
    await client`INSERT INTO media (id,type,original_filename,stored_filename,mime_type,size_bytes,storage_key,checksum_sha256) VALUES (${id},'IMAGE','usage.png',${`${id}.png`},'image/png',1,${`images/originals/${id}.png`},${"a".repeat(64)})`;
});
afterAll(async () => {
  for (const owner of owners)
    await client`DELETE FROM media_usages WHERE entity_type = 'PAGE' AND entity_id = ${owner}`;
  for (const id of ids) await client`DELETE FROM media WHERE id = ${id}`;
  await client.end();
});
describe("MediaUsageRepository internal tracking", () => {
  it("enforces database FK, nonempty fields and duplicate reference constraints", async () => {
    await expect(
      client`INSERT INTO media_usages (media_id,entity_type,entity_id,field_name) VALUES (${crypto.randomUUID()},'PAGE',${owners[2]},'cover_image')`,
    ).rejects.toThrow();
    await expect(
      client`INSERT INTO media_usages (media_id,entity_type,entity_id,field_name) VALUES (${ids[0]},' ',${owners[2]},'cover_image')`,
    ).rejects.toThrow();
    await expect(
      client`INSERT INTO media_usages (media_id,entity_type,entity_id,field_name) VALUES (${ids[0]},'PAGE',${owners[2]},' ')`,
    ).rejects.toThrow();
    await repository.synchronize("PAGE", owners[2], [
      { mediaId: ids[0], fieldName: "cover_image" },
    ]);
    await expect(
      client`INSERT INTO media_usages (media_id,entity_type,entity_id,field_name) VALUES (${ids[0]},'PAGE',${owners[2]},'cover_image')`,
    ).rejects.toThrow();
    await repository.removeEntity("PAGE", owners[2]);
    await expect(repository.synchronize("page", owners[2], [])).rejects.toThrow(
      "Invalid media usage owner",
    );
    expect(() => repository.findForMedia("bad")).toThrow("Invalid media reference");
  });
  it("deduplicates stable references, replaces fields and preserves another owner", async () => {
    const references = [
      { mediaId: ids[0], fieldName: "hero.image" },
      { mediaId: ids[0], fieldName: "hero.image" },
      { mediaId: ids[1], fieldName: "cover_image" },
    ];
    const initial = await repository.synchronize("PAGE", owners[0], references);
    expect(initial).toHaveLength(2);
    expect(initial[0].createdAt).toBeInstanceOf(Date);
    expect(await repository.synchronize("PAGE", owners[0], references)).toEqual(initial);
    await repository.synchronize("PAGE", owners[1], [
      { mediaId: ids[0], fieldName: "cover_image" },
    ]);
    expect(await repository.hasUsage(ids[0])).toBe(true);
    await expect(client`DELETE FROM media WHERE id = ${ids[0]}`).rejects.toThrow();
    const changed = await repository.synchronize("PAGE", owners[0], [
      { mediaId: ids[0], fieldName: "hero.image" },
    ]);
    expect(changed[0].id).toBe(initial.find((row) => row.fieldName === "hero.image")!.id);
    expect(await repository.hasUsage(ids[1])).toBe(false);
    await repository.removeEntity("PAGE", owners[0]);
    expect(await repository.findForMedia(ids[0])).toHaveLength(1);
    await repository.removeEntity("PAGE", owners[1]);
    expect(await repository.hasUsage(ids[0])).toBe(false);
  });
  it("rolls back invalid/missing references and owner write in an outer transaction", async () => {
    const before = await repository.synchronize("PAGE", owners[2], [
      { mediaId: ids[0], fieldName: "cover_image" },
    ]);
    await expect(
      repository.synchronize("PAGE", owners[2], [
        { mediaId: crypto.randomUUID(), fieldName: "cover_image" },
      ]),
    ).rejects.toThrow("does not exist");
    expect(await repository.findForMedia(ids[0])).toEqual(before);
    await expect(
      db.transaction(async (tx) => {
        await new MediaUsageRepository(tx).synchronize("PAGE", owners[2], [
          { mediaId: ids[1], fieldName: "cover_image" },
        ]);
        throw new Error("owner mutation failed");
      }),
    ).rejects.toThrow("owner mutation failed");
    expect(await repository.findForMedia(ids[0])).toEqual(before);
    for (const input of [
      { mediaId: "bad", fieldName: "cover" },
      { mediaId: ids[0], fieldName: "" },
      { mediaId: ids[0], fieldName: "x".repeat(101) },
    ])
      await expect(repository.synchronize("PAGE", owners[2], [input])).rejects.toThrow("Invalid");
    await repository.removeEntity("PAGE", owners[2]);
  });
  it("serializes concurrent changes of the same owner without merging stale references", async () => {
    const results = await Promise.all([
      repository.synchronize("PAGE", owners[2], [{ mediaId: ids[0], fieldName: "cover_image" }]),
      repository.synchronize("PAGE", owners[2], [{ mediaId: ids[1], fieldName: "cover_image" }]),
    ]);
    expect(results.every((rows) => rows.length === 1)).toBe(true);
    const rows = [
      ...(await repository.findForMedia(ids[0])),
      ...(await repository.findForMedia(ids[1])),
    ];
    expect(rows).toHaveLength(1);
    await repository.removeEntity("PAGE", owners[2]);
  });
});
