import { eq, inArray } from "drizzle-orm";
import type { Database } from "./client.js";
import { mediaCategories, type NewMediaCategory } from "./schema.js";

export class MediaCategoryRepository {
  constructor(private readonly database: Database) {}
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
