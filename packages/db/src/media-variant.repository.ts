import { asc, eq } from "drizzle-orm";
import type { Database } from "./client.js";
import { mediaVariants, type NewMediaVariant, type MediaVariant } from "./schema.js";

export class MediaVariantRepository {
  constructor(private readonly database: Pick<Database, "insert" | "query">) {}
  async upsert(input: NewMediaVariant & { width: number; height: number }): Promise<MediaVariant> {
    const [result] = await this.database
      .insert(mediaVariants)
      .values(input)
      .onConflictDoUpdate({
        target: [mediaVariants.mediaId, mediaVariants.format, mediaVariants.width],
        set: { height: input.height, sizeBytes: input.sizeBytes, storageKey: input.storageKey },
      })
      .returning();
    if (!result) throw new Error("MediaVariant was not persisted");
    return result;
  }
  async findForMedia(mediaId: string): Promise<MediaVariant[]> {
    return this.database.query.mediaVariants.findMany({
      where: eq(mediaVariants.mediaId, mediaId),
      orderBy: [asc(mediaVariants.width), asc(mediaVariants.format)],
    });
  }
}
