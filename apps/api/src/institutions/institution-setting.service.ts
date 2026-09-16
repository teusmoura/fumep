import { Inject, Injectable, NotFoundException, type OnModuleDestroy } from "@nestjs/common";
import {
  createDatabase,
  InstitutionSettingRepository,
  type InstitutionSetting,
  type UpdateInstitutionSettingInput,
} from "@fumep/db";
import type { UpdateInstitutionSettingRequest } from "@fumep/validation";
import { InstitutionService } from "./institution.service.js";
export const INSTITUTION_SETTING_REPOSITORY = Symbol("INSTITUTION_SETTING_REPOSITORY");
export interface InstitutionSettingStore {
  findByInstitutionId(id: string): Promise<InstitutionSetting | undefined>;
  upsert(id: string, input: UpdateInstitutionSettingInput): Promise<InstitutionSetting>;
}
export class LazyInstitutionSettingRepository implements InstitutionSettingStore, OnModuleDestroy {
  private connection?: ReturnType<typeof createDatabase>;
  private repository() {
    if (!this.connection) {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL is required");
      this.connection = createDatabase(url);
    }
    return new InstitutionSettingRepository(this.connection.db);
  }
  findByInstitutionId(id: string) {
    return this.repository().findByInstitutionId(id);
  }
  upsert(id: string, input: UpdateInstitutionSettingInput) {
    return this.repository().upsert(id, input);
  }
  async onModuleDestroy() {
    if (this.connection) await this.connection.client.end();
  }
}
@Injectable()
export class InstitutionSettingService {
  constructor(
    private readonly institutions: InstitutionService,
    @Inject(INSTITUTION_SETTING_REPOSITORY) private readonly settings: InstitutionSettingStore,
  ) {}
  private project(row: InstitutionSetting) {
    const { contactEmail, ...rest } = row;
    return { ...rest, email: contactEmail };
  }
  async get(id: string) {
    await this.institutions.get(id);
    const row = await this.settings.findByInstitutionId(id);
    if (!row) throw new NotFoundException("Institution settings not found");
    return this.project(row);
  }
  async update(id: string, input: UpdateInstitutionSettingRequest) {
    await this.institutions.get(id);
    const { email, ...rest } = input;
    try {
      return this.project(
        await this.settings.upsert(id, {
          ...rest,
          ...(email !== undefined ? { contactEmail: email } : {}),
        }),
      );
    } catch (error) {
      const cause = error instanceof Error && error.cause ? error.cause : error;
      if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23503")
        throw new NotFoundException("Institution not found");
      throw error;
    }
  }
}
