/**
 * Import scraped French crossword clues into the new words + clues tables.
 *
 * Reads: data/french-clues.tsv (answer\tclue)
 * Populates: words table (unique French words) + clues table (one clue per answer-clue pair)
 *
 * Usage:
 *   pnpm tsx scripts/import-french-clues.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { words, clues } from "../src/db/schema/clue-entries";
import { eq, and, sql } from "drizzle-orm";
import "dotenv/config";

const BATCH_SIZE = 500;
const INPUT = join(process.cwd(), "data", "french-clues.tsv");

function normalize(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const neonSql = neon(process.env.DATABASE_URL);
  const db = drizzle(neonSql);

  console.log(`Reading ${INPUT}...`);
  const content = readFileSync(INPUT, "utf-8");
  const lines = content.split("\n");
  console.log(`Total lines: ${lines.length}`);

  // Phase 1: Collect unique words and their clues
  const wordClues = new Map<string, { clues: Set<string>; frequency: number }>();
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [rawAnswer, rawClue] = line.split("\t");
    if (!rawAnswer || !rawClue) { skipped++; continue; }

    const answer = normalize(rawAnswer);
    if (answer.length < 2 || answer.length > 15) { skipped++; continue; }
    if (!/^[A-Z]+$/.test(answer)) { skipped++; continue; }

    const clue = rawClue.trim();
    if (clue.length < 2 || clue.length > 500) { skipped++; continue; }

    if (!wordClues.has(answer)) {
      wordClues.set(answer, { clues: new Set(), frequency: 0 });
    }
    const entry = wordClues.get(answer)!;
    entry.clues.add(clue);
    entry.frequency++;
  }

  console.log(`Unique words: ${wordClues.size}`);
  console.log(`Skipped: ${skipped}`);

  // Count total clues
  let totalClues = 0;
  for (const [, entry] of wordClues) {
    totalClues += entry.clues.size;
  }
  console.log(`Total unique (word, clue) pairs: ${totalClues}`);

  // Phase 2: Insert words
  console.log("\nInserting words...");
  let wordCount = 0;
  let wordBatch: (typeof words.$inferInsert)[] = [];
  const wordIdMap = new Map<string, number>();

  for (const [word, entry] of wordClues) {
    // Quality score based on frequency (more clues = more crossword-worthy)
    const freq = entry.frequency;
    const qualityScore = Math.min(100, Math.max(20, Math.round(
      freq >= 20 ? 90 :
      freq >= 10 ? 75 :
      freq >= 5 ? 60 :
      freq >= 2 ? 45 :
      30
    )));

    wordBatch.push({
      word,
      length: word.length,
      language: "fr",
      qualityScore,
      frequency: freq,
      active: word.length >= 3, // Only 3+ letter words are valid for grids
    });

    if (wordBatch.length >= BATCH_SIZE) {
      const inserted = await db.insert(words).values(wordBatch).returning({ id: words.id, word: words.word });
      for (const row of inserted) {
        wordIdMap.set(row.word, row.id);
      }
      wordCount += wordBatch.length;
      process.stdout.write(`\rWords: ${wordCount}/${wordClues.size}`);
      wordBatch = [];
    }
  }

  if (wordBatch.length > 0) {
    const inserted = await db.insert(words).values(wordBatch).returning({ id: words.id, word: words.word });
    for (const row of inserted) {
      wordIdMap.set(row.word, row.id);
    }
    wordCount += wordBatch.length;
  }
  console.log(`\nInserted ${wordCount} words`);

  // Phase 3: Insert clues
  console.log("\nInserting clues...");
  let clueCount = 0;
  let clueBatch: (typeof clues.$inferInsert)[] = [];

  for (const [word, entry] of wordClues) {
    const wordId = wordIdMap.get(word);
    if (!wordId) continue;

    for (const clueText of entry.clues) {
      clueBatch.push({
        wordId,
        clue: clueText,
        language: "fr",
        source: "cruciverbe",
        origin: "scraped",
      });

      if (clueBatch.length >= BATCH_SIZE) {
        await db.insert(clues).values(clueBatch);
        clueCount += clueBatch.length;
        process.stdout.write(`\rClues: ${clueCount}/${totalClues}`);
        clueBatch = [];
      }
    }
  }

  if (clueBatch.length > 0) {
    await db.insert(clues).values(clueBatch);
    clueCount += clueBatch.length;
  }

  console.log(`\nInserted ${clueCount} clues`);

  // Also populate legacy clue_entries table for backward compat
  console.log("\nPopulating legacy clue_entries...");
  const { clueEntries } = await import("../src/db/schema/clue-entries");
  let legacyCount = 0;
  let legacyBatch: (typeof clueEntries.$inferInsert)[] = [];

  for (const [word, entry] of wordClues) {
    // Take the first clue for each word for legacy table
    const firstClue = [...entry.clues][0];
    if (!firstClue) continue;

    legacyBatch.push({
      answer: word,
      answerLength: word.length,
      clue: firstClue,
      language: "fr",
      source: "cruciverbe",
    });

    if (legacyBatch.length >= BATCH_SIZE) {
      await db.insert(clueEntries).values(legacyBatch);
      legacyCount += legacyBatch.length;
      process.stdout.write(`\rLegacy: ${legacyCount}`);
      legacyBatch = [];
    }
  }

  if (legacyBatch.length > 0) {
    await db.insert(clueEntries).values(legacyBatch);
    legacyCount += legacyBatch.length;
  }

  console.log(`\nInserted ${legacyCount} legacy clue entries`);
  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
