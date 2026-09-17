import type { OnModuleDestroy } from "@nestjs/common";
import {
  createDatabase,
  MediaRepository,
  MediaCategoryRepository,
  InstitutionRepository,
  auditLogs,
  type NewMedia,
} from "@fumep/db";
import type { CreateMediaCategory } from "@fumep/validation";

export class MediaStore implements OnModuleDestroy {
  private connection?: ReturnType<typeof createDatabase>;
  private database() {
    if (!this.connection) {
      if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
      this.connection = createDatabase(process.env.DATABASE_URL);
    }
    return this.connection.db;
  }
  category(id: string) {
    return new MediaCategoryRepository(this.database()).findById(id);
  }
  media(id: string) {
    return new MediaRepository(this.database()).findById(id);
  }
  duplicate(checksum: string, institutions?: string[], type: "IMAGE" | "DOCUMENT" = "IMAGE") {
    return new MediaRepository(this.database()).findDuplicate(checksum, institutions, type);
  }
  recordDuplicate(userId: string, mediaId: string) {
    return this.database().insert(auditLogs).values({
      userId,
      action: "MEDIA_DUPLICATE_DETECTED",
      entityType: "MEDIA",
      entityId: mediaId,
    });
  }
  categories(institutions?: string[]) {
    return new MediaCategoryRepository(this.database()).findForInstitutions(institutions);
  }
  institution(id: string) {
    return new InstitutionRepository(this.database()).findById(id);
  }
  createCategory(input: CreateMediaCategory, userId: string) {
    return new MediaCategoryRepository(this.database()).create({ ...input, createdBy: userId });
  }
  create(input: NewMedia) {
    return this.database().transaction(async (tx) => {
      const result = await new MediaRepository(tx).create(input);
      await tx.insert(auditLogs).values({
        userId: input.uploadedBy,
        action: "MEDIA_UPLOADED",
        entityType: "MEDIA",
        entityId: result.id,
        metadata: { categoryId: result.categoryId },
      });
      return result;
    });
  }
  async onModuleDestroy() {
    await this.connection?.client.end();
  }
}
