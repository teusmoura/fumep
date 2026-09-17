import type { OnModuleDestroy } from "@nestjs/common";
import {
  createDatabase,
  MediaRepository,
  MediaDeletionRepository,
  MediaCategoryRepository,
  InstitutionRepository,
  auditLogs,
  type NewMedia,
} from "@fumep/db";
import type {
  CreateMediaCategory,
  UpdateMediaCategory,
  MediaLibraryQuery,
} from "@fumep/validation";

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
  requestDeletion(
    id: string,
    userId: string,
    authorize: (institutionId: string | null) => void,
    retry = false,
  ) {
    return new MediaDeletionRepository(this.database()).request(id, userId, authorize, retry);
  }
  search(input: MediaLibraryQuery, institutionIds?: string[]) {
    return new MediaRepository(this.database()).search(input, institutionIds);
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
  async categoryInstitutions(institutionIds?: string[]) {
    const rows = await new InstitutionRepository(this.database()).findAll();
    return rows
      .filter((row) => !institutionIds || institutionIds.includes(row.id))
      .map(({ id, name }) => ({ id, name }));
  }
  createCategory(input: CreateMediaCategory, userId: string) {
    return this.database().transaction(async (tx) => {
      const row = await new MediaCategoryRepository(tx).create({ ...input, createdBy: userId });
      await tx.insert(auditLogs).values({
        userId,
        action: "MEDIA_CATEGORY_CREATED",
        entityType: "MEDIA_CATEGORY",
        entityId: row.id,
      });
      return row;
    });
  }
  mutateCategory(
    id: string,
    userId: string,
    authorize: (institutionId: string | null) => void,
    input?: UpdateMediaCategory,
  ) {
    return this.database().transaction(async (tx) => {
      const repository = new MediaCategoryRepository(tx);
      const category = await repository.lock(id);
      if (!category) return undefined;
      authorize(category.institutionId);
      const row = input ? await repository.update(id, input) : category;
      if (!input) await repository.delete(id);
      await tx.insert(auditLogs).values({
        userId,
        action: input ? "MEDIA_CATEGORY_UPDATED" : "MEDIA_CATEGORY_DELETED",
        entityType: "MEDIA_CATEGORY",
        entityId: id,
      });
      return row;
    });
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
