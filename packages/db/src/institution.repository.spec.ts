import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "./client.js";
import { InstitutionRepository } from "./institution.repository.js";
import { institutions } from "./schema.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for repository tests");
}

const { client, db } = createDatabase(databaseUrl);
const repository = new InstitutionRepository(db);

describe("InstitutionRepository", () => {
  beforeAll(async () => {
    await db.delete(institutions);
  });

  beforeEach(async () => {
    await db.delete(institutions);
  });

  afterAll(async () => {
    await db.delete(institutions);
    await client.end();
  });

  it("creates, reads, updates, lists and deletes an institution", async () => {
    const created = await repository.create({ name: "FUMEP", slug: "fumep" });

    expect(created).toMatchObject({ name: "FUMEP", slug: "fumep", isActive: true });
    expect(await repository.findById(created.id)).toEqual(created);
    expect(await repository.findAll()).toEqual([created]);
    expect(created).toMatchObject({
      primary: "#000000",
      primaryForeground: "#ffffff",
      accent: "#000000",
      accentForeground: "#ffffff",
    });

    const updated = await repository.update(created.id, {
      name: "Fundação Municipal de Ensino Profissionalizante",
      isActive: false,
      primary: "#123456",
      primaryForeground: "#ffffff",
      accent: "#000000",
      accentForeground: "#ffffff",
    });

    expect(updated).toMatchObject({
      id: created.id,
      name: "Fundação Municipal de Ensino Profissionalizante",
      slug: "fumep",
      isActive: false,
      primary: "#123456",
      primaryForeground: "#ffffff",
      accent: "#000000",
      accentForeground: "#ffffff",
    });

    expect(await repository.delete(created.id)).toBe(true);
    expect(await repository.findById(created.id)).toBeUndefined();
    expect(await repository.delete(created.id)).toBe(false);
  });
});
