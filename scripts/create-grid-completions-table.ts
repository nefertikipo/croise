/**
 * Surgically create the grid_completions leaderboard table (+ unique index)
 * without a full-schema db:push, which could touch drifted tables in the
 * shared Neon branch.
 *   set -a; source .env.local; set +a
 *   pnpm tsx scripts/create-grid-completions-table.ts
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    CREATE TABLE IF NOT EXISTS grid_completions (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      crossword_id uuid NOT NULL REFERENCES crosswords(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      time_ms integer NOT NULL,
      revealed boolean NOT NULL DEFAULT false,
      autocheck boolean NOT NULL DEFAULT false,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS grid_completions_user_grid
      ON grid_completions (crossword_id, user_id)
  `;
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'grid_completions' ORDER BY ordinal_position
  `;
  console.log("grid_completions columns:", cols.map((c: { column_name: string }) => c.column_name).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); });
