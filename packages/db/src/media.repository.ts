import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "./client.js";
import { media, mediaCategories, type Media, type NewMedia } from "./schema.js";

export class MediaRepository {
  constructor(
    private readonly database: Pick<Database, "insert" | "query" | "select" | "update">,
  ) {}
  async updateDimensions(id: string, width: number, height: number): Promise<Media | undefined> {
    if (
      ![width, height].every((value) => Number.isInteger(value) && value > 0 && value <= 2147483647)
    )
      throw new Error("Invalid media dimensions");
    const [updated] = await this.database
      .update(media)
      .set({ width, height })
      .where(and(eq(media.id, id), eq(media.type, "IMAGE")))
      .returning();
    return updated;
  }
  async create(input: NewMedia): Promise<Media> {
    const [created] = await this.database.insert(media).values(input).returning();
    if (!created) throw new Error("Media was not created");
    return created;
  }
  async findById(id: string): Promise<Media | undefined> {
    return this.database.query.media.findFirst({ where: eq(media.id, id) });
  }
  async findDuplicate(checksum: string, institutionIds?: string[]): Promise<Media | undefined> {
    if (institutionIds?.length === 0) return undefined;
    const [result] = await this.database
      .select({ media })
      .from(media)
      .leftJoin(mediaCategories, eq(media.categoryId, mediaCategories.id))
      .where(
        and(
          eq(media.checksumSha256, checksum),
          eq(media.type, "IMAGE"),
          institutionIds ? inArray(mediaCategories.institutionId, institutionIds) : undefined,
        ),
      )
      .orderBy(asc(media.createdAt), asc(media.id))
      .limit(1);
    return result?.media;
  }
}
