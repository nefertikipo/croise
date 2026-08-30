/**
 * Idempotent, additive columns for mots croisés in the carnet:
 *   - books.puzzle_type          ('fleche' | 'croise' | 'melange', default 'fleche')
 *   - book_pages.american_crossword_id  → american_crosswords.id (set null)
 *
 * Additive ALTERs only — no drops — so it's safe on the shared Neon dev branch
 * (see setup-postcards-table.ts for the same hazard rationale). Existing fléchés
 * books/pages are unaffected.
 *
 *   pnpm tsx --env-file=.env.local scripts/setup-book-croises-columns.ts
 */
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "puzzle_type" text NOT NULL DEFAULT 'fleche'`;
  await sql`ALTER TABLE "book_pages" ADD COLUMN IF NOT EXISTS "american_crossword_id" uuid`;
  // Add the FK only if it isn't already present.
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'book_pages_american_crossword_id_fk'
      ) THEN
        ALTER TABLE "book_pages"
          ADD CONSTRAINT "book_pages_american_crossword_id_fk"
          FOREIGN KEY ("american_crossword_id")
          REFERENCES "american_crosswords"("id") ON DELETE set null;
      END IF;
    END $$;
  `;
  console.log("book croisés columns ready.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
