import { UnrecoverableError, type Job } from "@fumep/jobs";
import { processMediaPayloadSchema } from "@fumep/validation";

type MediaReference = { id: string; type: string; processingStatus: string };
export async function receiveMediaJob(
  job: Pick<Job, "id" | "name" | "data" | "attemptsMade">,
  lookup: (id: string) => Promise<MediaReference | undefined>,
  log: (entry: Record<string, unknown>) => void = (entry) => console.info(JSON.stringify(entry)),
) {
  const started = Date.now();
  const parsed = processMediaPayloadSchema.safeParse(job.data);
  const fields = {
    job_id:
      typeof job.id === "string" && /^process-media-[a-f0-9-]+$/.test(job.id) ? job.id : "invalid",
    queue: "media",
    job_type: "PROCESS_MEDIA",
    attempt: job.attemptsMade + 1,
    started_at: new Date(started).toISOString(),
  };
  try {
    if (job.name !== "PROCESS_MEDIA" || !parsed.success)
      throw new UnrecoverableError("INVALID_MEDIA_JOB");
    const media = await lookup(parsed.data.mediaId);
    if (!media || media.type !== "IMAGE")
      throw new UnrecoverableError("MEDIA_NOT_FOUND_OR_NOT_IMAGE");
    // Delivery checkpoint only in loop 4.7. Sharp/status transitions follow later.
    log({
      ...fields,
      status: "received",
      media_id: media.id,
      finished_at: new Date().toISOString(),
      duration: Date.now() - started,
    });
    return { received: true, mediaId: media.id };
  } catch (error) {
    const permanent = error instanceof UnrecoverableError;
    const summary = permanent ? error.message : "MEDIA_LOOKUP_UNAVAILABLE";
    log({
      ...fields,
      status: "failed",
      error_summary: summary,
      finished_at: new Date().toISOString(),
      duration: Date.now() - started,
    });
    if (permanent) throw error;
    throw new Error(summary);
  }
}
