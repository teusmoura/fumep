import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./client.js";
import { contentBlocks } from "./schema.js";
import { MediaUsageRepository } from "./media-usage.repository.js";
export type ContentBlockOwnerType = "PAGE" | "ARTICLE";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Internal only: caller resolves/authorizes the real parent in its outer transaction.
// Future writes must share the parent lock and recheck the live block before usages.
export class ContentBlockRepository {
  constructor(private readonly database: Pick<Database, "transaction">) {}
  deleteForOwner(ownerType: ContentBlockOwnerType, ownerId: string, id: string): Promise<boolean> {
    if (
      !["PAGE", "ARTICLE"].includes(ownerType) ||
      ![ownerId, id].every((value) => typeof value === "string" && uuid.test(value))
    )
      throw new Error("Invalid content block owner/reference");
    const parentId = ownerId.toLowerCase();
    const blockId = id.toLowerCase();
    return this.database.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`CONTENT_BLOCK_OWNER:${ownerType}`}), hashtext(${parentId}))`,
      );
      const where = and(
        eq(contentBlocks.id, blockId),
        eq(contentBlocks.ownerType, ownerType),
        eq(contentBlocks.ownerId, parentId),
      );
      const [block] = await tx
        .select({ id: contentBlocks.id })
        .from(contentBlocks)
        .where(where)
        .for("update");
      if (!block) return false;
      await new MediaUsageRepository(tx).removeEntity("CONTENT_BLOCK", blockId);
      const deleted = await tx
        .delete(contentBlocks)
        .where(where)
        .returning({ id: contentBlocks.id });
      return deleted.length === 1;
    });
  }
}
