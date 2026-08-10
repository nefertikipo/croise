/**
 * Idempotent creation of the `postcards` table (the "carte" product).
 *
 * The repo syncs schema with drizzle-kit push, but push does a full-schema diff
 * that — on the shared Neon dev branch — can drop tables another workspace's
 * schema doesn't know about (see the auth-tables setup script for the same
 * hazard). This creates ONLY the postcards table + its index, non-destructively.
 *
 *   pnpm tsx --env-file=.env.local scripts/setup-postcards-table.ts
 */
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    CREATE TABLE IF NOT EXISTS "postcards" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "code" text NOT NULL UNIQUE,
      "owner_id" text REFERENCES "user"("id") ON DELETE set null,
      "crossword_id" uuid REFERENCES "crosswords"("id") ON DELETE set null,
      "title" text,
      "recipient_name" text,
      "message" text,
      "message_font" text,
      "grid_color" text,
      "status" text NOT NULL DEFAULT 'draft',
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "postcards_owner_id_idx" ON "postcards" ("owner_id")`;
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM "postcards"`;
  console.log(`postcards table ready (rows: ${count}).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
