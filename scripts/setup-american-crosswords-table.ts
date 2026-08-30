/**
 * Idempotent creation of the `american_crosswords` table (mots croisés product).
 *
 * The repo syncs schema with drizzle-kit push, but push does a full-schema diff
 * that — on the shared Neon dev branch — can drop tables another workspace's
 * schema doesn't know about (see setup-postcards-table.ts / setup-auth-tables.ts
 * for the same hazard). This creates ONLY this table + its index, non-destructively.
 *
 *   pnpm tsx --env-file=.env.local scripts/setup-american-crosswords-table.ts
 */
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    CREATE TABLE IF NOT EXISTS "american_crosswords" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "code" text NOT NULL UNIQUE,
      "owner_id" text REFERENCES "user"("id") ON DELETE set null,
      "title" text,
      "width" integer NOT NULL,
      "height" integer NOT NULL,
      "difficulty" text,
      "puzzle" jsonb NOT NULL,
      "status" text NOT NULL DEFAULT 'ready',
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "american_crosswords_owner_id_idx" ON "american_crosswords" ("owner_id")`;
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM "american_crosswords"`;
  console.log(`american_crosswords table ready (rows: ${count}).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
