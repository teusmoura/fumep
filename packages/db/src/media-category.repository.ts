import { eq, inArray, sql } from "drizzle-orm";
import type { Database } from "./client.js";
import { mediaCategories, type NewMediaCategory } from "./schema.js";

export class MediaCategoryRepository {
  constructor(
    private readonly database: Pick<Database, "insert" | "query" | "select" | "update" | "delete">,
  ) {}
  async lock(id: string) {
    const [row] = await this.database
      .select()
      .from(mediaCategories)
      .where(eq(mediaCategories.id, id))
      .for("update");
    return row;
  }
  async update(id: string, input: Pick<NewMediaCategory, "name" | "slug">) {
    const [row] = await this.database
      .update(mediaCategories)
      .set({ name: input.name, slug: input.slug, updatedAt: sql`now()` })
      .where(eq(mediaCategories.id, id))
      .returning();
    return row;
  }
  async delete(id: string) {
    const rows = await this.database
      .delete(mediaCategories)
      .where(eq(mediaCategories.id, id))
      .returning();
    return rows.length === 1;
  }
  findById(id: string) {
    return this.database.query.mediaCategories.findFirst({ where: eq(mediaCategories.id, id) });
  }
  findForInstitutions(institutionIds?: string[]) {
    if (institutionIds?.length === 0) return Promise.resolve([]);
    return this.database
      .select()
      .from(mediaCategories)
      .where(institutionIds ? inArray(mediaCategories.institutionId, institutionIds) : undefined)
      .orderBy(mediaCategories.name);
  }
  async create(input: NewMediaCategory) {
    const [result] = await this.database.insert(mediaCategories).values(input).returning();
    if (!result) throw new Error("Media category was not created");
    return result;
  }
}
