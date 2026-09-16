import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { describe, expect, it } from "vitest";
import { MediaQueue, mediaQueueConfiguration } from "./index.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

describe("media queue configuration", () => {
  it("uses bounded retries, retention and producer request retries", () => {
    const options = mediaQueueConfiguration({ REDIS_URL: "redis://localhost:6379/2" });
    expect(options.connection.db).toBe(2);
    expect(options.connection.maxRetriesPerRequest).toBe(1);
    expect(options.defaultJobOptions.attempts).toBe(3);
    expect(options.defaultJobOptions.backoff).toEqual({ type: "exponential", delay: 1000 });
    expect(options.defaultJobOptions.removeOnComplete).toEqual({ age: 86400, count: 1000 });
  });
  it("supports TLS and custom retention without logging credentials", () => {
    const options = mediaQueueConfiguration({
      REDIS_URL: "rediss://localhost",
      MEDIA_QUEUE_FAILED_COUNT: "12",
    });
    expect(options.connection.tls).toEqual({});
    expect(options.defaultJobOptions.removeOnFail).toEqual({ age: 604800, count: 12 });
  });
  it.each([
    undefined,
    "https://localhost",
    "redis://localhost/-1",
    "redis://localhost/0?unexpected=1",
  ])("rejects invalid connection %s", (REDIS_URL) => {
    expect(() => mediaQueueConfiguration({ REDIS_URL })).toThrow();
  });
  it.each(["0", "-1", "1.5", "invalid"])("rejects invalid retention %s", (value) => {
    expect(() =>
      mediaQueueConfiguration({ REDIS_URL: "redis://localhost", MEDIA_QUEUE_FAILED_COUNT: value }),
    ).toThrow();
  });
  it("closes an unused producer safely and refuses reuse", async () => {
    const producer = new MediaQueue({});
    await producer.close();
    await producer.close();
    expect(() => producer.queue()).toThrow("closed");
  });
  it("persists jobs in Redis, deduplicates explicit IDs and closes connections", async () => {
    const prefix = `fumep-test-queue-${randomUUID()}`;
    const producer = new MediaQueue(process.env, prefix);
    const reopened = new MediaQueue(process.env, prefix);
    try {
      await producer.ping();
      const queue = producer.queue();
      await queue.add("QUEUE_CHECK", { fixture: true }, { jobId: "one" });
      await queue.add("QUEUE_CHECK", { fixture: true }, { jobId: "one" });
      await queue.add("QUEUE_CHECK", { fixture: true }, { jobId: "two" });
      expect(await queue.getWaitingCount()).toBe(2);
      await producer.close();
      expect((await reopened.queue().getJob("one"))?.opts.attempts).toBe(3);
      expect(await reopened.queue().getWaitingCount()).toBe(2);
    } finally {
      if (!/^fumep-test-queue-[a-f0-9-]+$/.test(prefix)) throw new Error("Unsafe test cleanup");
      await reopened.queue().obliterate({ force: true });
      await producer.close();
      await reopened.close();
    }
  }, 15000);
});
