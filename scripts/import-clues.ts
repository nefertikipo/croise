/**
 * Import crossword clues from CSV files into the database.
 *
 * Usage:
 *   pnpm tsx scripts/import-clues.ts <csv-file> [--language en|fr] [--source nyt]
 *
 * Expected CSV format (flexible, auto-detects columns):
 *   - Must have an "answer" or "word" column
 *   - Must have a "clue" or "hint" column
 *   - Optional: "year", "difficulty", "source", "day" (for NYT day-of-week difficulty)
 *
 * Example:
 *   pnpm tsx scripts/import-clues.ts data/nyt-clues.csv --language en --source nyt
 */

import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { clueEntries } from "../src/db/schema/clue-entries";
import "dotenv/config";

const BATCH_SIZE = 500;

// Day-of-week to difficulty mapping (NYT convention)
const DAY_DIFFICULTY: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 5,
  sunday: 4,
};

function normalizeAnswer(answer: string): string {
  return answer
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .trim();
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args[0];

  if (!file) {
    console.error("Usage: pnpm tsx scripts/import-clues.ts <csv-file> [--language en] [--source nyt]");
    process.exit(1);
  }

  const langIdx = args.indexOf("--language");
  const language = langIdx !== -1 ? args[langIdx + 1] : "en";

  const sourceIdx = args.indexOf("--source");
  const source = sourceIdx !== -1 ? args[sourceIdx + 1] : null;

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set. Create a .env.local file or set the variable.");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log(`Reading ${file}...`);
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  if (lines.length < 2) {
    console.error("CSV file must have a header row and at least one data row.");
    process.exit(1);
  }

  // Parse header
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const answerCol = header.findIndex((h) => h === "answer" || h === "word");
  const clueCol = header.findIndex((h) => h === "clue" || h === "hint");
  const yearCol = header.findIndex((h) => h === "year" || h === "date");
  const dayCol = header.findIndex((h) => h === "day" || h === "dayofweek");
  const diffCol = header.findIndex((h) => h === "difficulty");

  if (answerCol === -1 || clueCol === -1) {
    console.error(`Could not find required columns. Found: ${header.join(", ")}`);
    console.error("Need 'answer'/'word' and 'clue'/'hint' columns.");
    process.exit(1);
  }

  console.log(`Columns: answer=${header[answerCol]}, clue=${header[clueCol]}`);
  console.log(`Importing with language=${language}, source=${source ?? "auto"}`);

  let imported = 0;
  let skipped = 0;
  let batch: (typeof clueEntries.$inferInsert)[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const rawAnswer = fields[answerCol];
    const rawClue = fields[clueCol];

    if (!rawAnswer || !rawClue) {
      skipped++;
      continue;
    }

    const answer = normalizeAnswer(rawAnswer);
    if (answer.length < 3 || !/^[A-Z]+$/.test(answer)) {
      skipped++;
      continue;
    }

    let difficulty: number | null = null;
    if (diffCol !== -1 && fields[diffCol]) {
      difficulty = parseInt(fields[diffCol], 10) || null;
    } else if (dayCol !== -1 && fields[dayCol]) {
      difficulty = DAY_DIFFICULTY[fields[dayCol].toLowerCase()] ?? null;
    }

    let year: number | null = null;
    if (yearCol !== -1 && fields[yearCol]) {
      const parsed = parseInt(fields[yearCol].slice(0, 4), 10);
      if (parsed > 1900 && parsed < 2100) year = parsed;
    }

    batch.push({
      answer,
      answerLength: answer.length,
      clue: rawClue.replace(/^"|"$/g, "").trim(),
      language,
      source,
      difficulty,
      year,
      tags: null,
    });

    if (batch.length >= BATCH_SIZE) {
      await db.insert(clueEntries).values(batch);
      imported += batch.length;
      process.stdout.write(`\rImported ${imported} clues...`);
      batch = [];
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    await db.insert(clueEntries).values(batch);
    imported += batch.length;
  }

  console.log(`\nDone! Imported ${imported} clues, skipped ${skipped} rows.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
