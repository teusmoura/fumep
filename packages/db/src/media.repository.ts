import { eq } from "drizzle-orm";
import type { Database } from "./client.js";
import { media, type Media, type NewMedia } from "./schema.js";

export class MediaRepository {
  constructor(private readonly database: Database) {}
  async create(input: NewMedia): Promise<Media> {
    const [created] = await this.database.insert(media).values(input).returning();
    if (!created) throw new Error("Media was not created");
    return created;
  }
  async findById(id: string): Promise<Media | undefined> {
    return this.database.query.media.findFirst({ where: eq(media.id, id) });
  }
}
