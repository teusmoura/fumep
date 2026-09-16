import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { UnrecoverableError } from "@fumep/jobs";
import type { MediaVariantRepository } from "@fumep/db";
import { persistMediaVariants, variantWidths } from "./media-variants.js";

describe("media variants", () => {
  it("uses suggested canonical widths and original fallback without upscale", () => {
    expect(variantWidths(900)).toEqual([320, 640, 900]);
    expect(variantWidths(4000)).toEqual([320, 640, 960, 1280, 1920]);
    expect(variantWidths(12)).toEqual([12]);
    expect(() => variantWidths(0)).toThrow();
  });
  it("encodes WebP/AVIF, shares smallest WebP as thumbnail and preserves aspect/original", async () => {
    const original = await sharp({
      create: { width: 400, height: 200, channels: 3, background: "#123456" },
    })
      .png()
      .toBuffer();
    const copy = Buffer.from(original);
    const objects: { key: string; bytes: Buffer; mime: string }[] = [];
    const upsert = vi.fn<MediaVariantRepository["upsert"]>();
    const id = randomUUID();
    await persistMediaVariants(
      id,
      original,
      { width: 400, height: 200 },
      {
        put: async (key, bytes, mime) => {
          objects.push({ key, bytes, mime });
          return { etag: "fixture", versionId: null };
        },
      },
      { upsert },
    );
    expect(objects).toHaveLength(4);
    expect(upsert).toHaveBeenCalledTimes(4);
    for (const object of objects) {
      const metadata = await sharp(object.bytes).metadata();
      expect([320, 400]).toContain(metadata.width);
      expect(metadata.height).toBe(metadata.width! / 2);
      expect(metadata.format).toBe(object.mime === "image/webp" ? "webp" : "heif");
      expect(object.key).toMatch(new RegExp(`^images/variants/${id}-(320|400)\\.(webp|avif)$`));
    }
    expect(original).toEqual(copy);
  });
  it("never upscales small images", async () => {
    const original = await sharp({
      create: { width: 12, height: 8, channels: 3, background: "#123456" },
    })
      .png()
      .toBuffer();
    const upsert = vi.fn<MediaVariantRepository["upsert"]>();
    await persistMediaVariants(
      randomUUID(),
      original,
      { width: 12, height: 8 },
      { put: vi.fn() },
      { upsert },
    );
    expect(upsert).toHaveBeenCalledTimes(2);
    for (const [value] of upsert.mock.calls) expect(value).toMatchObject({ width: 12, height: 8 });
  });
  it("does not store corrupt input or erase successful variants on transient persistence failure", async () => {
    const put = vi.fn();
    const upsert = vi.fn<MediaVariantRepository["upsert"]>();
    await expect(
      persistMediaVariants(
        randomUUID(),
        Buffer.from("invalid"),
        { width: 12, height: 8 },
        { put },
        { upsert },
      ),
    ).rejects.toBeInstanceOf(UnrecoverableError);
    expect(put).not.toHaveBeenCalled();
    const original = await sharp({
      create: { width: 12, height: 8, channels: 3, background: "#123456" },
    })
      .png()
      .toBuffer();
    put.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("secret fixture"));
    await expect(
      persistMediaVariants(randomUUID(), original, { width: 12, height: 8 }, { put }, { upsert }),
    ).rejects.toThrow("MEDIA_VARIANT_PERSISTENCE_UNAVAILABLE");
    expect(upsert).toHaveBeenCalledOnce();
  });
});
