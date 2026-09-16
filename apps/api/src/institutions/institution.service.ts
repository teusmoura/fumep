import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Institution, CreateInstitutionInput, UpdateInstitutionInput } from "@fumep/db";

export const INSTITUTION_REPOSITORY = Symbol("INSTITUTION_REPOSITORY");
export interface InstitutionStore {
  findAll(): Promise<Institution[]>;
  findById(id: string): Promise<Institution | undefined>;
  create(input: CreateInstitutionInput): Promise<Institution>;
  update(id: string, input: UpdateInstitutionInput): Promise<Institution | undefined>;
  delete(id: string): Promise<boolean>;
}

@Injectable()
export class InstitutionService {
  constructor(@Inject(INSTITUTION_REPOSITORY) private readonly repository: InstitutionStore) {}
  list() {
    return this.repository.findAll();
  }
  async get(id: string) {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException("Institution not found");
    return row;
  }
  create(input: CreateInstitutionInput) {
    return this.mutate(() => this.repository.create(input));
  }
  async update(id: string, input: UpdateInstitutionInput) {
    const row = await this.mutate(() => this.repository.update(id, input));
    if (!row) throw new NotFoundException("Institution not found");
    return row;
  }
  async delete(id: string) {
    if (!(await this.mutate(() => this.repository.delete(id))))
      throw new NotFoundException("Institution not found");
  }
  private async mutate<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const cause = error instanceof Error && error.cause ? error.cause : error;
      if (typeof cause === "object" && cause !== null && "code" in cause) {
        if (cause.code === "23505") throw new ConflictException("Institution slug already exists");
        if (cause.code === "23503") throw new ConflictException("Institution has dependencies");
      }
      throw error;
    }
  }
}
