/**
 * Scrape fsolver.fr for crossword clues using Playwright.
 *
 * Strategy: search for each word in our dictionary, extract the
 * "Les définitions du mot X" section (up to 10 clues per word).
 *
 * Usage:
 *   pnpm tsx scripts/scrape-fsolver.ts [--concurrency 3] [--start-from 0]
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { words, clues } from "../src/db/schema/clue-entries";
import { eq, and } from "drizzle-orm";
import { config } from "dotenv";
config({ path: ".env.local" });

const OUTPUT = join(process.cwd(), "data", "french-clues-fsolver.tsv");
const PROGRESS_FILE = join(process.cwd(), "data", "fsolver-progress.json");
const DELAY_MS = 2000;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Cache word IDs to avoid repeated lookups
const wordIdCache = new Map<string, number>();

async function upsertWord(word: string): Promise<number> {
  const cached = wordIdCache.get(word);
  if (cached) return cached;

  // Try to find existing
  const existing = await db
    .select({ id: words.id })
    .from(words)
    .where(and(eq(words.word, word), eq(words.language, "fr")))
    .limit(1);

  if (existing.length > 0) {
    wordIdCache.set(word, existing[0].id);
    return existing[0].id;
  }

  // Insert new
  const inserted = await db
    .insert(words)
    .values({
      word,
      length: word.length,
      language: "fr",
      qualityScore: 80,
      frequency: 1,
    })
    .onConflictDoNothing()
    .returning({ id: words.id });

  if (inserted.length > 0) {
    wordIdCache.set(word, inserted[0].id);
    return inserted[0].id;
  }

  // Race condition: another process inserted it
  const retry = await db
    .select({ id: words.id })
    .from(words)
    .where(and(eq(words.word, word), eq(words.language, "fr")))
    .limit(1);
  const id = retry[0]?.id ?? 0;
  wordIdCache.set(word, id);
  return id;
}

async function insertClue(wordId: number, word: string, clueText: string, source: string) {
  // Skip self-referencing clues
  if (clueText.toUpperCase().includes(word.toUpperCase())) return;

  await db
    .insert(clues)
    .values({
      wordId,
      clue: clueText,
      language: "fr",
      source,
      origin: "scraped",
      verified: false,
    })
    .onConflictDoNothing();
}

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

function loadProgress(): { completedWords: Set<string>; totalPairs: number } {
  try {
    if (existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
      return {
        completedWords: new Set(data.completedWords ?? []),
        totalPairs: data.totalPairs ?? 0,
      };
    }
  } catch {}
  return { completedWords: new Set(), totalPairs: 0 };
}

function saveProgress(completedWords: Set<string>, totalPairs: number) {
  // Only save the count + last N words to keep file small
  const arr = Array.from(completedWords);
  writeFileSync(
    PROGRESS_FILE,
    JSON.stringify({
      completedCount: arr.length,
      totalPairs,
      completedWords: arr,
    }),
    "utf-8",
  );
}

/** Load words to scrape from our clue database (words that already have crossword usage) */
function loadWordsToScrape(): string[] {
  const words = new Set<string>();

  // Load from dico-mots (these are crossword-relevant words)
  const dedupedPath = join(process.cwd(), "data", "french-clues-deduped.tsv");
  const rawPath = join(process.cwd(), "data", "french-clues-dicomots.tsv");
  const filePath = existsSync(dedupedPath) ? dedupedPath : rawPath;

  if (existsSync(filePath)) {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n").slice(1)) {
      const tab = line.indexOf("\t");
      if (tab === -1) continue;
      const answer = normalize(line.slice(0, tab));
      if (answer.length >= 2 && answer.length <= 15 && /^[A-Z]+$/.test(answer)) {
        words.add(answer);
      }
    }
  }

  // Also add words from the French dictionary that are common (short words especially)
  const dictPath = join(process.cwd(), "data", "french-words-full.txt");
  if (existsSync(dictPath)) {
    const content = readFileSync(dictPath, "utf-8");
    for (const line of content.split("\n")) {
      const word = normalize(line.trim());
      // Only add shorter words from general dict (more likely to be in crosswords)
      if (word.length >= 3 && word.length <= 10 && /^[A-Z]+$/.test(word)) {
        words.add(word);
      }
    }
  }

  const arr = Array.from(words);
  // Shuffle for variety
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Extract clues from a fsolver word page */
async function extractClues(page: Page, word: string): Promise<string[]> {
  try {
    await page.goto(`https://www.fsolver.fr/mots-fleches/${word}`, {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await page.waitForTimeout(1500);

    // Extract clues from "Les définitions du mot X" section
    // These are in <li class="ml-n4"> elements
    const clues = await page.$$eval("li.ml-n4", (els) =>
      els
        .map((el) => el.textContent?.trim() ?? "")
        .filter((t) => t.length >= 3 && t.length <= 150),
    );

    return clues;
  } catch {
    return [];
  }
}

async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  return context;
}

async function main() {
  const args = process.argv.slice(2);
  const concIdx = args.indexOf("--concurrency");
  const concurrency = concIdx !== -1 ? parseInt(args[concIdx + 1], 10) : 2;

  console.log("Loading word list...");
  const allWords = loadWordsToScrape();
  console.log(`Total words to check: ${allWords.length}`);

  const progress = loadProgress();
  const remaining = allWords.filter((w) => !progress.completedWords.has(w));
  console.log(`Already done: ${progress.completedWords.size}, remaining: ${remaining.length}`);
  console.log(`Concurrency: ${concurrency}`);

  // Initialize output file
  if (!existsSync(OUTPUT)) {
    writeFileSync(OUTPUT, "answer\tclue\n", "utf-8");
  }

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  // Create worker pages
  const workers: Page[] = [];
  for (let i = 0; i < concurrency; i++) {
    const ctx = await createStealthContext(browser);
    const page = await ctx.newPage();
    // Warm up: navigate to fsolver once to pass Cloudflare (with retry)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto("https://www.fsolver.fr/", { waitUntil: "networkidle", timeout: 30000 });
        break;
      } catch {
        console.log(`Worker ${i + 1} warmup retry ${attempt + 1}...`);
        await page.waitForTimeout(5000);
      }
    }
    await page.waitForTimeout(3000);
    workers.push(page);
    console.log(`Worker ${i + 1} ready`);
  }

  let totalPairs = progress.totalPairs;
  let wordIdx = 0;
  const SAVE_EVERY = 50;

  async function worker(page: Page, workerId: number) {
    while (wordIdx < remaining.length) {
      const idx = wordIdx++;
      const word = remaining[idx];

      const clueTexts = await extractClues(page, word);

      if (clueTexts.length > 0) {
        // Write to TSV (backup)
        const lines = clueTexts.map((c) => `${word}\t${c}`).join("\n");
        appendFileSync(OUTPUT, lines + "\n", "utf-8");

        // Write to database
        try {
          const wordId = await upsertWord(word);
          if (wordId > 0) {
            for (const clueText of clueTexts) {
              await insertClue(wordId, word, clueText, "fsolver");
            }
          }
        } catch (dbErr) {
          // Don't fail the scrape if DB write fails
          console.error(`\nDB error for ${word}:`, dbErr);
        }

        totalPairs += clueTexts.length;
      }

      progress.completedWords.add(word);

      if (idx % 10 === 0) {
        process.stdout.write(
          `\r  [${idx + 1}/${remaining.length}] ${word}: ${clues.length} clues | Total: ${totalPairs} pairs`,
        );
      }

      // Save progress periodically
      if (idx % SAVE_EVERY === 0) {
        saveProgress(progress.completedWords, totalPairs);
      }

      await sleep(DELAY_MS);
    }
  }

  console.log("\nStarting scrape...\n");

  await Promise.all(workers.map((page, i) => worker(page, i)));

  saveProgress(progress.completedWords, totalPairs);
  await browser.close();

  console.log(`\n\n=== DONE ===`);
  console.log(`Total: ${totalPairs} clue pairs in ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
