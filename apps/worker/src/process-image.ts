import { createHash } from "node:crypto";
import sharp from "sharp";
import { UnrecoverableError } from "@fumep/jobs";
import { IMAGE_MAX_BYTES } from "@fumep/validation";
import { MediaStorage, StorageLimitError } from "@fumep/storage";
import type { Media } from "@fumep/db";

export type ImageDimensions = { width: number; height: number };
export async function decodeImage(
  original: Buffer,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ImageDimensions> {
  if (!original.length || original.length > IMAGE_MAX_BYTES)
    throw new UnrecoverableError("INVALID_ORIGINAL_SIZE");
  const limitInputPixels = Number(env.MEDIA_IMAGE_MAX_PIXELS ?? 40000000);
  if (
    !Number.isSafeInteger(limitInputPixels) ||
    limitInputPixels <= 0 ||
    limitInputPixels > 100000000
  )
    throw new Error("Invalid MEDIA_IMAGE_MAX_PIXELS");
  try {
    const image = sharp(original, {
      failOn: "warning",
      limitInputPixels,
      sequentialRead: true,
    }).timeout({ seconds: 30 });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp", "heif"].includes(metadata.format ?? ""))
      throw new Error("Unsupported image");
    // Stats decodes all pixels, without allocating a full raw output buffer.
    await image.clone().stats();
    const dimensions = metadata.autoOrient;
    if (!dimensions.width || !dimensions.height) throw new Error("Missing dimensions");
    return { width: dimensions.width, height: dimensions.height };
  } catch {
    throw new UnrecoverableError("INVALID_OR_UNSAFE_IMAGE");
  }
}

export async function processImage(
  media: Media,
  storage: Pick<MediaStorage, "read">,
  saveDimensions: (id: string, width: number, height: number) => Promise<Media | undefined>,
): Promise<ImageDimensions> {
  if (
    media.type !== "IMAGE" ||
    !/^images\/originals\/[a-f0-9-]+\.(jpg|jpeg|png|webp|avif)$/.test(media.storageKey)
  )
    throw new UnrecoverableError("INVALID_MEDIA_ORIGINAL_REFERENCE");
  let original: Buffer;
  try {
    original = await storage.read(media.storageKey, IMAGE_MAX_BYTES);
  } catch (error) {
    if (error instanceof StorageLimitError) throw new UnrecoverableError("INVALID_ORIGINAL_SIZE");
    throw new Error("MEDIA_STORAGE_UNAVAILABLE");
  }
  if (
    BigInt(original.length) !== media.sizeBytes ||
    createHash("sha256").update(original).digest("hex") !== media.checksumSha256
  )
    throw new UnrecoverableError("MEDIA_INTEGRITY_MISMATCH");
  const dimensions = await decodeImage(original);
  if (!(await saveDimensions(media.id, dimensions.width, dimensions.height)))
    throw new UnrecoverableError("MEDIA_NO_LONGER_EXISTS");
  return dimensions;
}
