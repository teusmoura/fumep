import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { config } from "dotenv";
import { describe, expect, it, vi } from "vitest";
import { createDatabase, MediaRepository, type Media } from "@fumep/db";
import { MediaStorage } from "@fumep/storage";
import { MediaQueue, createMediaWorker, UnrecoverableError } from "@fumep/jobs";
import { decodeImage, processImage } from "./process-image.js";
import { receiveMediaJob } from "./receive-media.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
const source = () =>
  sharp({ create: { width: 12, height: 8, channels: 3, background: "#123456" } });
describe("Sharp image processing", () => {
  it.each(["jpeg", "png", "webp", "avif"] as const)(
    "fully decodes %s and preserves source bytes",
    async (format) => {
      const original = await source().toFormat(format).toBuffer();
      const copy = Buffer.from(original);
      expect(await decodeImage(original)).toEqual({ width: 12, height: 8 });
      expect(original).toEqual(copy);
    },
  );
  it("reports oriented dimensions without modifying original", async () => {
    const original = await source().jpeg().withMetadata({ orientation: 6 }).toBuffer();
    expect(await decodeImage(original)).toEqual({ width: 8, height: 12 });
  });
  it("rejects corruption, unapproved formats and decompression above pixel limit", async () => {
    const png = await source().png().toBuffer();
    for (const input of [
      Buffer.from("invalid"),
      png.subarray(0, 45),
      Buffer.from('<svg width="12" height="8"></svg>'),
    ]) {
      await expect(decodeImage(input)).rejects.toBeInstanceOf(UnrecoverableError);
    }
    await expect(decodeImage(png, { MEDIA_IMAGE_MAX_PIXELS: "10" })).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    await expect(decodeImage(png, { MEDIA_IMAGE_MAX_PIXELS: "invalid" })).rejects.toThrow(
      "Invalid MEDIA_IMAGE_MAX_PIXELS",
    );
  });
  it("rejects integrity mismatch before decode or metadata writes", async () => {
    const media = {
      type: "IMAGE",
      storageKey: `images/originals/${randomUUID()}.png`,
      sizeBytes: 1n,
      checksumSha256: "a".repeat(64),
    } as Media;
    const save = vi.fn();
    await expect(processImage(media, { read: async () => Buffer.from([1]) }, save)).rejects.toThrow(
      "MEDIA_INTEGRITY_MISMATCH",
    );
    expect(save).not.toHaveBeenCalled();
  });
  it("sanitizes storage errors and rejects unsafe references without fetching", async () => {
    const read = vi.fn(async () => {
      throw new Error("secret storage credential");
    });
    const media = { type: "IMAGE", storageKey: `images/originals/${randomUUID()}.png` } as Media;
    await expect(processImage(media, { read }, vi.fn())).rejects.toThrow(
      "MEDIA_STORAGE_UNAVAILABLE",
    );
    read.mockClear();
    await expect(
      processImage({ ...media, storageKey: "../secret" }, { read }, vi.fn()),
    ).rejects.toBeInstanceOf(UnrecoverableError);
    expect(read).not.toHaveBeenCalled();
  });
  it("processes through real Redis/MinIO/PostgreSQL and repeats without losing original", async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
    const { client, db } = createDatabase(process.env.DATABASE_URL);
    const repository = new MediaRepository(db);
    const storage = new MediaStorage();
    const id = randomUUID();
    const key = `images/originals/${id}.png`;
    const prefix = `fumep-test-queue-${randomUUID()}`;
    const producer = new MediaQueue(process.env, prefix);
    const original = await source().png().toBuffer();
    const worker = createMediaWorker(
      (job) =>
        receiveMediaJob(
          job,
          (mediaId) => repository.findById(mediaId),
          () => undefined,
          (media) =>
            processImage(media, storage, (mediaId, width, height) =>
              repository.updateDimensions(mediaId, width, height),
            ),
        ),
      process.env,
      prefix,
    );
    worker.on("error", () => undefined);
    try {
      await storage.put(key, original, "image/png");
      const media = await repository.create({
        id,
        type: "IMAGE",
        originalFilename: "fixture.png",
        storedFilename: `${id}.png`,
        storageKey: key,
        mimeType: "image/png",
        sizeBytes: BigInt(original.length),
        checksumSha256: createHash("sha256").update(original).digest("hex"),
      });
      await worker.waitUntilReady();
      await producer.enqueue(id);
      await vi.waitFor(
        async () =>
          expect(await (await producer.queue().getJob(`process-media-${id}`))?.getState()).toBe(
            "completed",
          ),
        { timeout: 10000 },
      );
      expect(await repository.findById(id)).toMatchObject({
        width: 12,
        height: 8,
        processingStatus: "PENDING",
      });
      await processImage(media, storage, (mediaId, width, height) =>
        repository.updateDimensions(mediaId, width, height),
      );
      expect(await storage.read(key, original.length)).toEqual(original);
      const persisted = await repository.findById(id);
      expect(persisted?.checksumSha256).toBe(media.checksumSha256);
      expect(persisted?.processingStatus).toBe("PENDING");
    } finally {
      await worker.close();
      if (!/^fumep-test-queue-[a-f0-9-]+$/.test(prefix)) throw new Error("Unsafe cleanup");
      await producer.queue().obliterate({ force: true });
      await producer.close();
      await storage.remove(key);
      await client`DELETE FROM media WHERE id = ${id}`;
      await client.end();
    }
  }, 15000);
});
