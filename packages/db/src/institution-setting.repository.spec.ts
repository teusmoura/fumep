import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { config } from "dotenv";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createDatabase } from "./client.js";
import { institutions, institutionSettings } from "./schema.js";
import { InstitutionSettingRepository } from "./institution-setting.repository.js";
config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const { client, db } = createDatabase(process.env.DATABASE_URL);
describe("InstitutionSettingRepository", () => {
  const ids: string[] = [];
  const repository = new InstitutionSettingRepository(db);
  const create = async () => {
    const [row] = await db
      .insert(institutions)
      .values({ name: "Settings fixture", slug: crypto.randomUUID() })
      .returning();
    ids.push(row.id);
    return row.id;
  };
  afterEach(async () => {
    for (const id of ids) await db.delete(institutions).where(eq(institutions.id, id));
    ids.length = 0;
  });
  afterAll(async () => client.end());
  it("upserts one row, preserves unspecified fields and isolates institutions", async () => {
    const id = await create();
    const other = await create();
    const first = await repository.upsert(id, {
      contactEmail: "contact@fumep.test",
      socialLinks: [{ label: "Social", url: "https://example.test" }],
    });
    expect(first.appearanceDefault).toBe("SYSTEM");
    const updated = await repository.upsert(id, { phone: "123", appearanceDefault: "DARK" });
    expect(updated).toMatchObject({
      contactEmail: "contact@fumep.test",
      phone: "123",
      appearanceDefault: "DARK",
    });
    expect(
      (await db.select().from(institutionSettings).where(eq(institutionSettings.institutionId, id)))
        .length,
    ).toBe(1);
    expect(await repository.findByInstitutionId(other)).toBeUndefined();
    await repository.upsert(id, { contactEmail: null, socialLinks: null });
    expect(await repository.findByInstitutionId(id)).toMatchObject({
      contactEmail: null,
      socialLinks: null,
    });
  });
  it("cascades settings when the institution is deleted", async () => {
    const id = await create();
    await repository.upsert(id, { address: "Fixture address" });
    await db.delete(institutions).where(eq(institutions.id, id));
    expect(await repository.findByInstitutionId(id)).toBeUndefined();
  });

  it("defaults to SYSTEM and persists every appearance transition without losing contact data", async () => {
    const id = await create();
    expect(await repository.upsert(id, { contactEmail: "contact@fumep.test" })).toMatchObject({
      appearanceDefault: "SYSTEM",
    });
    for (const appearanceDefault of ["LIGHT", "DARK", "SYSTEM"] as const) {
      await repository.upsert(id, { appearanceDefault });
      expect(await repository.findByInstitutionId(id)).toMatchObject({
        appearanceDefault,
        contactEmail: "contact@fumep.test",
      });
    }
  });
  it("rejects nonexistent institutions and invalid appearance", async () => {
    await expect(repository.upsert(crypto.randomUUID(), { phone: "123" })).rejects.toThrow();
    const id = await create();
    await expect(
      client`INSERT INTO institution_settings (institution_id, appearance_default) VALUES (${id}, 'INVALID')`,
    ).rejects.toThrow();
  });
});
