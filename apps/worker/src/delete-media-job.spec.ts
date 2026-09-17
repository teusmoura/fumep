import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { config } from "dotenv";
import {
  createDatabase,
  MediaDeletionRepository,
  MediaRepository,
  MediaProcessingRepository,
  MediaVariantRepository,
  withMediaDeletionLock,
} from "@fumep/db";
import { createMediaWorker, MediaQueue, UnrecoverableError } from "@fumep/jobs";
import { MediaStorage } from "@fumep/storage";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { deleteMediaJob } from "./delete-media-job.js";
import { processMediaJob } from "./process-media-job.js";
import { MediaDeletionReconciler } from "./reconcile-media-deletions.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const url = new URL(process.env.DATABASE_URL);
url.pathname = "/portal_fumep_loop_4_16_test";
const connection = createDatabase(url.toString());
const { client, db } = connection;
const repository = new MediaDeletionRepository(db);
const storage = new MediaStorage();
const userId = crypto.randomUUID();
const ids: string[] = [];
const keys: string[] = [];
beforeAll(async () => {
  await client`INSERT INTO users(id,name,email,password_hash,role) VALUES(${userId},'Delete worker fixture',${`${userId}@fixture.test`},'unused','ADMIN')`;
});
afterEach(async () => {
  vi.restoreAllMocks();
  for (const key of keys.splice(0)) await storage.remove(key);
  if (ids.length) {
    await client`DELETE FROM media_usages WHERE media_id IN ${client(ids)}`;
    await client`DELETE FROM media WHERE id IN ${client(ids)}`;
  }
  ids.splice(0);
  await client`DELETE FROM audit_logs WHERE user_id=${userId}`;
});
afterAll(async () => {
  await client`DELETE FROM users WHERE id=${userId}`;
  await client.end();
});
async function fixture(document = false, put = true) {
  const id = crypto.randomUUID();
  ids.push(id);
  const key = document ? `documents/${id}.pdf` : `images/originals/${id}.png`;
  keys.push(key);
  if (put)
    await storage.put(key, Buffer.from("fixture"), document ? "application/pdf" : "image/png");
  await new MediaRepository(db).create({
    id,
    type: document ? "DOCUMENT" : "IMAGE",
    processingStatus: "READY",
    originalFilename: `delete-${id}`,
    storedFilename: `${id}.${document ? "pdf" : "png"}`,
    storageKey: key,
    mimeType: document ? "application/pdf" : "image/png",
    sizeBytes: 7n,
    checksumSha256: "a".repeat(64),
  });
  await repository.request(id, userId, () => undefined);
  return { id, key, job: { name: "DELETE_MEDIA", data: { mediaId: id }, attemptsMade: 0 } };
}
const quiet = () => undefined;
describe("DELETE_MEDIA and durable reconciliation", () => {
  it("does not decode or write image objects for a delayed PROCESS_MEDIA after deletion intent", async () => {
    const row = await fixture();
    const read = vi.fn();
    const put = vi.fn();
    await expect(
      processMediaJob(
        {
          name: "PROCESS_MEDIA",
          id: `process-media-${row.id}`,
          data: { mediaId: row.id },
          attemptsMade: 0,
          opts: { attempts: 3 },
        },
        new MediaRepository(db),
        new MediaProcessingRepository(db),
        new MediaVariantRepository(db),
        { read, put },
        quiet,
      ),
    ).rejects.toThrow("MEDIA_NO_LONGER_EXISTS");
    expect(read).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(await repository.current(row.id)).toMatchObject({
      deletionStatus: "REQUESTED",
      processingStatus: "READY",
    });
  });
  it("rolls back metadata deletion when final audit fails after real object removal", async () => {
    const row = await fixture(true);
    const name = `fixture_audit_${crypto.randomUUID().replaceAll("-", "")}`;
    await client.unsafe(
      `CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'MEDIA_DELETED' AND NEW.entity_id = '${row.id}'::uuid THEN RAISE EXCEPTION 'simulated audit unavailable'; END IF; RETURN NEW; END $$`,
    );
    await client.unsafe(
      `CREATE TRIGGER ${name} BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION ${name}()`,
    );
    try {
      await expect(deleteMediaJob(row.job, client, storage, quiet)).rejects.toThrow(
        "MEDIA_DELETE_UNAVAILABLE",
      );
      expect(await repository.current(row.id)).toMatchObject({
        deletionStatus: "REQUESTED",
        deletionAttempts: 1,
        storageKey: row.key,
      });
      await expect(storage.read(row.key, 100)).rejects.toThrow();
      expect(
        await client`SELECT id FROM audit_logs WHERE entity_id=${row.id} AND action='MEDIA_DELETED'`,
      ).toHaveLength(0);
    } finally {
      await client.unsafe(`DROP TRIGGER ${name} ON audit_logs`);
      await client.unsafe(`DROP FUNCTION ${name}()`);
    }
    await deleteMediaJob(row.job, client, storage, quiet);
    expect(await repository.current(row.id)).toBeUndefined();
  });
  it("recovers after actual isolated executor crashes following variant or original removal", async () => {
    for (const stage of ["variant", "original"] as const) {
      const row = await fixture(stage === "original");
      if (stage === "variant") {
        const variant = `images/variants/${row.id}-1.webp`;
        keys.push(variant);
        await storage.put(variant, Buffer.from("variant"), "image/webp");
        await new MediaVariantRepository(db).upsert({
          mediaId: row.id,
          format: "WEBP",
          width: 1,
          height: 1,
          sizeBytes: 7n,
          storageKey: variant,
        });
      }
      const code = await new Promise<number | null>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            `
        import {createDatabase} from "@fumep/db";
        import {MediaStorage} from "@fumep/storage";
        import {deleteMediaJob} from "./src/delete-media-job.ts";
        const {client}=createDatabase(process.env.DATABASE_URL);
        const storage=new MediaStorage();
        await deleteMediaJob({name:"DELETE_MEDIA",data:{mediaId:process.env.MEDIA_TEST_ID},attemptsMade:0},client,
          {remove:async(key)=>{await storage.remove(key);process.exit(71)}},()=>{});
      `,
          ],
          {
            cwd: fileURLToPath(new URL("..", import.meta.url)),
            env: { ...process.env, DATABASE_URL: url.toString(), MEDIA_TEST_ID: row.id },
            stdio: "ignore",
          },
        );
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error("Fixture child timed out"));
        }, 10000);
        child.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        child.once("exit", (exitCode) => {
          clearTimeout(timer);
          resolve(exitCode);
        });
      });
      expect(code).toBe(71);
      if (stage === "original") await expect(storage.read(row.key, 100)).rejects.toThrow();
      else expect(await storage.read(row.key, 100)).toEqual(Buffer.from("fixture"));
      expect(await repository.current(row.id)).toMatchObject({
        deletionStatus: "REQUESTED",
        deletionAttempts: 1,
      });
      await deleteMediaJob(row.job, client, storage, quiet);
      expect(await repository.current(row.id)).toBeUndefined();
    }
  }, 15000);
  it("removes real variants then original, preserves rollback keys after partial removal and safely repeats", async () => {
    const row = await fixture();
    const variant = `images/variants/${row.id}-1.webp`;
    keys.push(variant);
    await storage.put(variant, Buffer.from("variant"), "image/webp");
    await new MediaVariantRepository(db).upsert({
      mediaId: row.id,
      format: "WEBP",
      width: 1,
      height: 1,
      sizeBytes: 7n,
      storageKey: variant,
    });
    const removed: string[] = [];
    await expect(
      deleteMediaJob(
        row.job,
        client,
        {
          remove: async (key) => {
            await storage.remove(key);
            removed.push(key);
            if (key === row.key) throw new Error("simulated loss after original removal");
          },
        },
        quiet,
      ),
    ).rejects.toThrow("MEDIA_DELETE_UNAVAILABLE");
    expect(removed).toEqual([variant, row.key]);
    expect(await repository.current(row.id)).toMatchObject({
      deletionStatus: "REQUESTED",
      deletionAttempts: 1,
    });
    expect(await new MediaVariantRepository(db).findForMedia(row.id)).toHaveLength(1);
    await expect(storage.read(row.key, 100)).rejects.toThrow();
    await deleteMediaJob(row.job, client, storage, quiet);
    await deleteMediaJob(row.job, client, storage, quiet);
    expect(await repository.current(row.id)).toBeUndefined();
    expect(
      await client`SELECT id FROM audit_logs WHERE entity_id=${row.id} AND action='MEDIA_DELETED'`,
    ).toHaveLength(1);
    const pdf = await fixture(true);
    await deleteMediaJob(pdf.job, client, storage, quiet);
    expect(await repository.current(pdf.id)).toBeUndefined();
  });
  it("resumes after reservation crash and never resets the persisted budget after job loss", async () => {
    const row = await fixture();
    await expect(
      withMediaDeletionLock(client, row.id, async (locked) => {
        await locked.reserveAttempt(row.id);
        throw new Error("checkpoint crash");
      }),
    ).rejects.toThrow("checkpoint");
    const remove = vi.fn(async () => {
      throw new Error("secret MinIO credential");
    });
    const logs: Record<string, unknown>[] = [];
    for (let attempt = 0; attempt < 2; attempt++)
      await expect(
        deleteMediaJob(row.job, client, { remove }, (entry) => logs.push(entry)),
      ).rejects.toThrow("MEDIA_DELETE_UNAVAILABLE");
    expect(await repository.current(row.id)).toMatchObject({
      deletionStatus: "FAILED",
      deletionAttempts: 3,
    });
    await deleteMediaJob(row.job, client, { remove }, quiet);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(logs)).not.toContain("credential");
    await repository.request(row.id, userId, () => undefined, true);
    await deleteMediaJob(row.job, client, storage, quiet);
    expect(await repository.current(row.id)).toBeUndefined();
  });
  it("rejects invalid payload before storage/PG and fails closed when PostgreSQL lookup fails", async () => {
    const remove = vi.fn();
    for (const data of [{ mediaId: "bad" }, { mediaId: crypto.randomUUID(), secret: "hidden" }])
      await expect(
        deleteMediaJob({ name: "DELETE_MEDIA", data, attemptsMade: 0 }, client, { remove }, quiet),
      ).rejects.toThrow("INVALID_MEDIA_DELETE_JOB");
    const row = await fixture();
    const lookup = vi
      .spyOn(MediaDeletionRepository.prototype, "reserveAttempt")
      .mockRejectedValueOnce(new Error("PostgreSQL offline password"));
    await expect(deleteMediaJob(row.job, client, { remove }, quiet)).rejects.toThrow(
      "MEDIA_DELETE_UNAVAILABLE",
    );
    expect(remove).not.toHaveBeenCalled();
    lookup.mockRestore();
  });
  it("recovers a missing/terminal job with real Redis; concurrent scans preserve one job and active locks", async () => {
    const row = await fixture();
    const prefix = `fixture-delete-${crypto.randomUUID()}`;
    const queue = new MediaQueue(process.env, prefix);
    const first = new MediaDeletionReconciler(connection, queue, quiet);
    const second = new MediaDeletionReconciler(connection, queue, quiet);
    try {
      await Promise.all([first.scan(), second.scan()]);
      expect(await queue.deletionState(row.id)).toBe("waiting");
      expect(await queue.queue().getJobCounts("waiting")).toMatchObject({ waiting: 1 });
      const job = await queue.queue().getJob(`delete-media-${row.id}`);
      expect(job?.name).toBe("DELETE_MEDIA");
      expect(job?.data).toEqual({ mediaId: row.id });
      await job!.remove();
      await withMediaDeletionLock(client, row.id, async () => {
        await first.scan();
        expect(await queue.deletionState(row.id)).toBe("missing");
      });
      await first.scan();
      expect(await queue.deletionState(row.id)).toBe("waiting");
      const worker = createMediaWorker(async () => undefined, process.env, prefix);
      try {
        await worker.waitUntilReady();
        await vi.waitFor(async () => expect(await queue.deletionState(row.id)).toBe("completed"), {
          timeout: 10000,
        });
      } finally {
        await worker.close();
      }
      await second.scan();
      expect(await queue.deletionState(row.id)).toBe("waiting");
      const failingWorker = createMediaWorker(
        async () => {
          throw new UnrecoverableError("fixture permanent failure");
        },
        process.env,
        prefix,
      );
      try {
        await failingWorker.waitUntilReady();
        await vi.waitFor(async () => expect(await queue.deletionState(row.id)).toBe("failed"), {
          timeout: 10000,
        });
      } finally {
        await failingWorker.close();
      }
      await first.scan();
      expect(await queue.deletionState(row.id)).toBe("waiting");
      const recovered = await queue.queue().getJob(`delete-media-${row.id}`);
      await recovered!.remove();
      for (let attempt = 0; attempt < 3; attempt++)
        await withMediaDeletionLock(client, row.id, async (locked) => {
          await locked.reserveAttempt(row.id);
        });
      await first.scan();
      expect(await repository.current(row.id)).toMatchObject({
        deletionStatus: "FAILED",
        deletionErrorCode: "RETRY_EXHAUSTED",
      });
      expect(await queue.deletionState(row.id)).toBe("missing");
      await second.scan();
      expect(await queue.deletionState(row.id)).toBe("missing");
    } finally {
      await first.close();
      await second.close();
      await queue.close();
    }
  });
  it("a real BullMQ consumer deletes objects, retries transient storage failure and keeps audit unique", async () => {
    const row = await fixture(true);
    const prefix = `fixture-delete-${crypto.randomUUID()}`;
    const queue = new MediaQueue(process.env, prefix);
    let calls = 0;
    const worker = createMediaWorker(
      (job) =>
        deleteMediaJob(
          job,
          client,
          {
            remove: async (key) => {
              if (++calls === 1) throw new Error("temporary");
              await storage.remove(key);
            },
          },
          quiet,
        ),
      process.env,
      prefix,
    );
    try {
      await worker.waitUntilReady();
      await queue.enqueueDeletion(row.id);
      await vi.waitFor(async () => expect(await queue.deletionState(row.id)).toBe("completed"), {
        timeout: 10000,
      });
      expect(calls).toBe(2);
      expect(await repository.current(row.id)).toBeUndefined();
      expect(
        await client`SELECT id FROM audit_logs WHERE entity_id=${row.id} AND action='MEDIA_DELETED'`,
      ).toHaveLength(1);
      await (await queue.queue().getJob(`delete-media-${row.id}`))!.remove();
    } finally {
      await worker.close();
      await queue.close();
    }
  });
  it("recovers after enqueue outage, preserves pending jobs, and waits for startup scan during shutdown", async () => {
    const row = await fixture(false, false);
    let outage = true;
    const deliver = vi.fn(async () => undefined);
    const reconciler = new MediaDeletionReconciler(
      connection,
      {
        deletionState: async () => {
          if (outage) throw new Error("Redis secret");
          return "missing" as const;
        },
        reconcileDeletion: deliver,
      },
      quiet,
    );
    await reconciler.scan();
    expect(deliver).not.toHaveBeenCalled();
    expect(await repository.current(row.id)).toMatchObject({ deletionStatus: "REQUESTED" });
    outage = false;
    await reconciler.scan();
    expect(deliver).toHaveBeenCalledWith(row.id);
    await reconciler.close();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const timer = vi.spyOn(globalThis, "setInterval");
    const clear = vi.spyOn(globalThis, "clearInterval");
    const scanner = new MediaDeletionReconciler(
      connection,
      {
        deletionState: async () => {
          entered();
          await gate;
          return "waiting" as const;
        },
        reconcileDeletion: deliver,
      },
      quiet,
    );
    scanner.start();
    await ready;
    let finished = false;
    const closing = scanner.close().then(() => {
      finished = true;
    });
    expect(timer).toHaveBeenCalledWith(expect.any(Function), 60000);
    expect(finished).toBe(false);
    release();
    await closing;
    expect(clear).toHaveBeenCalled();
    expect(finished).toBe(true);
    const calls = deliver.mock.calls.length;
    await scanner.scan();
    expect(deliver.mock.calls.length).toBe(calls);
  });
  it("bounded cursor reaches intents beyond 100 pending jobs without starvation", async () => {
    for (let index = 0; index < 101; index++) await fixture(false, false);
    const observed: string[] = [];
    const scanner = new MediaDeletionReconciler(
      connection,
      {
        deletionState: async (id) => {
          observed.push(id);
          return "waiting" as const;
        },
        reconcileDeletion: async () => {
          throw new Error("must preserve pending");
        },
      },
      quiet,
    );
    try {
      await scanner.scan();
      expect(observed).toHaveLength(100);
      await scanner.scan();
      expect(new Set(observed).size).toBe(101);
    } finally {
      await scanner.close();
    }
  }, 15000);
});
