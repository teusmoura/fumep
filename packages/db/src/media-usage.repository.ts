import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "./client.js";
import { media, mediaUsages } from "./schema.js";

export interface MediaReference {
  mediaId: string;
  fieldName: string;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateOwner(entityType: string, entityId: string) {
  if (!/^[A-Z][A-Z0-9_]{0,49}$/.test(entityType) || !uuid.test(entityId))
    throw new Error("Invalid media usage owner");
}
// Internal only: the consumer must resolve/authorize and write the real owner
// in the same outer transaction. A tuple supplied by a browser is not authority.
export class MediaUsageRepository {
  constructor(private readonly database: Pick<Database, "transaction" | "select">) {}
  async synchronize(entityType: string, entityId: string, references: MediaReference[]) {
    validateOwner(entityType, entityId);
    const ownerId = entityId.toLowerCase();
    const unique = new Map<string, MediaReference>();
    for (const reference of references) {
      if (
        !uuid.test(reference.mediaId) ||
        !reference.fieldName.trim() ||
        reference.fieldName.length > 100 ||
        /[\x00-\x1f\x7f]/.test(reference.fieldName)
      )
        throw new Error("Invalid media usage reference");
      const row = { mediaId: reference.mediaId.toLowerCase(), fieldName: reference.fieldName };
      unique.set(`${row.mediaId}/${row.fieldName}`, row);
    }
    return this.database.transaction(async (tx) => {
      // Serializes updates of one polymorphic owner even before its first usage.
      // Hash collisions only cause harmless additional serialization.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${entityType}), hashtext(${ownerId}))`,
      );
      const ids = [...new Set([...unique.values()].map((row) => row.mediaId))].sort();
      if (ids.length) {
        const found = await tx
          .select({ id: media.id, deletionStatus: media.deletionStatus })
          .from(media)
          .where(inArray(media.id, ids))
          .orderBy(asc(media.id))
          .for("update");
        if (found.length !== ids.length) throw new Error("Referenced media does not exist");
        if (found.some((row) => row.deletionStatus !== "NONE"))
          throw new Error("Referenced media is unavailable for use");
      }
      const owner = and(eq(mediaUsages.entityType, entityType), eq(mediaUsages.entityId, ownerId));
      const previous = await tx.select().from(mediaUsages).where(owner);
      const stale = previous
        .filter((row) => !unique.has(`${row.mediaId}/${row.fieldName}`))
        .map((row) => row.id);
      if (stale.length) await tx.delete(mediaUsages).where(inArray(mediaUsages.id, stale));
      if (unique.size)
        await tx
          .insert(mediaUsages)
          .values([...unique.values()].map((row) => ({ ...row, entityType, entityId: ownerId })))
          .onConflictDoNothing();
      return tx
        .select()
        .from(mediaUsages)
        .where(owner)
        .orderBy(asc(mediaUsages.fieldName), asc(mediaUsages.mediaId));
    });
  }
  findForMedia(mediaId: string) {
    if (!uuid.test(mediaId)) throw new Error("Invalid media reference");
    return this.database
      .select()
      .from(mediaUsages)
      .where(eq(mediaUsages.mediaId, mediaId))
      .orderBy(asc(mediaUsages.entityType), asc(mediaUsages.entityId), asc(mediaUsages.fieldName));
  }
  async hasUsage(mediaId: string) {
    if (!uuid.test(mediaId)) throw new Error("Invalid media reference");
    const rows = await this.database
      .select({ id: mediaUsages.id })
      .from(mediaUsages)
      .where(eq(mediaUsages.mediaId, mediaId))
      .limit(1);
    return rows.length > 0;
  }
  removeEntity(entityType: string, entityId: string) {
    return this.synchronize(entityType, entityId, []);
  }
}
