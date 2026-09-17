import { resolve } from "node:path";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase } from "./client.js";
import { InstitutionRepository } from "./institution.repository.js";
import {
  InstitutionLogoRepository,
  InvalidInstitutionLogoError,
} from "./institution-logo.repository.js";
config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { db, client } = createDatabase(process.env.DATABASE_URL);
const repository = new InstitutionLogoRepository(db);
const owners = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
const actor = crypto.randomUUID();
const category = crypto.randomUUID();
const images = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
beforeAll(async () => {
  await client`INSERT INTO users(id,name,email,password_hash,role) VALUES (${actor},'Logo fixture',${`${actor}@example.test`},'test-only','ADMIN')`;
  for (const id of owners)
    await client`INSERT INTO institutions(id,name,slug) VALUES (${id},'Logo fixture',${`logo-${id}`})`;
  for (const id of images)
    await client`INSERT INTO media(id,type,original_filename,stored_filename,mime_type,size_bytes,storage_key,checksum_sha256,processing_status) VALUES (${id},'IMAGE','logo.png',${`${id}.png`},'image/png',1,${`images/originals/${id}.png`},${"a".repeat(64)},'READY')`;
});
afterAll(async () => {
  await client`DELETE FROM media_categories WHERE id=${category}`;
  for (const id of owners) {
    await new InstitutionRepository(db).delete(id);
    await client`DELETE FROM audit_logs WHERE entity_type='INSTITUTION' AND entity_id=${id}`;
  }
  for (const id of images) await client`DELETE FROM media WHERE id=${id}`;
  await client`DELETE FROM users WHERE id=${actor}`;
  await client.end();
});
describe("Institution logos consumer", () => {
  it("reuses the same image for three institutions and both appearances without duplication", async () => {
    for (const id of owners) {
      const updated = await repository.update(
        id,
        { logoLightId: images[0], logoDarkId: images[0] },
        actor,
      );
      expect(updated).toMatchObject({ logoLightId: images[0], logoDarkId: images[0] });
    }
    const before = await client`SELECT * FROM media_usages WHERE media_id=${images[0]} ORDER BY id`;
    expect(before).toHaveLength(6);
    await repository.update(owners[0], { logoLightId: images[0] }, actor);
    expect(
      await client`SELECT * FROM media_usages WHERE media_id=${images[0]} ORDER BY id`,
    ).toEqual(before);
    expect(await client`SELECT id FROM media WHERE id=${images[0]}`).toHaveLength(1);
    await expect(client`DELETE FROM media WHERE id=${images[0]}`).rejects.toThrow();
  });
  it("replaces only the targeted field and clears stale usages atomically", async () => {
    await repository.update(owners[0], { logoLightId: images[1], logoDarkId: null }, actor);
    expect(
      await client`SELECT media_id,field_name FROM media_usages WHERE entity_type='INSTITUTION' AND entity_id=${owners[0]}`,
    ).toEqual([{ media_id: images[1], field_name: "logo_light_id" }]);
    expect(await client`SELECT id FROM media_usages WHERE entity_id=${owners[1]}`).toHaveLength(2);
  });
  it("rejects missing, processing, document, SVG and deletion-intent media without changing owner/usages", async () => {
    const before = await client`SELECT * FROM media_usages WHERE entity_id=${owners[0]}`;
    await expect(
      repository.update(owners[0], { logoLightId: crypto.randomUUID() }, actor),
    ).rejects.toBeInstanceOf(InvalidInstitutionLogoError);
    for (const status of ["PENDING", "PROCESSING", "FAILED"]) {
      await client`UPDATE media SET processing_status=${status} WHERE id=${images[2]}`;
      await expect(
        repository.update(owners[0], { logoLightId: images[2] }, actor),
      ).rejects.toBeInstanceOf(InvalidInstitutionLogoError);
    }
    await client`UPDATE media SET processing_status='READY',type='DOCUMENT',mime_type='application/pdf' WHERE id=${images[2]}`;
    await expect(
      repository.update(owners[0], { logoLightId: images[2] }, actor),
    ).rejects.toBeInstanceOf(InvalidInstitutionLogoError);
    await client`UPDATE media SET type='IMAGE',mime_type='image/svg+xml' WHERE id=${images[2]}`;
    await expect(
      repository.update(owners[0], { logoLightId: images[2] }, actor),
    ).rejects.toBeInstanceOf(InvalidInstitutionLogoError);
    await client`UPDATE media SET mime_type='image/png',deletion_status='REQUESTED',deletion_requested_at=now() WHERE id=${images[2]}`;
    await expect(
      repository.update(owners[0], { logoLightId: images[2] }, actor),
    ).rejects.toBeInstanceOf(InvalidInstitutionLogoError);
    await client`UPDATE media SET deletion_status='FAILED',deletion_error_code='STORAGE_UNAVAILABLE' WHERE id=${images[2]}`;
    await expect(
      repository.update(owners[0], { logoLightId: images[2] }, actor),
    ).rejects.toBeInstanceOf(InvalidInstitutionLogoError);
    expect(await client`SELECT * FROM media_usages WHERE entity_id=${owners[0]}`).toEqual(before);
    expect(
      (await client`SELECT logo_light_id FROM institutions WHERE id=${owners[0]}`)[0].logo_light_id,
    ).toBe(images[1]);
  });
  it("rolls back on audit failure and removes usages on owner deletion", async () => {
    await expect(
      repository.update(owners[0], { logoLightId: null }, crypto.randomUUID()),
    ).rejects.toThrow();
    expect(
      (await client`SELECT logo_light_id FROM institutions WHERE id=${owners[0]}`)[0].logo_light_id,
    ).toBe(images[1]);
    expect(await new InstitutionRepository(db).delete(owners[0])).toBe(true);
    expect(await client`SELECT id FROM media_usages WHERE entity_id=${owners[0]}`).toHaveLength(0);
    expect(await repository.update(owners[0], {}, actor)).toBeUndefined();
  });
  it("keeps usages when a dependency prevents owner deletion", async () => {
    await client`INSERT INTO media_categories(id,institution_id,name,slug) VALUES (${category},${owners[2]},'Logo dependency',${`logo-${category}`})`;
    const before =
      await client`SELECT * FROM media_usages WHERE entity_type='INSTITUTION' AND entity_id=${owners[2]} ORDER BY id`;
    expect(before).toHaveLength(2);
    await expect(new InstitutionRepository(db).delete(owners[2])).rejects.toThrow();
    expect(
      await client`SELECT * FROM media_usages WHERE entity_type='INSTITUTION' AND entity_id=${owners[2]} ORDER BY id`,
    ).toEqual(before);
    expect(await client`SELECT id FROM institutions WHERE id=${owners[2]}`).toHaveLength(1);
    await client`DELETE FROM media_categories WHERE id=${category}`;
  });
});
