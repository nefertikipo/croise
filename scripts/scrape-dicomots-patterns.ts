/**
 * Scrape dico-mots.fr systematically using adaptive pattern search.
 *
 * Strategy: start with 2-letter prefixes. If a page returns 21 results
 * (the cap), subdivide into 26 × 3-letter prefixes. If still capped,
 * subdivide into 4-letter prefixes. This ensures we get every word.
 *
 * Usage: pnpm tsx scripts/scrape-dicomots-patterns.ts
 */

import { appendFileSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { words, clues } from "../src/db/schema/clue-entries";
import { eq, and } from "drizzle-orm";
import { config } from "dotenv";
config({ path: ".env.local" });

const OUTPUT = join(process.cwd(), "data", "french-clues-dicomots-extra.tsv");
const PROGRESS_FILE = join(process.cwd(), "data", "dicomots-patterns-progress.json");
const DELAY_MS = 150;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const wordIdCache = new Map<string, number>();

async function upsertWord(word: string): Promise<number> {
  const cached = wordIdCache.get(word);
  if (cached) return cached;

  const existing = await db
    .select({ id: words.id })
    .from(words)
    .where(and(eq(words.word, word), eq(words.language, "fr")))
    .limit(1);

  if (existing.length > 0) {
    wordIdCache.set(word, existing[0].id);
    return existing[0].id;
  }

  const inserted = await db
    .insert(words)
    .values({
      word,
      length: word.length,
      language: "fr",
      qualityScore: 85,
      frequency: 1,
    })
    .onConflictDoNothing()
    .returning({ id: words.id });

  if (inserted.length > 0) {
    wordIdCache.set(word, inserted[0].id);
    return inserted[0].id;
  }

  const retry = await db
    .select({ id: words.id })
    .from(words)
    .where(and(eq(words.word, word), eq(words.language, "fr")))
    .limit(1);
  const id = retry[0]?.id ?? 0;
  wordIdCache.set(word, id);
  return id;
}

async function insertClue(wordId: number, clueText: string) {
  await db
    .insert(clues)
    .values({
      wordId,
      clue: clueText,
      language: "fr",
      source: "dico-mots",
      origin: "scraped",
      verified: false,
    })
    .onConflictDoNothing();
}
const CAP = 21; // dico-mots result cap
const MAX_PREFIX = 5; // don't go deeper than 5-letter prefix
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function normalize(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(url: string): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (crossword-research-bot)" },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 404) return null;
      if (res.status === 429) {
        console.log("\nRate limited, waiting 10s...");
        await sleep(10000);
        continue;
      }
      if (!res.ok) return null;
      return await res.text();
    } catch {
      if (i === 2) return null;
      await sleep(2000);
    }
  }
  return null;
}

function extractPairs(html: string): { answer: string; clue: string }[] {
  const pairs: { answer: string; clue: string }[] = [];
  const blockRegex = /<h3[^>]*>([A-Z\s]+)<\/h3>[\s\S]*?<div class="csi_clue">([\s\S]*?)<\/div>/g;
  let blockMatch;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const answer = normalize(blockMatch[1]);
    if (answer.length < 2 || answer.length > 15) continue;

    const clueBlock = blockMatch[2];
    const clueRegex = /title="([^"]+)"/g;
    let clueMatch;

    while ((clueMatch = clueRegex.exec(clueBlock)) !== null) {
      const clue = clueMatch[1].trim();
      if (clue.length >= 2 && clue.length <= 300) {
        pairs.push({ answer, clue });
      }
    }
  }

  return pairs;
}

function countResults(html: string): number {
  return (html.match(/<h3[^>]*>[A-Z]/g) ?? []).length;
}

interface Progress {
  completedLengthPrefixes: string[]; // "len:prefix" e.g. "3:AB", "2:A"
  totalNew: number;
}

function loadProgress(): Progress {
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch {}
  return { completedLengthPrefixes: [], totalNew: 0 };
}

function saveProgress(progress: Progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress), "utf-8");
}

