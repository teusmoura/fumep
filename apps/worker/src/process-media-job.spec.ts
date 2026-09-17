import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import {
  createDatabase,
  MediaRepository,
  MediaProcessingRepository,
  MediaVariantRepository,
} from "@fumep/db";
import { processMediaJob } from "./process-media-job.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
describe("persistent media processing states", () => {
  it("covers success, repetition, permanent failure and exhausted transient attempts", async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
    const { client, db } = createDatabase(process.env.DATABASE_URL);
    const repository = new MediaRepository(db);
    const states = new MediaProcessingRepository(db);
    const variants = new MediaVariantRepository(db);
    const ids: string[] = [];
    const original = await sharp({
      create: { width: 12, height: 8, channels: 3, background: "#123456" },
    })
      .png()
      .toBuffer();
    async function fixture() {
      const id = randomUUID();
      ids.push(id);
      await repository.create({
        id,
        type: "IMAGE",
        originalFilename: "fixture.png",
        storedFilename: `${id}.png`,
        storageKey: `images/originals/${id}.png`,
        sizeBytes: BigInt(original.length),
        mimeType: "image/png",
        checksumSha256: createHash("sha256").update(original).digest("hex"),
      });
      return {
        id: `process-media-${id}`,
        name: "PROCESS_MEDIA",
        data: { mediaId: id },
        attemptsMade: 0,
        opts: { attempts: 3 },
      };
    }
    try {
      const success = await fixture();
      const read = vi.fn(async () => original);
      const put = vi.fn();
      await processMediaJob(success, repository, states, variants, { read, put }, () => undefined);
      expect(await repository.findById(success.data.mediaId)).toMatchObject({
        processingStatus: "READY",
        processingError: null,
      });
      expect(await variants.findForMedia(success.data.mediaId)).toHaveLength(2);
      read.mockClear();
      put.mockClear();
      await processMediaJob(success, repository, states, variants, { read, put }, () => undefined);
      expect(read).not.toHaveBeenCalled();
      expect(put).not.toHaveBeenCalled();
      expect(await states.failed(success.data.mediaId, "secret")).toBeUndefined();

      const permanent = await fixture();
      await expect(
        processMediaJob(
          permanent,
          repository,
          states,
          variants,
          { read: async () => Buffer.from("invalid"), put },
          () => undefined,
        ),
      ).rejects.toThrow("MEDIA_INTEGRITY_MISMATCH");
      expect(await repository.findById(permanent.data.mediaId)).toMatchObject({
        processingStatus: "FAILED",
        processingError: "MEDIA_INTEGRITY_MISMATCH",
      });

      const temporary = await fixture();
      const unavailable = {
        read: async () => {
          throw new Error("secret credential");
        },
        put,
      };
      await expect(
        processMediaJob(temporary, repository, states, variants, unavailable, () => undefined),
      ).rejects.toThrow("MEDIA_PROCESSING_UNAVAILABLE");
      expect((await repository.findById(temporary.data.mediaId))?.processingStatus).toBe(
        "PROCESSING",
      );
      await expect(
        processMediaJob(
          { ...temporary, attemptsMade: 2 },
          repository,
          states,
          variants,
          unavailable,
          () => undefined,
        ),
      ).rejects.toThrow();
      expect(await repository.findById(temporary.data.mediaId)).toMatchObject({
        processingStatus: "FAILED",
        processingError: "MEDIA_PROCESSING_UNAVAILABLE",
      });
      const audit =
        await client`SELECT metadata FROM audit_logs WHERE entity_id = ${temporary.data.mediaId} AND action = 'MEDIA_PROCESSING_FAILED'`;
      expect(audit).toHaveLength(1);
      expect(JSON.stringify(audit)).not.toContain("secret");
      await processMediaJob(
        temporary,
        repository,
        states,
        variants,
        { read: async () => original, put },
        () => undefined,
      );
      expect((await repository.findById(temporary.data.mediaId))?.processingStatus).toBe("READY");
    } finally {
      for (const id of ids) {
        await client`DELETE FROM audit_logs WHERE entity_id = ${id}`;
        await client`DELETE FROM media WHERE id = ${id}`;
      }
      await client.end();
    }
  });
});
