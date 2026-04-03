/**
 * Import crossword clues from the xd dataset (xd.saul.pw).
 *
 * Usage:
 *   pnpm tsx scripts/import-xd-clues.ts data/xd/clues.tsv
 *
 * TSV format: pubid\tyear\tanswer\tclue
 * Imports only entries with 3-15 letter alphabetic answers.
 * Deduplicates by keeping one clue per unique answer (highest-quality source).
 */

import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { clueEntries } from "../src/db/schema/clue-entries";
import "dotenv/config";

const BATCH_SIZE = 1000;

// Publication quality ranking (higher = better)
const SOURCE_QUALITY: Record<string, number> = {
  nyt: 10, nytimes: 10,
  lat: 8, latimes: 8,
  wapo: 7, wp: 7,
  wsj: 7,
  usa: 6, usatoday: 6,
  uni: 5, universal: 5,
};

function getSourceQuality(pubid: string): number {
  const lower = pubid.toLowerCase();
  for (const [key, score] of Object.entries(SOURCE_QUALITY)) {
    if (lower.includes(key)) return score;
  }
  return 3;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: pnpm tsx scripts/import-xd-clues.ts <tsv-file>");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log(`Reading ${file}...`);
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");
  console.log(`Total lines: ${lines.length}`);

  // Deduplicate: keep best clue per answer
  // Map: answer -> { clue, source, year, quality }
  const bestClues = new Map<string, {
    clue: string;
    source: string;
    year: number | null;
    quality: number;
  }>();

  let parsed = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const parts = line.split("\t");
    if (parts.length < 4) { skipped++; continue; }

    const [pubid, yearStr, answer, clue] = parts;
    const normalized = answer.toUpperCase().replace(/[^A-Z]/g, "");

    if (normalized.length < 3 || normalized.length > 15) { skipped++; continue; }
    if (!clue || clue.trim().length === 0) { skipped++; continue; }

    const year = parseInt(yearStr, 10);
    const quality = getSourceQuality(pubid) + (year > 2010 ? 2 : 0);

    const existing = bestClues.get(normalized);
    if (!existing || quality > existing.quality) {
      bestClues.set(normalized, {
        clue: clue.trim().slice(0, 500),
        source: pubid,
        year: isNaN(year) ? null : year,
        quality,
      });
    }

    parsed++;
    if (parsed % 1_000_000 === 0) {
      process.stdout.write(`\rParsed ${(parsed / 1_000_000).toFixed(1)}M lines...`);
    }
  }

  console.log(`\nParsed ${parsed} entries, skipped ${skipped}`);
  console.log(`Unique answers: ${bestClues.size}`);

  // Insert in batches
  let imported = 0;
  let batch: (typeof clueEntries.$inferInsert)[] = [];

  for (const [answer, data] of bestClues) {
    batch.push({
      answer,
      answerLength: answer.length,
      clue: data.clue,
      language: "en",
      source: data.source,
      difficulty: null,
      year: data.year,
      tags: null,
    });

    if (batch.length >= BATCH_SIZE) {
      await db.insert(clueEntries).values(batch);
      imported += batch.length;
      process.stdout.write(`\rImported ${imported} / ${bestClues.size} clues...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.insert(clueEntries).values(batch);
    imported += batch.length;
  }

  console.log(`\nDone! Imported ${imported} unique clue-answer pairs.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