async function main() {
  // Load existing clues to skip duplicates
  const existing = new Set<string>();
  for (const file of ["french-clues-deduped.tsv", "french-clues-dicomots.tsv", "french-clues-dicomots-extra.tsv"]) {
    const path = join(process.cwd(), "data", file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n").slice(1)) {
      const tab = line.indexOf("\t");
      if (tab > 0) {
        existing.add(normalize(line.slice(0, tab)) + "|" + line.slice(tab + 1).trim());
      }
    }
  }
  console.log(`Existing clue pairs to skip: ${existing.size}`);

  const progress = loadProgress();
  const completedSet = new Set(progress.completedLengthPrefixes);
  console.log(`Previously completed: ${completedSet.size} length:prefix combos, ${progress.totalNew} new pairs`);

  // Append mode if we have progress, otherwise start fresh
  if (completedSet.size === 0 && !existsSync(OUTPUT)) {
    writeFileSync(OUTPUT, "answer\tclue\n", "utf-8");
  }

  let totalNew = progress.totalNew;
  const totalWords = new Set<string>();
  let pagesChecked = 0;
  let pagesWithResults = 0;

  /**
   * Recursively scrape a pattern prefix for a given word length.
   * If results are capped at 21, subdivide into deeper prefixes.
   */
  async function scrapePattern(prefix: string, wordLength: number): Promise<void> {
    if (prefix.length >= wordLength) return; // prefix longer than word, impossible
    if (prefix.length > MAX_PREFIX) return; // too deep

    const underscores = "_".repeat(wordLength - prefix.length);
    const pattern = prefix + underscores;
    const url = `https://www.dico-mots.fr/mots-croises/${pattern}.html`;

    await sleep(DELAY_MS);
    const html = await fetchPage(url);
    pagesChecked++;

    if (!html) return;

    const resultCount = countResults(html);
    if (resultCount === 0) return;

    pagesWithResults++;
    const pairs = extractPairs(html);

    // Collect new pairs
    const newPairs = pairs.filter((p) => {
      const key = p.answer + "|" + p.clue;
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });

    if (newPairs.length > 0) {
      // Write to TSV (backup)
      const lines = newPairs.map((p) => `${p.answer}\t${p.clue}`).join("\n");
      appendFileSync(OUTPUT, lines + "\n", "utf-8");

      // Write to database
      for (const p of newPairs) {
        try {
          const wordId = await upsertWord(p.answer);
          if (wordId > 0) {
            await insertClue(wordId, p.clue);
          }
        } catch {
          // Don't fail on DB errors
        }
      }

      totalNew += newPairs.length;
      for (const p of newPairs) totalWords.add(p.answer);
    }

    process.stdout.write(
      `\r  [${pagesChecked} pages] ${pattern}: ${resultCount} results (${newPairs.length} new) | Total: ${totalNew} new, ${totalWords.size} words   `,
    );

    // If capped, subdivide deeper
    if (resultCount >= CAP && prefix.length < MAX_PREFIX && prefix.length < wordLength - 1) {
      for (const c of LETTERS) {
        await scrapePattern(prefix + c, wordLength);
      }
    }
  }

  console.log("Starting adaptive pattern scrape...\n");

  for (let len = 2; len <= 15; len++) {
    console.log(`\n--- Word length ${len} ---`);

    if (len === 2) {
      for (const c of LETTERS) {
        const key = `${len}:${c}`;
        if (completedSet.has(key)) continue;
        await scrapePattern(c, len);
        completedSet.add(key);
        progress.completedLengthPrefixes.push(key);
        progress.totalNew = totalNew;
        saveProgress(progress);
      }
    } else {
      for (const c1 of LETTERS) {
        for (const c2 of LETTERS) {
          const key = `${len}:${c1}${c2}`;
          if (completedSet.has(key)) continue;
          await scrapePattern(c1 + c2, len);
          completedSet.add(key);
          progress.completedLengthPrefixes.push(key);
          progress.totalNew = totalNew;
          saveProgress(progress);
        }
      }
    }
  }

  console.log(`\n\n=== DONE ===`);
  console.log(`Pages checked: ${pagesChecked} (${pagesWithResults} with results)`);
  console.log(`New clue pairs: ${totalNew}`);
  console.log(`New words: ${totalWords.size}`);
  console.log(`Output: ${OUTPUT}`);
}

main().catch(console.error);
