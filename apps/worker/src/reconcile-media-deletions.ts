import {
  MediaDeletionRepository,
  withMediaDeletionLock,
  type createDatabase,
  type DeletionCursor,
} from "@fumep/db";
import type { MediaQueue } from "@fumep/jobs";
type Connection = ReturnType<typeof createDatabase>;

export class MediaDeletionReconciler {
  private cursor?: DeletionCursor;
  private running?: Promise<void>;
  private timer?: ReturnType<typeof setInterval>;
  private stopped = false;
  constructor(
    private readonly connection: Connection,
    private readonly queue: Pick<MediaQueue, "deletionState" | "reconcileDeletion">,
    private readonly log: (entry: Record<string, unknown>) => void = (entry) =>
      console.error(JSON.stringify(entry)),
  ) {}

  scan(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.perform()
      .catch(() => {
        this.log({
          event: "media_delete_reconcile_failed",
          error_summary: "DEPENDENCY_UNAVAILABLE",
        });
      })
      .finally(() => {
        this.running = undefined;
      });
    return this.running;
  }
  private async perform() {
    const rows = await new MediaDeletionRepository(this.connection.db).pending(this.cursor);
    if (!rows.length) {
      this.cursor = undefined;
      return;
    }
    for (const row of rows) {
      if (this.stopped) break;
      this.cursor = { id: row.id, requestedAt: row.requestedAt! };
      try {
        await withMediaDeletionLock(
          this.connection.client,
          row.id,
          async (repository) => {
            const current = await repository.current(row.id);
            if (current?.deletionStatus !== "REQUESTED") return;
            const state = await this.queue.deletionState(row.id);
            if (!["completed", "failed", "unknown", "missing"].includes(state)) return;
            if (current.deletionAttempts >= 3) await repository.exhausted(row.id);
            else await this.queue.reconcileDeletion(row.id);
          },
          true,
        );
      } catch {
        this.log({
          event: "media_delete_reconcile_failed",
          media_id: row.id,
          error_summary: "DEPENDENCY_UNAVAILABLE",
        });
      }
    }
    if (rows.length < 100) this.cursor = undefined;
  }
  start() {
    if (this.timer || this.stopped) return;
    this.timer = setInterval(() => {
      void this.scan();
    }, 60000);
    void this.scan();
  }
  async close() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
}
