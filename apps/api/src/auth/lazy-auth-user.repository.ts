import { AuthUserRepository, createDatabase, type AuthUser } from "@fumep/db";

import type { AuthUserLookup } from "./auth.contracts.js";

export class LazyAuthUserRepository implements AuthUserLookup {
  private repository?: AuthUserRepository;

  async findActiveByEmail(email: string): Promise<AuthUser | undefined> {
    if (!this.repository) {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) throw new Error("DATABASE_URL is required");
      this.repository = new AuthUserRepository(createDatabase(databaseUrl).db);
    }

    return this.repository.findActiveByEmail(email);
  }
}
