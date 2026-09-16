import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createMediaWorker, MediaQueue, UnrecoverableError } from "@fumep/jobs";
import { createDatabase, MediaRepository } from "@fumep/db";
import { describe, expect, it, vi } from "vitest";
import { receiveMediaJob } from "./receive-media.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
const mediaId = randomUUID();
const reference = { id: mediaId, type: "IMAGE", processingStatus: "PENDING" };
const job = {
  id: `process-media-${mediaId}`,
  name: "PROCESS_MEDIA",
  data: { mediaId },
  attemptsMade: 0,
};
describe("PROCESS_MEDIA receipt", () => {
  it("rereads a real PostgreSQL Media reference", async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
    const { db, client } = createDatabase(process.env.DATABASE_URL);
    const id = randomUUID();
    try {
      const repository = new MediaRepository(db);
      await repository.create({
        id,
        type: "IMAGE",
        originalFilename: "fixture.png",
        storedFilename: `${id}.png`,
        storageKey: `images/originals/${id}.png`,
        mimeType: "image/png",
        sizeBytes: 1n,
        checksumSha256: "a".repeat(64),
      });
      await expect(
        receiveMediaJob(
          { ...job, data: { mediaId: id } },
          (key) => repository.findById(key),
          () => undefined,
        ),
      ).resolves.toEqual({ received: true, mediaId: id });
      expect((await repository.findById(id))?.processingStatus).toBe("PENDING");
    } finally {
      await client`DELETE FROM media WHERE id = ${id}`;
      await client.end();
    }
  });
  it("validates and rereads the reference without changing domain state", async () => {
    const lookup = vi.fn(async () => reference);
    const log = vi.fn();
    await expect(receiveMediaJob(job, lookup, log)).resolves.toEqual({ received: true, mediaId });
    await receiveMediaJob(job, lookup, log);
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(reference.processingStatus).toBe("PENDING");
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "received", attempt: 1, job_id: job.id }),
    );
  });
  it("rejects malformed payload permanently without echoing secrets", async () => {
    const lookup = vi.fn();
    const log = vi.fn();
    await expect(
      receiveMediaJob({ ...job, id: "secret", data: { mediaId, token: "secret" } }, lookup, log),
    ).rejects.toBeInstanceOf(UnrecoverableError);
    expect(lookup).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
  });
  it("rejects missing Media and other media types permanently", async () => {
    for (const media of [undefined, { ...reference, type: "DOCUMENT" }]) {
      await expect(
        receiveMediaJob(
          job,
          async () => media,
          () => undefined,
        ),
      ).rejects.toBeInstanceOf(UnrecoverableError);
    }
  });
  it("sanitizes temporary lookup errors for bounded retry", async () => {
    const log = vi.fn();
    await expect(
      receiveMediaJob(
        job,
        async () => {
          throw new Error("secret database URL");
        },
        log,
      ),
    ).rejects.toThrow("MEDIA_LOOKUP_UNAVAILABLE");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
  });
  it("receives real Redis jobs, retries transient failures, deduplicates and fails permanent payloads", async () => {
    const prefix = `fumep-test-queue-${randomUUID()}`;
    const producer = new MediaQueue(process.env, prefix);
    const unavailableId = randomUUID();
    let calls = 0;
    let unavailableCalls = 0;
    const logs: Record<string, unknown>[] = [];
    const worker = createMediaWorker(
      (current) =>
        receiveMediaJob(
          current,
          async (id) => {
            if (id === unavailableId) {
              unavailableCalls++;
              throw new Error("persistent unavailable fixture");
            }
            calls++;
            if (calls === 1) throw new Error("temporary fixture");
            return reference;
          },
          (entry) => logs.push(entry),
        ),
      process.env,
      prefix,
    );
    worker.on("error", () => undefined);
    try {
      await worker.waitUntilReady();
      await producer.enqueue(mediaId);
      await producer.enqueue(mediaId);
      await producer.enqueue(unavailableId);
      const queue = producer.queue();
      const invalid = await queue.add(
        "PROCESS_MEDIA",
        { invalid: true },
        { jobId: "invalid-fixture" },
      );
      await vi.waitFor(
        async () => {
          expect(await (await queue.getJob(job.id))?.getState()).toBe("completed");
          expect(await invalid.getState()).toBe("failed");
          expect(await (await queue.getJob(`process-media-${unavailableId}`))?.getState()).toBe(
            "failed",
          );
        },
        { timeout: 10000, interval: 50 },
      );
      expect(calls).toBe(2);
      expect(unavailableCalls).toBe(3);
      expect(logs).toContainEqual(expect.objectContaining({ status: "received", attempt: 2 }));
      expect((await queue.getJob("invalid-fixture"))?.attemptsMade).toBe(1);
    } finally {
      await worker.close();
      if (!/^fumep-test-queue-[a-f0-9-]+$/.test(prefix)) throw new Error("Unsafe cleanup");
      await producer.queue().obliterate({ force: true });
      await producer.close();
    }
  }, 15000);
});
