import { eq } from "drizzle-orm";
import type { Database } from "./client.js";
import { auditLogs, media, mediaCategories, mediaUsages, type Media } from "./schema.js";
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Internal critical section, not a deletion endpoint or reusable authorization
// token. The lock is held through the operation, never returned as "can delete".
export class MediaDeletionGuard {
  constructor(private readonly database: Pick<Database, "transaction">) {}
  async withUnusedMedia<T>(
    id: string,
    userId: string,
    authorize: (institutionId: string | null) => void,
    operation: (tx: Transaction, value: Media) => Promise<T>,
  ) {
    if (!uuid.test(id) || !uuid.test(userId)) throw new Error("Invalid media deletion reference");
    return this.database.transaction(async (tx) => {
      const [value] = await tx.select().from(media).where(eq(media.id, id)).for("update");
      if (!value) return { status: "MISSING" } as const;
      const category = value.categoryId
        ? await tx.query.mediaCategories.findFirst({
            where: eq(mediaCategories.id, value.categoryId),
          })
        : undefined;
      authorize(category?.institutionId ?? null);
      const usages = await tx
        .select({ id: mediaUsages.id })
        .from(mediaUsages)
        .where(eq(mediaUsages.mediaId, id))
        .limit(1);
      const reason = usages.length
        ? "IN_USE"
        : value.processingStatus === "PROCESSING"
          ? "PROCESSING"
          : undefined;
      if (reason) {
        await tx.insert(auditLogs).values({
          userId,
          action: "MEDIA_DELETE_BLOCKED",
          entityType: "MEDIA",
          entityId: value.id,
          metadata: { reason },
        });
        // No foreign owner's ID/name/field is exposed by this guard.
        return { status: reason } as const;
      }
      return { status: "COMPLETED", result: await operation(tx, value) } as const;
    });
  }
}
