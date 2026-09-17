import { resolve } from "node:path";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createDatabase } from "./client.js";
import { MediaDeletionGuard } from "./media-deletion.guard.js";
import { MediaUsageRepository } from "./media-usage.repository.js";
config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { db, client } = createDatabase(process.env.DATABASE_URL);
const guard = new MediaDeletionGuard(db);
const usages = new MediaUsageRepository(db);
const id = crypto.randomUUID();
const userId = crypto.randomUUID();
const owner = crypto.randomUUID();
beforeAll(async () => {
  await client`INSERT INTO users (id,name,email,password_hash,role) VALUES (${userId},'Deletion guard fixture',${`${userId}@fixture.test`},'unused','ADMIN')`;
  await client`INSERT INTO media (id,type,original_filename,stored_filename,mime_type,size_bytes,storage_key,checksum_sha256) VALUES (${id},'IMAGE','guard.png',${`${id}.png`},'image/png',1,${`images/originals/${id}.png`},${"a".repeat(64)})`;
});
afterAll(async () => {
  await client`DELETE FROM media_usages WHERE media_id = ${id}`;
  await client`DELETE FROM audit_logs WHERE user_id = ${userId}`;
  await client`DELETE FROM media WHERE id = ${id}`;
  await client`DELETE FROM users WHERE id = ${userId}`;
  await client.end();
});
describe("MediaDeletionGuard internal critical section", () => {
  it("blocks referenced media before any operation, preserving rows and auditing only reason", async () => {
    await usages.synchronize("PAGE", owner, [{ mediaId: id, fieldName: "cover_image" }]);
    const operation = vi.fn(async () => "must not happen");
    expect(await guard.withUnusedMedia(id, userId, () => undefined, operation)).toEqual({
      status: "IN_USE",
    });
    expect(operation).not.toHaveBeenCalled();
    expect(await usages.findForMedia(id)).toHaveLength(1);
    expect(await client`SELECT id FROM media WHERE id = ${id}`).toHaveLength(1);
    const [audit] = await client`SELECT action,metadata FROM audit_logs WHERE user_id = ${userId}`;
    expect(audit).toMatchObject({ action: "MEDIA_DELETE_BLOCKED", metadata: { reason: "IN_USE" } });
    await usages.removeEntity("PAGE", owner);
  });
  it("rechecks institutional authority and blocks processing without invoking the operation", async () => {
    const operation = vi.fn(async () => undefined);
    const authorize = vi.fn(() => {
      throw new Error("forbidden");
    });
    await expect(guard.withUnusedMedia(id, userId, authorize, operation)).rejects.toThrow(
      "forbidden",
    );
    expect(authorize).toHaveBeenCalledWith(null);
    expect(operation).not.toHaveBeenCalled();
    await client`UPDATE media SET processing_status = 'PROCESSING' WHERE id = ${id}`;
    expect(await guard.withUnusedMedia(id, userId, () => undefined, operation)).toEqual({
      status: "PROCESSING",
    });
    expect(operation).not.toHaveBeenCalled();
    await client`UPDATE media SET processing_status = 'READY' WHERE id = ${id}`;
    expect(
      await guard.withUnusedMedia(crypto.randomUUID(), userId, () => undefined, operation),
    ).toEqual({ status: "MISSING" });
  });
  it("holds media lock through the critical section so a new usage cannot interleave", async () => {
    let holderPid = 0;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const section = guard.withUnusedMedia(
      id,
      userId,
      () => undefined,
      async (tx) => {
        const [row] = await tx.execute<{ pid: number }>(sql`SELECT pg_backend_pid() AS pid`);
        holderPid = row.pid;
        entered();
        await gate;
        return "checked";
      },
    );
    await started;
    let completed = false;
    const referencing = usages
      .synchronize("PAGE", owner, [{ mediaId: id, fieldName: "cover_image" }])
      .then((rows) => {
        completed = true;
        return rows;
      });
    try {
      await vi.waitFor(async () => {
        const [row] =
          await client`SELECT count(*) AS waiting FROM pg_stat_activity WHERE datname = current_database() AND ${holderPid} = ANY(pg_blocking_pids(pid))`;
        expect(Number(row.waiting)).toBeGreaterThan(0);
        expect(completed).toBe(false);
      });
    } finally {
      release();
    }
    expect(await section).toEqual({ status: "COMPLETED", result: "checked" });
    expect(await referencing).toHaveLength(1);
    await usages.removeEntity("PAGE", owner);
  });
});
