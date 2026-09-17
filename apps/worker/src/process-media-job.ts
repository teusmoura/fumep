import { UnrecoverableError, type Job } from "@fumep/jobs";
import {
  safeMediaProcessingError,
  type Media,
  type MediaRepository,
  type MediaProcessingRepository,
  type MediaVariantRepository,
} from "@fumep/db";
import type { MediaStorage } from "@fumep/storage";
import { receiveMediaJob } from "./receive-media.js";
import { processImage } from "./process-image.js";
import { persistMediaVariants } from "./media-variants.js";

type JobReference = Pick<Job, "id" | "name" | "data" | "attemptsMade" | "opts">;
export async function processMediaJob(
  job: JobReference,
  repository: Pick<MediaRepository, "findById" | "updateDimensions">,
  states: Pick<MediaProcessingRepository, "start" | "ready" | "failed">,
  variants: Pick<MediaVariantRepository, "upsert">,
  storage: Pick<MediaStorage, "read" | "put">,
  log?: (entry: Record<string, unknown>) => void,
) {
  function dimensions(media: Media) {
    if (!media.width || !media.height) throw new UnrecoverableError("INVALID_IMAGE_DIMENSIONS");
    return { width: media.width, height: media.height };
  }
  return receiveMediaJob(
    job,
    (id) => repository.findById(id),
    log,
    async (media) => {
      if (media.deletionStatus !== "NONE") throw new UnrecoverableError("MEDIA_NO_LONGER_EXISTS");
      if (media.processingStatus === "READY") return dimensions(media);
      const started = await states.start(media.id);
      if (!started) {
        const current = await repository.findById(media.id);
        if (current?.processingStatus === "READY") return dimensions(current);
        throw new UnrecoverableError("MEDIA_NO_LONGER_EXISTS");
      }
      try {
        const result = await processImage(
          started,
          storage,
          (id, width, height) => repository.updateDimensions(id, width, height),
          (bytes, size) => persistMediaVariants(media.id, bytes, size, storage, variants),
        );
        const ready = await states.ready(media.id);
        if (!ready && (await repository.findById(media.id))?.processingStatus !== "READY")
          throw new Error("MEDIA_READY_PERSISTENCE_UNAVAILABLE");
        return result;
      } catch (error) {
        const permanent = error instanceof UnrecoverableError;
        const lastAttempt = job.attemptsMade + 1 >= Math.max(job.opts.attempts ?? 1, 1);
        if (permanent || lastAttempt)
          await states.failed(
            media.id,
            safeMediaProcessingError(permanent ? error.message : "MEDIA_PROCESSING_UNAVAILABLE"),
          );
        throw error;
      }
    },
  );
}
