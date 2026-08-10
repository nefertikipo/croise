/**
 * Idempotent creation of the `calendars` + `calendar_months` tables (the
 * "calendrier" product). Non-destructive (CREATE IF NOT EXISTS) — see
 * setup-postcards-table.ts for why we avoid drizzle-kit push on the shared branch.
 *
 *   pnpm tsx --env-file=.env.local scripts/setup-calendars-tables.ts
 */
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    CREATE TABLE IF NOT EXISTS "calendars" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "code" text NOT NULL UNIQUE,
      "owner_id" text REFERENCES "user"("id") ON DELETE set null,
      "title" text,
      "year" integer NOT NULL,
      "grid_color" text,
      "status" text NOT NULL DEFAULT 'draft',
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "calendars_owner_id_idx" ON "calendars" ("owner_id")`;
  await sql`
    CREATE TABLE IF NOT EXISTS "calendar_months" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "calendar_id" uuid NOT NULL REFERENCES "calendars"("id") ON DELETE cascade,
      "month" integer NOT NULL,
      "crossword_id" uuid REFERENCES "crosswords"("id") ON DELETE set null,
      CONSTRAINT "calendar_months_calendar_month_uq" UNIQUE ("calendar_id", "month")
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "calendar_months_calendar_id_idx" ON "calendar_months" ("calendar_id")`;
  console.log("calendars + calendar_months tables ready.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
