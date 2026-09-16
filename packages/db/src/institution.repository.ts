import { asc, eq } from "drizzle-orm";

import type { Database } from "./client.js";
import { institutions, type Institution, type NewInstitution } from "./schema.js";

export type CreateInstitutionInput = Pick<NewInstitution, "name" | "slug"> &
  Partial<Pick<NewInstitution, "isActive">>;

export type UpdateInstitutionInput = Partial<
  Pick<
    Institution,
    "name" | "slug" | "isActive" | "primary" | "primaryForeground" | "accent" | "accentForeground"
  >
>;

export class InstitutionRepository {
  constructor(private readonly database: Database) {}

  async create(input: CreateInstitutionInput): Promise<Institution> {
    const [institution] = await this.database.insert(institutions).values(input).returning();

    if (!institution) {
      throw new Error("Institution was not created");
    }

    return institution;
  }

  async findById(id: string): Promise<Institution | undefined> {
    return this.database.query.institutions.findFirst({
      where: eq(institutions.id, id),
    });
  }

  async findAll(): Promise<Institution[]> {
    return this.database.select().from(institutions).orderBy(asc(institutions.name));
  }

  async findBySlug(slug: string): Promise<Institution | undefined> {
    return this.database.query.institutions.findFirst({ where: eq(institutions.slug, slug) });
  }

  async update(id: string, input: UpdateInstitutionInput): Promise<Institution | undefined> {
    const [institution] = await this.database
      .update(institutions)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(institutions.id, id))
      .returning();

    return institution;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.database
      .delete(institutions)
      .where(eq(institutions.id, id))
      .returning({ id: institutions.id });

    return deleted.length === 1;
  }
}
