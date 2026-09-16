import { resolve } from "node:path";
import { config } from "dotenv";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabase } from "./client.js";
import { MediaCategoryRepository } from "./media-category.repository.js";
config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { db, client } = createDatabase(process.env.DATABASE_URL);
const repository = new MediaCategoryRepository(db);
const id = crypto.randomUUID();
const ids: string[] = [];
afterAll(async () => {
  for (const category of ids) await client`DELETE FROM media_categories WHERE id = ${category}`;
  await client`DELETE FROM institutions WHERE id = ${id}`;
  await client.end();
});
describe("MediaCategoryRepository", () => {
  it("supports canonical category/link uniqueness and restricted institution deletion", async () => {
    await client`INSERT INTO institutions (id,name,slug) VALUES (${id},'Media category fixture',${`media-category-${id}`})`;
    const category = await repository.create({
      institutionId: id,
      name: "Fixture",
      slug: "fixture",
    });
    ids.push(category.id);
    expect(await repository.findById(category.id)).toEqual(category);
    expect(await repository.findForInstitutions([id])).toEqual([category]);
    expect(await repository.findForInstitutions([])).toEqual([]);
    expect(category.createdAt).toBeInstanceOf(Date);
    await expect(
      repository.create({ institutionId: id, name: "Duplicate", slug: "fixture" }),
    ).rejects.toThrow();
    await expect(client`DELETE FROM institutions WHERE id = ${id}`).rejects.toThrow();
    await expect(
      client`INSERT INTO media (type,original_filename,stored_filename,mime_type,size_bytes,storage_key,checksum_sha256,category_id) VALUES ('IMAGE','fixture.png','fixture.png','image/png',1,'fixture',${"a".repeat(64)},${crypto.randomUUID()})`,
    ).rejects.toThrow();
  });
});
