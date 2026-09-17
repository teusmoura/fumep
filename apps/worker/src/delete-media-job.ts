import { withMediaDeletionLock, type createDatabase } from "@fumep/db";
import { deleteMediaPayloadSchema } from "@fumep/validation";
import { UnrecoverableError, type Job } from "@fumep/jobs";
import type { MediaStorage } from "@fumep/storage";

type Client = ReturnType<typeof createDatabase>["client"];
export async function deleteMediaJob(
  job: Pick<Job, "id" | "name" | "data" | "attemptsMade">,
  client: Client,
  storage: Pick<MediaStorage, "remove">,
  log: (entry: Record<string, unknown>) => void = (entry) => console.info(JSON.stringify(entry)),
) {
  const parsed = deleteMediaPayloadSchema.safeParse(job.data);
  if (job.name !== "DELETE_MEDIA" || !parsed.success)
    throw new UnrecoverableError("INVALID_MEDIA_DELETE_JOB");
  const id = parsed.data.mediaId.toLowerCase();
  const started = Date.now();
  const fields = {
    job_id: job.id === `delete-media-${id}` ? job.id : "invalid",
    queue: "media",
    job_type: "DELETE_MEDIA",
    media_id: id,
    attempt: job.attemptsMade + 1,
    started_at: new Date(started).toISOString(),
  };
  try {
    await withMediaDeletionLock(client, id, async (repository) => {
      if (!(await repository.reserveAttempt(id))) return;
      try {
        await repository.cleanup(id, async (key) => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            // An I/O timeout never restores selectability. Late idempotent removal is safe
            // while the durable intent remains unavailable; retries use the same keys.
            await Promise.race([
              storage.remove(key),
              new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error("STORAGE_UNAVAILABLE")), 15000);
              }),
            ]);
          } finally {
            if (timer) clearTimeout(timer);
          }
        });
      } catch {
        await repository.failedAttempt(id);
        throw new Error("MEDIA_DELETE_UNAVAILABLE");
      }
    });
    log({
      ...fields,
      event: "media_delete_finished",
      status: "finished",
      finished_at: new Date().toISOString(),
      duration: Date.now() - started,
    });
  } catch {
    log({
      ...fields,
      event: "media_delete_failed",
      status: "failed",
      finished_at: new Date().toISOString(),
      duration: Date.now() - started,
      error_summary: "MEDIA_DELETE_UNAVAILABLE",
    });
    throw new Error("MEDIA_DELETE_UNAVAILABLE");
  }
}
