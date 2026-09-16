import { eq } from "drizzle-orm";
import type { Database } from "./client.js";
import { institutionSettings } from "./schema.js";
export type UpdateInstitutionSettingInput = Partial<
  Pick<
    typeof institutionSettings.$inferInsert,
    "contactEmail" | "phone" | "address" | "socialLinks" | "footerLinks" | "appearanceDefault"
  >
>;
export class InstitutionSettingRepository {
  constructor(private readonly db: Database) {}
  async findByInstitutionId(id: string) {
    const [row] = await this.db
      .select()
      .from(institutionSettings)
      .where(eq(institutionSettings.institutionId, id));
    return row;
  }
  async upsert(id: string, input: UpdateInstitutionSettingInput) {
    const [row] = await this.db
      .insert(institutionSettings)
      .values({ institutionId: id, ...input })
      .onConflictDoUpdate({
        target: institutionSettings.institutionId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    if (!row) throw new Error("Institution settings were not updated");
    return row;
  }
}
