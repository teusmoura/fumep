import sharp, { type OutputInfo } from "sharp";
import type { MediaStorage } from "@fumep/storage";
import type { MediaVariantRepository } from "@fumep/db";
import { UnrecoverableError } from "@fumep/jobs";
import type { ImageDimensions } from "./process-image.js";

export function variantWidths(originalWidth: number): number[] {
  if (!Number.isInteger(originalWidth) || originalWidth <= 0)
    throw new UnrecoverableError("INVALID_IMAGE_DIMENSIONS");
  return [
    ...new Set(
      [320, 640, 960, 1280, 1920]
        .filter((width) => width <= originalWidth)
        .concat(Math.min(originalWidth, 1920)),
    ),
  ].sort((a, b) => a - b);
}

export async function persistMediaVariants(
  mediaId: string,
  original: Buffer,
  dimensions: ImageDimensions,
  storage: Pick<MediaStorage, "put">,
  repository: Pick<MediaVariantRepository, "upsert">,
): Promise<void> {
  if (!/^[a-f0-9-]{36}$/.test(mediaId)) throw new UnrecoverableError("INVALID_MEDIA_ID");
  // Smallest WEBP (<=320 px) is also the thumbnail; do not duplicate its row/object.
  for (const width of variantWidths(dimensions.width)) {
    for (const format of ["WEBP", "AVIF"] as const) {
      let output: { data: Buffer; info: OutputInfo };
      try {
        const image = sharp(original, { failOn: "warning", limitInputPixels: 100000000 })
          .autoOrient()
          .resize({ width, withoutEnlargement: true })
          .toColourspace("srgb")
          .timeout({ seconds: 30 });
        output = await (
          format === "WEBP" ? image.webp({ quality: 80 }) : image.avif({ quality: 50, effort: 4 })
        ).toBuffer({ resolveWithObject: true });
        if (output.info.width > dimensions.width || output.info.height > dimensions.height)
          throw new Error("Upscale prohibited");
      } catch {
        throw new UnrecoverableError("MEDIA_VARIANT_ENCODING_FAILED");
      }
      const storageKey = `images/variants/${mediaId}-${output.info.width}.${format.toLowerCase()}`;
      try {
        await storage.put(storageKey, output.data, format === "WEBP" ? "image/webp" : "image/avif");
        await repository.upsert({
          mediaId,
          format,
          width: output.info.width,
          height: output.info.height,
          sizeBytes: BigInt(output.data.length),
          storageKey,
        });
      } catch {
        throw new Error("MEDIA_VARIANT_PERSISTENCE_UNAVAILABLE");
      }
    }
  }
}
