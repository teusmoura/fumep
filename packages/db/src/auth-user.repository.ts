import { and, eq, sql } from "drizzle-orm";

import type { Database } from "./client.js";
import { userInstitutions, users } from "./schema.js";

export type AuthUser = Pick<typeof users.$inferSelect, "id" | "email" | "passwordHash" | "role"> & {
  institutionIds: string[];
};

export class AuthUserRepository {
  constructor(private readonly db: Database) {}

  async findActiveByEmail(email: string): Promise<AuthUser | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.isActive, true), sql`lower(${users.email}) = ${normalizedEmail}`))
      .limit(1);

    if (!user) return undefined;

    const institutions = await this.db
      .select({ institutionId: userInstitutions.institutionId })
      .from(userInstitutions)
      .where(eq(userInstitutions.userId, user.id));

    return { ...user, institutionIds: institutions.map(({ institutionId }) => institutionId) };
  }
}
