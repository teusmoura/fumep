import { resolve } from "node:path";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createDatabase } from "./client.js";
import { MediaDeletionRepository, withMediaDeletionLock } from "./media-deletion.repository.js";
import { MediaRepository } from "./media.repository.js";
import { MediaProcessingRepository } from "./media-processing.repository.js";
import { MediaUsageRepository } from "./media-usage.repository.js";
import { MediaVariantRepository } from "./media-variant.repository.js";
config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { db, client } = createDatabase(process.env.DATABASE_URL);
const repository = new MediaDeletionRepository(db);
const mediaRepository = new MediaRepository(db);
const userId = crypto.randomUUID();
const ids: string[] = [];
beforeAll(async () => {
  await client`INSERT INTO users(id,name,email,password_hash,role) VALUES (${userId},'Deletion fixture',${`${userId}@fixture.test`},'unused','ADMIN')`;
});
afterAll(async () => {
  if (ids.length) {
    await client`DELETE FROM media_usages WHERE media_id IN ${client(ids)}`;
    await client`DELETE FROM media WHERE id IN ${client(ids)}`;
  }
  await client`DELETE FROM audit_logs WHERE user_id=${userId}`;
  await client`DELETE FROM users WHERE id=${userId}`;
  await client.end();
});
async function fixture() {
  const id = crypto.randomUUID();
  ids.push(id);
  await mediaRepository.create({
    id,
    type: "IMAGE",
    processingStatus: "READY",
    originalFilename: `delete-${id}.png`,
    storedFilename: `${id}.png`,
    mimeType: "image/png",
    sizeBytes: 1n,
    storageKey: `images/originals/${id}.png`,
    checksumSha256: "b".repeat(64),
  });
  return id;
}
const authorize = () => undefined;
describe("durable deletion lifecycle in PostgreSQL", () => {
  it("defaults/constraints, idempotent intent, hidden search/duplicates and no new usages/processing", async () => {
    const id = await fixture();
    expect(await repository.current(id)).toMatchObject({
      deletionStatus: "NONE",
      deletionAttempts: 0,
    });
    for (const update of [
      "deletion_attempts=4",
      "deletion_status='REQUESTED'",
      "deletion_error_code='secret'",
      "deletion_last_attempt_at=now()",
    ])
      await expect(
        client.unsafe(`UPDATE media SET ${update} WHERE id=$1`, [id]),
      ).rejects.toMatchObject({ code: "23514" });
    expect(await repository.request(id, userId, authorize)).toBe("REQUESTED");
    const first = await repository.current(id);
    expect(await repository.request(id, userId, authorize)).toBe("REQUESTED");
    expect(await repository.current(id)).toEqual(first);
    expect(
      await client`SELECT action FROM audit_logs WHERE entity_id=${id} AND action='MEDIA_DELETE_REQUESTED'`,
    ).toHaveLength(1);
    expect(await mediaRepository.search({ q: id, page: 1, limit: 20 })).toMatchObject({
      total: 0,
      items: [],
    });
    const duplicate = await mediaRepository.findDuplicate("b".repeat(64));
    expect(duplicate?.id).not.toBe(id);
    await expect(
      new MediaUsageRepository(db).synchronize("PAGE", crypto.randomUUID(), [
        { mediaId: id, fieldName: "hero" },
      ]),
    ).rejects.toThrow("unavailable");
    expect(await new MediaProcessingRepository(db).start(id)).toBeUndefined();
    expect(await repository.request(id, userId, authorize, true)).toBe("INVALID_STATE");
  });
  it("durable reservation, rollback after partial removal, successful replay and single final audit", async () => {
    const id = await fixture();
    const variant = `images/variants/${id}-1.webp`;
    await new MediaVariantRepository(db).upsert({
      mediaId: id,
      format: "WEBP",
      width: 1,
      height: 1,
      sizeBytes: 1n,
      storageKey: variant,
    });
    await repository.request(id, userId, authorize);
    await expect(
      withMediaDeletionLock(client, id, async (locked) => {
        expect(await locked.reserveAttempt(id)).toBe(true);
        throw new Error("simulated process loss after reservation");
      }),
    ).rejects.toThrow("simulated");
    expect(await repository.current(id)).toMatchObject({ deletionAttempts: 1 });
    const removed: string[] = [];
    await expect(
      withMediaDeletionLock(client, id, async (locked) => {
        await locked.reserveAttempt(id);
        await locked.cleanup(id, async (key) => {
          removed.push(key);
          if (key === `images/originals/${id}.png`)
            throw new Error("simulated crash after removing original");
        });
      }),
    ).rejects.toThrow("simulated");
    expect(removed).toEqual([variant, `images/originals/${id}.png`]);
    expect(await repository.current(id)).toMatchObject({
      deletionStatus: "REQUESTED",
      deletionAttempts: 2,
    });
    expect(await new MediaVariantRepository(db).findForMedia(id)).toHaveLength(1);
    expect(
      await client`SELECT id FROM audit_logs WHERE entity_id=${id} AND action='MEDIA_DELETED'`,
    ).toHaveLength(0);
    await withMediaDeletionLock(client, id, async (locked) => {
      await locked.reserveAttempt(id);
      await locked.cleanup(id, async () => undefined);
    });
    expect(await repository.current(id)).toBeUndefined();
    await withMediaDeletionLock(client, id, async (locked) => {
      expect(await locked.reserveAttempt(id)).toBe(false);
    });
    expect(
      await client`SELECT id FROM audit_logs WHERE entity_id=${id} AND action='MEDIA_DELETED'`,
    ).toHaveLength(1);
  });
  it("exhausts persisted attempts without I/O, and requires explicit new cycle", async () => {
    const id = await fixture();
    await repository.request(id, userId, authorize);
    const remove = vi.fn(async () => {
      throw new Error("credential must not persist");
    });
    for (let attempt = 0; attempt < 3; attempt++)
      await withMediaDeletionLock(client, id, async (locked) => {
        expect(await locked.reserveAttempt(id)).toBe(true);
        await expect(locked.cleanup(id, remove)).rejects.toThrow("credential");
        await locked.failedAttempt(id);
      });
    expect(await repository.current(id)).toMatchObject({
      deletionStatus: "FAILED",
      deletionAttempts: 3,
      deletionErrorCode: "STORAGE_UNAVAILABLE",
    });
    await withMediaDeletionLock(client, id, async (locked) => {
      expect(await locked.reserveAttempt(id)).toBe(false);
    });
    expect(remove).toHaveBeenCalledTimes(3);
    expect(await repository.request(id, userId, authorize)).toBe("INVALID_STATE");
    expect(await repository.request(id, userId, authorize, true)).toBe("REQUESTED");
    expect(await repository.current(id)).toMatchObject({
      deletionAttempts: 0,
      deletionLastAttemptAt: null,
      deletionErrorCode: null,
    });
    expect(
      JSON.stringify(await client`SELECT metadata FROM audit_logs WHERE entity_id=${id}`),
    ).not.toContain("credential");
  });
  it("serializes pinned locks across commits; try-lock skips active executor and releases on failure", async () => {
    const id = await fixture();
    await repository.request(id, userId, authorize);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const holder = withMediaDeletionLock(client, id, async (locked) => {
      await locked.reserveAttempt(id);
      entered();
      await gate;
    });
    await ready;
    const competing = vi.fn(async () => undefined);
    try {
      await withMediaDeletionLock(client, id.toUpperCase(), competing, true);
      expect(competing).not.toHaveBeenCalled();
    } finally {
      release();
      await holder;
    }
    await withMediaDeletionLock(client, id, competing, true);
    expect(competing).toHaveBeenCalledOnce();
  });
  it("rejects usage and image start after they wait for an uncommitted intent row lock", async () => {
    const id = await fixture();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let holderPid = 0;
    const holder = db.transaction(async (tx) => {
      await new MediaDeletionRepository(tx).request(id, userId, authorize);
      const [pid] = await tx.execute<{ pid: number }>(sql`SELECT pg_backend_pid() AS pid`);
      holderPid = pid!.pid;
      entered();
      await gate;
    });
    await ready;
    const usage = new MediaUsageRepository(db)
      .synchronize("PAGE", crypto.randomUUID(), [{ mediaId: id, fieldName: "cover" }])
      .then(
        () => "unexpected",
        () => "blocked",
      );
    const processing = new MediaProcessingRepository(db).start(id);
    try {
      await vi.waitFor(async () => {
        const [row] = await client<
          { waiting: number }[]
        >`SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE ${holderPid}=ANY(pg_blocking_pids(pid))`;
        expect(row!.waiting).toBeGreaterThan(0);
      });
    } finally {
      release();
      await holder;
    }
    expect(await usage).toBe("blocked");
    expect(await processing).toBeUndefined();
  });
  it("fails safely on unexpected usages/processing and foreign object keys, before removal", async () => {
    for (const conflict of ["usage", "processing", "key"] as const) {
      const id = await fixture();
      await repository.request(id, userId, authorize);
      if (conflict === "usage")
        await client`INSERT INTO media_usages(media_id,entity_type,entity_id,field_name) VALUES(${id},'PAGE',${crypto.randomUUID()},'hero')`;
      if (conflict === "processing")
        await client`UPDATE media SET processing_status='PROCESSING' WHERE id=${id}`;
      if (conflict === "key")
        await client`UPDATE media SET storage_key='images/originals/another-file.png' WHERE id=${id}`;
      const remove = vi.fn(async () => undefined);
      await withMediaDeletionLock(client, id, async (locked) => {
        await locked.reserveAttempt(id);
        if (conflict === "key")
          await expect(locked.cleanup(id, remove)).rejects.toThrow("STORAGE_UNAVAILABLE");
        else await locked.cleanup(id, remove);
      });
      expect(remove).not.toHaveBeenCalled();
      expect(await repository.current(id)).toBeDefined();
      if (conflict !== "key")
        expect(await repository.current(id)).toMatchObject({ deletionStatus: "FAILED" });
    }
  });
});
