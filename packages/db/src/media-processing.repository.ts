import { and, eq, gt, inArray } from "drizzle-orm";
import type { Database } from "./client.js";
import { media, auditLogs, type Media } from "./schema.js";

const safeErrors = new Set([
  "INVALID_ORIGINAL_SIZE",
  "INVALID_MEDIA_ORIGINAL_REFERENCE",
  "MEDIA_INTEGRITY_MISMATCH",
  "INVALID_OR_UNSAFE_IMAGE",
  "MEDIA_NO_LONGER_EXISTS",
  "MEDIA_VARIANT_ENCODING_FAILED",
  "INVALID_IMAGE_DIMENSIONS",
  "INVALID_MEDIA_ID",
  "MEDIA_PROCESSING_UNAVAILABLE",
]);
export function safeMediaProcessingError(value: string): string {
  return safeErrors.has(value) ? value : "MEDIA_PROCESSING_UNAVAILABLE";
}
export class MediaProcessingRepository {
  constructor(private readonly database: Pick<Database, "update" | "transaction">) {}
  async start(id: string): Promise<Media | undefined> {
    const [row] = await this.database
      .update(media)
      .set({ processingStatus: "PROCESSING", processingError: null })
      .where(
        and(
          eq(media.id, id),
          eq(media.type, "IMAGE"),
          eq(media.deletionStatus, "NONE"),
          inArray(media.processingStatus, ["PENDING", "PROCESSING", "FAILED"]),
        ),
      )
      .returning();
    return row;
  }
  async ready(id: string): Promise<Media | undefined> {
    const [row] = await this.database
      .update(media)
      .set({ processingStatus: "READY", processingError: null })
      .where(
        and(
          eq(media.id, id),
          eq(media.type, "IMAGE"),
          eq(media.processingStatus, "PROCESSING"),
          eq(media.deletionStatus, "NONE"),
          gt(media.width, 0),
          gt(media.height, 0),
        ),
      )
      .returning();
    return row;
  }
  async failed(id: string, error: string): Promise<Media | undefined> {
    const summary = safeMediaProcessingError(error);
    return this.database.transaction(async (tx) => {
      const [row] = await tx
        .update(media)
        .set({ processingStatus: "FAILED", processingError: summary })
        .where(
          and(
            eq(media.id, id),
            eq(media.type, "IMAGE"),
            eq(media.processingStatus, "PROCESSING"),
            eq(media.deletionStatus, "NONE"),
          ),
        )
        .returning();
      if (row)
        await tx.insert(auditLogs).values({
          userId: null,
          action: "MEDIA_PROCESSING_FAILED",
          entityType: "MEDIA",
          entityId: id,
          metadata: { error: summary },
        });
      return row;
    });
  }
}
