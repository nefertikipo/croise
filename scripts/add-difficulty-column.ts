/**
 * One-off, idempotent: add the `difficulty` column to `placed_words`.
 * Targeted ALTER (not `drizzle-kit push`) to avoid touching any other table on
 * the shared Neon branch (auth tables live here too). Safe to re-run.
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const sql = neon(url);

async function main() {
  await sql`ALTER TABLE placed_words ADD COLUMN IF NOT EXISTS difficulty integer`;
  const [{ exists }] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'placed_words' AND column_name = 'difficulty'
    ) AS exists
  `;
  console.log(exists ? "placed_words.difficulty is present ✓" : "column missing ✗");
}

main();
