import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { Database } from "./client.js";
import { media, mediaCategories, type Media, type NewMedia } from "./schema.js";

export class MediaRepository {
  async search(
    input: { q?: string; categoryId?: string; page: number; limit: number },
    institutionIds?: string[],
  ) {
    if (
      !Number.isInteger(input.page) ||
      input.page < 1 ||
      input.page > 10000 ||
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 100
    )
      throw new Error("Invalid media pagination");
    if (institutionIds?.length === 0) return { items: [], total: 0 };
    const term = input.q ? `%${input.q.replace(/[\\%_]/g, "\\$&")}%` : undefined;
    const filter = and(
      inArray(media.type, ["IMAGE", "DOCUMENT"]),
      institutionIds ? inArray(mediaCategories.institutionId, institutionIds) : undefined,
      input.categoryId ? eq(media.categoryId, input.categoryId) : undefined,
      term
        ? or(
            ilike(media.originalFilename, term),
            ilike(media.altText, term),
            ilike(media.caption, term),
            ilike(mediaCategories.name, term),
          )
        : undefined,
    );
    const [items, totals] = await Promise.all([
      this.database
        .select({ media, categoryName: mediaCategories.name })
        .from(media)
        .leftJoin(mediaCategories, eq(media.categoryId, mediaCategories.id))
        .where(filter)
        .orderBy(desc(media.createdAt), asc(media.id))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit),
      this.database
        .select({ total: count() })
        .from(media)
        .leftJoin(mediaCategories, eq(media.categoryId, mediaCategories.id))
        .where(filter),
    ]);
    return { items, total: totals[0]?.total ?? 0 };
  }
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
  async findDuplicate(
    checksum: string,
    institutionIds?: string[],
    type: "IMAGE" | "DOCUMENT" = "IMAGE",
  ): Promise<Media | undefined> {
    if (institutionIds?.length === 0) return undefined;
    const [result] = await this.database
      .select({ media })
      .from(media)
      .leftJoin(mediaCategories, eq(media.categoryId, mediaCategories.id))
      .where(
        and(
          eq(media.checksumSha256, checksum),
          eq(media.type, type),
          institutionIds ? inArray(mediaCategories.institutionId, institutionIds) : undefined,
        ),
      )
      .orderBy(asc(media.createdAt), asc(media.id))
      .limit(1);
    return result?.media;
  }
}
