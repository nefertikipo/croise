/**
 * Import French definitions from Wiktionnaire (kaikki.org extract).
 *
 * Usage:
 *   # First decompress:
 *   gunzip data/fr-extract.jsonl.gz
 *   # Then import:
 *   pnpm tsx scripts/import-french-wiktionnaire.ts data/fr-extract.jsonl
 *
 * The JSONL file has one JSON object per line, each representing a word entry.
 * We extract: word (normalized for crossword) + first short definition as the clue.
 */

import { createReadStream } from "fs";
import { createInterface } from "readline";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { clueEntries } from "../src/db/schema/clue-entries";
import "dotenv/config";

const BATCH_SIZE = 1000;

function normalize(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: pnpm tsx scripts/import-french-wiktionnaire.ts <jsonl-file>");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  // Track best definition per normalized word (dedup)
  const bestDefs = new Map<string, { clue: string; word: string }>();

  console.log(`Reading ${file}...`);

  const rl = createInterface({
    input: createReadStream(file, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let skipped = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 100_000 === 0) {
      process.stdout.write(`\rParsed ${(lineCount / 1000).toFixed(0)}K lines... (${bestDefs.size} unique words)`);
    }

    try {
      const entry = JSON.parse(line);

      // We only want French words (lang_code "fr") with senses
      if (entry.lang_code !== "fr") continue;

      const word = entry.word;
      if (!word) continue;

      const normalized = normalize(word);
      if (normalized.length < 3 || normalized.length > 15) continue;
      if (!/^[A-Z]+$/.test(normalized)) continue;

      // Skip if we already have a definition for this normalized form
      if (bestDefs.has(normalized)) continue;

      // Extract the first gloss (definition) from senses
      const senses = entry.senses;
      if (!Array.isArray(senses) || senses.length === 0) continue;

      let bestGloss: string | null = null;

      for (const sense of senses) {
        const glosses = sense.glosses;
        if (!Array.isArray(glosses) || glosses.length === 0) continue;

        // Take the first non-empty gloss
        for (const gloss of glosses) {
          if (typeof gloss === "string" && gloss.length > 2 && gloss.length < 200) {
            // Skip glosses that are just grammar notes or references
            if (gloss.startsWith("(") && gloss.endsWith(")")) continue;
            if (gloss.includes("Variante") || gloss.includes("Pluriel")) continue;

            bestGloss = gloss;
            break;
          }
        }
        if (bestGloss) break;
      }

      if (!bestGloss) { skipped++; continue; }

      // Clean up the gloss for use as a crossword clue
      let clue = bestGloss
        .replace(/\s*\(.*?\)\s*/g, " ") // Remove parentheticals
        .replace(/\s+/g, " ")           // Normalize spaces
        .trim();

      // Truncate long definitions
      if (clue.length > 150) {
        const dot = clue.indexOf(".", 20);
        if (dot > 0 && dot < 150) {
          clue = clue.slice(0, dot + 1);
        } else {
          clue = clue.slice(0, 147) + "...";
        }
      }

      // Skip very short or useless definitions
      if (clue.length < 3) { skipped++; continue; }

      bestDefs.set(normalized, { clue, word });
    } catch {
      skipped++;
    }
  }

  console.log(`\nParsed ${lineCount} lines, found ${bestDefs.size} unique French words, skipped ${skipped}`);

  // Insert in batches
  let imported = 0;
  let batch: (typeof clueEntries.$inferInsert)[] = [];

  for (const [answer, { clue }] of bestDefs) {
    batch.push({
      answer,
      answerLength: answer.length,
      clue,
      language: "fr",
      source: "wiktionnaire",
      difficulty: null,
      year: null,
      tags: null,
    });

    if (batch.length >= BATCH_SIZE) {
      await db.insert(clueEntries).values(batch);
      imported += batch.length;
      process.stdout.write(`\rImported ${imported} / ${bestDefs.size} French clues...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.insert(clueEntries).values(batch);
    imported += batch.length;
  }

  console.log(`\nDone! Imported ${imported} French clue-answer pairs.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
