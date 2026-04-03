/**
 * Import ALL crossword clues from the xd dataset (no dedup).
 * Each answer will have multiple clues with different sources/years.
 *
 * Usage:
 *   pnpm tsx scripts/import-xd-all-clues.ts data/xd/clues.tsv
 */

import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { clueEntries } from "../src/db/schema/clue-entries";
import { sql } from "drizzle-orm";
import "dotenv/config";

const BATCH_SIZE = 1000;

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: pnpm tsx scripts/import-xd-all-clues.ts <tsv-file>");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const neonSql = neon(process.env.DATABASE_URL);
  const db = drizzle(neonSql);

  // Clear existing English clues first
  console.log("Clearing existing English clues...");
  await db.delete(clueEntries).where(sql`${clueEntries.language} = 'en'`);
  console.log("Cleared.");

  console.log(`Reading ${file}...`);
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");
  console.log(`Total lines: ${lines.length}`);

  // Deduplicate exact (answer, clue) pairs but keep different clues for same answer
  const seen = new Set<string>();
  let imported = 0;
  let skipped = 0;
  let batch: (typeof clueEntries.$inferInsert)[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const parts = line.split("\t");
    if (parts.length < 4) { skipped++; continue; }

    const [pubid, yearStr, rawAnswer, rawClue] = parts;
    const answer = rawAnswer.toUpperCase().replace(/[^A-Z]/g, "");

    if (answer.length < 3 || answer.length > 15) { skipped++; continue; }
    if (!rawClue || rawClue.trim().length < 2) { skipped++; continue; }

    const clue = rawClue.trim().slice(0, 500);

    // Skip exact duplicate (answer + clue text)
    const key = `${answer}|${clue}`;
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);

    const year = parseInt(yearStr, 10);

    batch.push({
      answer,
      answerLength: answer.length,
      clue,
      language: "en",
      source: pubid || null,
      difficulty: null,
      year: isNaN(year) ? null : year,
      tags: null,
    });

    if (batch.length >= BATCH_SIZE) {
      await db.insert(clueEntries).values(batch);
      imported += batch.length;
      if (imported % 50_000 === 0) {
        process.stdout.write(`\rImported ${(imported / 1000).toFixed(0)}K clues...`);
      }
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.insert(clueEntries).values(batch);
    imported += batch.length;
  }

  console.log(`\nDone! Imported ${imported} English clues (skipped ${skipped} dupes/invalid).`);
  console.log(`Unique (answer, clue) pairs. Multiple clues per answer preserved.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
