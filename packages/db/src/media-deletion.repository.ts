import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { createDatabase, createPinnedDatabaseClient, type Database } from "./client.js";
import * as schema from "./schema.js";
import { auditLogs, media, mediaUsages, mediaVariants, type Media } from "./schema.js";
import { MediaDeletionGuard } from "./media-deletion.guard.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type ErrorCode =
  "STORAGE_UNAVAILABLE" | "USAGE_CONFLICT" | "PROCESSING_CONFLICT" | "RETRY_EXHAUSTED";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type DeletionCursor = { requestedAt: Date; id: string };

export class MediaDeletionRepository {
  constructor(private readonly database: Pick<Database, "transaction" | "select" | "query">) {}

  async request(
    id: string,
    userId: string,
    authorize: (institutionId: string | null) => void,
    retry = false,
  ) {
    const result = await new MediaDeletionGuard(this.database).withUnusedMedia(
      id,
      userId,
      authorize,
      async (tx, value) => {
        if (retry ? value.deletionStatus !== "FAILED" : value.deletionStatus === "FAILED")
          return "INVALID_STATE" as const;
        if (!retry && value.deletionStatus === "REQUESTED") return "REQUESTED" as const;
        await tx
          .update(media)
          .set({
            deletionStatus: "REQUESTED",
            deletionRequestedAt: sql`now()`,
            deletionRequestedBy: userId,
            deletionAttempts: 0,
            deletionLastAttemptAt: null,
            deletionErrorCode: null,
          })
          .where(eq(media.id, value.id));
        await tx.insert(auditLogs).values({
          userId,
          action: retry ? "MEDIA_DELETE_RETRY_REQUESTED" : "MEDIA_DELETE_REQUESTED",
          entityType: "MEDIA",
          entityId: value.id,
        });
        return "REQUESTED" as const;
      },
    );
    return result.status === "COMPLETED" ? result.result : result.status;
  }

  async pending(cursor?: DeletionCursor) {
    return this.database
      .select({ id: media.id, requestedAt: media.deletionRequestedAt })
      .from(media)
      .where(
        and(
          eq(media.deletionStatus, "REQUESTED"),
          cursor
            ? or(
                gt(media.deletionRequestedAt, cursor.requestedAt),
                and(eq(media.deletionRequestedAt, cursor.requestedAt), gt(media.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(asc(media.deletionRequestedAt), asc(media.id))
      .limit(100);
  }

  current(id: string) {
    return this.database.query.media.findFirst({ where: eq(media.id, id) });
  }

  private async fail(tx: Transaction, value: Media, code: ErrorCode) {
    await tx
      .update(media)
      .set({ deletionStatus: "FAILED", deletionErrorCode: code })
      .where(eq(media.id, value.id));
    await tx.insert(auditLogs).values({
      userId: value.deletionRequestedBy,
      action: "MEDIA_DELETE_FAILED",
      entityType: "MEDIA",
      entityId: value.id,
      metadata: { error: code },
    });
  }

  async exhausted(id: string) {
    return this.database.transaction(async (tx) => {
      const [value] = await tx.select().from(media).where(eq(media.id, id)).for("update");
      if (value?.deletionStatus === "REQUESTED" && value.deletionAttempts >= 3)
        await this.fail(tx, value, "RETRY_EXHAUSTED");
    });
  }

  // Called exclusively under the pinned advisory lock. Reservation commits before I/O.
  async reserveAttempt(id: string) {
    return this.database.transaction(async (tx) => {
      const [value] = await tx.select().from(media).where(eq(media.id, id)).for("update");
      if (!value || value.deletionStatus !== "REQUESTED") return false;
      if (value.deletionAttempts >= 3) {
        await this.fail(tx, value, "RETRY_EXHAUSTED");
        return false;
      }
      await tx
        .update(media)
        .set({ deletionAttempts: value.deletionAttempts + 1, deletionLastAttemptAt: sql`now()` })
        .where(eq(media.id, id));
      return true;
    });
  }

  async cleanup(id: string, remove: (key: string) => Promise<void>) {
    return this.database.transaction(async (tx) => {
      const [value] = await tx.select().from(media).where(eq(media.id, id)).for("update");
      if (!value || value.deletionStatus !== "REQUESTED") return;
      const [usage] = await tx
        .select({ id: mediaUsages.id })
        .from(mediaUsages)
        .where(eq(mediaUsages.mediaId, id))
        .limit(1);
      if (usage || value.processingStatus === "PROCESSING") {
        await this.fail(tx, value, usage ? "USAGE_CONFLICT" : "PROCESSING_CONFLICT");
        return;
      }
      const variants = await tx.select().from(mediaVariants).where(eq(mediaVariants.mediaId, id));
      // Validate the complete set before touching any object; reject foreign/traversal keys.
      const originalPattern = new RegExp(
        `^(images/originals/${id}\\.(png|jpg|jpeg|webp|avif)|documents/${id}\\.pdf)$`,
      );
      const variantPattern = new RegExp(`^images/variants/${id}-[1-9][0-9]*\\.(webp|avif)$`);
      if (
        !originalPattern.test(value.storageKey) ||
        variants.some((row) => !variantPattern.test(row.storageKey))
      )
        throw new Error("STORAGE_UNAVAILABLE");
      for (const key of new Set(variants.map((row) => row.storageKey))) await remove(key);
      await remove(value.storageKey);
      await tx.delete(media).where(eq(media.id, id));
      await tx.insert(auditLogs).values({
        userId: value.deletionRequestedBy,
        action: "MEDIA_DELETED",
        entityType: "MEDIA",
        entityId: id,
      });
    });
  }

  async failedAttempt(id: string) {
    return this.database.transaction(async (tx) => {
      const [value] = await tx.select().from(media).where(eq(media.id, id)).for("update");
      if (value?.deletionStatus !== "REQUESTED") return;
      if (value.deletionAttempts >= 3) await this.fail(tx, value, "STORAGE_UNAVAILABLE");
      else
        await tx
          .update(media)
          .set({ deletionErrorCode: "STORAGE_UNAVAILABLE" })
          .where(eq(media.id, id));
    });
  }
}

// Both executor and reconciler use this function. Never return a session lock to the pool.
export async function withMediaDeletionLock<T>(
  client: ReturnType<typeof createDatabase>["client"],
  id: string,
  operation: (repository: MediaDeletionRepository) => Promise<T>,
  tryOnly = false,
) {
  if (!uuid.test(id)) throw new Error("Invalid media deletion reference");
  const normalized = id.toLowerCase();
  // ReservedSql does not implement options/begin at runtime. A private max=1
  // client pins the only physical connection across transactions, with no
  // idle/lifetime recycling, and is destroyed instead of returned to a pool.
  const connection = createPinnedDatabaseClient(client);
  let locked = false;
  try {
    if (tryOnly) {
      const [row] = await connection<
        { locked: boolean }[]
      >`SELECT pg_try_advisory_lock(hashtext('MEDIA_DELETE'),hashtext(${normalized})) AS locked`;
      locked = !!row?.locked;
      if (!locked) return undefined;
    } else {
      await connection`SELECT pg_advisory_lock(hashtext('MEDIA_DELETE'),hashtext(${normalized}))`;
      locked = true;
    }
    return await operation(new MediaDeletionRepository(drizzle(connection, { schema })));
  } finally {
    try {
      if (locked)
        await connection`SELECT pg_advisory_unlock(hashtext('MEDIA_DELETE'),hashtext(${normalized}))`;
    } finally {
      await connection.end({ timeout: 5 });
    }
  }
}
