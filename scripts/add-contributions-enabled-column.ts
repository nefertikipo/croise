/**
 * One-off, idempotent: add the `contributions_enabled` column to `books`.
 * Gates the public "invite friends to add clues" flow (/participer/[code]).
 * Targeted ALTER (not `drizzle-kit push`) to avoid touching any other table on
 * the shared Neon branch (auth tables live here too). Safe to re-run.
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const sql = neon(url);

async function main() {
  await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS contributions_enabled boolean NOT NULL DEFAULT false`;
  const [{ exists }] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'books' AND column_name = 'contributions_enabled'
    ) AS exists
  `;
  console.log(exists ? "books.contributions_enabled is present ✓" : "column missing ✗");
}

main();
