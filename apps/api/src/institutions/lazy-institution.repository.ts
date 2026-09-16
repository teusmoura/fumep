import type { OnModuleDestroy } from "@nestjs/common";
import {
  createDatabase,
  InstitutionRepository,
  type CreateInstitutionInput,
  type UpdateInstitutionInput,
} from "@fumep/db";
import type { InstitutionStore } from "./institution.service.js";

export class LazyInstitutionRepository implements InstitutionStore, OnModuleDestroy {
  private connection?: ReturnType<typeof createDatabase>;
  private repository() {
    if (!this.connection) {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL is required");
      this.connection = createDatabase(url);
    }
    return new InstitutionRepository(this.connection.db);
  }
  findAll() {
    return this.repository().findAll();
  }
  findById(id: string) {
    return this.repository().findById(id);
  }
  create(input: CreateInstitutionInput) {
    return this.repository().create(input);
  }
  update(id: string, input: UpdateInstitutionInput) {
    return this.repository().update(id, input);
  }
  delete(id: string) {
    return this.repository().delete(id);
  }
  async onModuleDestroy() {
    if (this.connection) await this.connection.client.end();
  }
}
