import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql`select 1 as connected`;
  console.log("PostgreSQL connection successful");
} finally {
  await sql.end();
}
