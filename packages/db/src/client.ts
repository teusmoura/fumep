import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";
const databaseUrls = new WeakMap<ReturnType<typeof postgres>, string>();

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl);
  databaseUrls.set(client, databaseUrl);
  const db = drizzle(client, { schema });

  return { client, db };
}

export type Database = ReturnType<typeof createDatabase>["db"];

export function createPinnedDatabaseClient(client: ReturnType<typeof postgres>) {
  const url = databaseUrls.get(client);
  if (!url) throw new Error("Database client must originate from createDatabase");
  return postgres(url, { max: 1, idle_timeout: 0, max_lifetime: 0 });
}
