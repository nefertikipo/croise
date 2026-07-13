/**
 * Idempotently create the Better Auth tables and add crosswords.owner_id.
 *
 * Surgical alternative to `drizzle-kit push` so we don't touch unrelated tables
 * (e.g. the words.familiarity drift). Safe to run multiple times.
 *
 * Usage:
 *   set -a && source .env.local && set +a && pnpm tsx scripts/setup-auth-tables.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fall back to .env if present

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const statements = [
  `CREATE TABLE IF NOT EXISTS "user" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "email_verified" boolean NOT NULL DEFAULT false,
    "image" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "session" (
    "id" text PRIMARY KEY,
    "expires_at" timestamp NOT NULL,
    "token" text NOT NULL UNIQUE,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    "ip_address" text,
    "user_agent" text,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "account" (
    "id" text PRIMARY KEY,
    "account_id" text NOT NULL,
    "provider_id" text NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" timestamp,
    "refresh_token_expires_at" timestamp,
    "scope" text,
    "password" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "verification" (
    "id" text PRIMARY KEY,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
  )`,
  `ALTER TABLE "crosswords" ADD COLUMN IF NOT EXISTS "owner_id" text`,
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'crosswords_owner_id_user_id_fk'
     ) THEN
       ALTER TABLE "crosswords"
         ADD CONSTRAINT "crosswords_owner_id_user_id_fk"
         FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE SET NULL;
     END IF;
   END $$`,
  // books.owner_id predates auth as an unused uuid column; convert it to text
  // (matching user.id) so signed-in users can own books. Always-null today, so
  // the cast is safe.
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'books' AND column_name = 'owner_id') THEN
       ALTER TABLE "books" ADD COLUMN "owner_id" text;
     ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'books' AND column_name = 'owner_id' AND data_type = 'uuid') THEN
       ALTER TABLE "books" ALTER COLUMN "owner_id" TYPE text USING "owner_id"::text;
     END IF;
   END $$`,
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'books_owner_id_user_id_fk'
     ) THEN
       ALTER TABLE "books"
         ADD CONSTRAINT "books_owner_id_user_id_fk"
         FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE SET NULL;
     END IF;
   END $$`,
  // Tracks when the owner was last emailed a "finish your book" reminder.
  `ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp`,
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set. Source .env.local first.");
  }
  for (const statement of statements) {
    await sql.query(statement);
    console.log("✓", statement.split("\n")[0].trim());
  }
  console.log("Auth tables ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
