/**
 * Import dico-mots scraped data into the words + clues tables.
 * Deduplicates exact (answer, clue) pairs.
 *
 * Usage:
 *   pnpm tsx scripts/import-dicomots.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { words, clues, clueEntries } from "../src/db/schema/clue-entries";
import { sql } from "drizzle-orm";
import "dotenv/config";

const BATCH_SIZE = 500;
const INPUT = join(process.cwd(), "data", "french-clues-dicomots.tsv");

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

  // Collect unique words and deduplicated clues
  const wordClues = new Map<string, Set<string>>();
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const tab = line.indexOf("\t");
    if (tab === -1) { skipped++; continue; }

    const rawAnswer = line.slice(0, tab);
    const rawClue = line.slice(tab + 1);
    if (!rawAnswer || !rawClue) { skipped++; continue; }

    const answer = normalize(rawAnswer);
    if (answer.length < 2 || answer.length > 15) { skipped++; continue; }
    if (!/^[A-Z]+$/.test(answer)) { skipped++; continue; }

    const clue = rawClue.trim();
    if (clue.length < 2 || clue.length > 500) { skipped++; continue; }

    if (!wordClues.has(answer)) {
      wordClues.set(answer, new Set());
    }
    wordClues.get(answer)!.add(clue);
  }

  console.log(`Unique words: ${wordClues.size}`);
  let totalClues = 0;
  for (const [, clueSet] of wordClues) totalClues += clueSet.size;
  console.log(`Unique (word, clue) pairs: ${totalClues}`);
  console.log(`Skipped: ${skipped}`);

  // Clear existing French data in new tables
  console.log("\nClearing existing French words/clues...");
  await db.delete(clues).where(sql`${clues.language} = 'fr'`);
  await db.delete(words).where(sql`${words.language} = 'fr'`);
  await db.delete(clueEntries).where(sql`${clueEntries.language} = 'fr'`);
  console.log("Cleared.");

  // Insert words
  console.log("\nInserting words...");
  let wordCount = 0;
  let wordBatch: (typeof words.$inferInsert)[] = [];
  const wordIdMap = new Map<string, number>();

  for (const [word, clueSet] of wordClues) {
    const freq = clueSet.size;
    const qualityScore = Math.min(100, Math.max(20, Math.round(
      freq >= 10 ? 90 :
      freq >= 5 ? 75 :
      freq >= 3 ? 60 :
      freq >= 2 ? 45 :
      30
    )));

    wordBatch.push({
      word,
      length: word.length,
      language: "fr",
      qualityScore,
      frequency: freq,
      active: true,
    });

    if (wordBatch.length >= BATCH_SIZE) {
      const inserted = await db.insert(words).values(wordBatch).returning({ id: words.id, word: words.word });
      for (const row of inserted) wordIdMap.set(row.word, row.id);
      wordCount += wordBatch.length;
      process.stdout.write(`\rWords: ${wordCount}/${wordClues.size}`);
      wordBatch = [];
    }
  }
  if (wordBatch.length > 0) {
    const inserted = await db.insert(words).values(wordBatch).returning({ id: words.id, word: words.word });
    for (const row of inserted) wordIdMap.set(row.word, row.id);
    wordCount += wordBatch.length;
  }
  console.log(`\nInserted ${wordCount} words`);

  // Insert clues
  console.log("\nInserting clues...");
  let clueCount = 0;
  let clueBatch: (typeof clues.$inferInsert)[] = [];

  for (const [word, clueSet] of wordClues) {
    const wordId = wordIdMap.get(word);
    if (!wordId) continue;

    for (const clueText of clueSet) {
      clueBatch.push({
        wordId,
        clue: clueText,
        language: "fr",
        source: "dico-mots",
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

  // Also populate legacy clue_entries (pick best clue per word)
  console.log("\nPopulating legacy clue_entries...");
  let legacyCount = 0;
  let legacyBatch: (typeof clueEntries.$inferInsert)[] = [];

  for (const [word, clueSet] of wordClues) {
    const firstClue = [...clueSet][0];
    if (!firstClue) continue;

    legacyBatch.push({
      answer: word,
      answerLength: word.length,
      clue: firstClue,
      language: "fr",
      source: "dico-mots",
    });

    if (legacyBatch.length >= BATCH_SIZE) {
      await db.insert(clueEntries).values(legacyBatch);
      legacyCount += legacyBatch.length;
      legacyBatch = [];
    }
  }
  if (legacyBatch.length > 0) {
    await db.insert(clueEntries).values(legacyBatch);
    legacyCount += legacyBatch.length;
  }
  console.log(`Inserted ${legacyCount} legacy entries`);

  console.log("\nDone!");
  console.log(`Summary: ${wordCount} words, ${clueCount} clues, ${legacyCount} legacy entries`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
