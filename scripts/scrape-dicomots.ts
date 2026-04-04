/**
 * Scrape French crossword clue-answer pairs from dico-mots.fr
 *
 * Strategy: For each word in our French word list, fetch the definition page
 * and extract crossword clues from <div class="csi_clue"> blocks.
 *
 * URL pattern: https://www.dico-mots.fr/mots-croises/WORD.html
 *
 * Usage:
 *   pnpm tsx scripts/scrape-dicomots.ts [--concurrency 3] [--start-from 0]
 *
 * Output: data/french-clues-dicomots.tsv (answer\tclue)
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from "fs";
import { join } from "path";

const OUTPUT = join(process.cwd(), "data", "french-clues-dicomots.tsv");
const PROGRESS_FILE = join(process.cwd(), "data", "dicomots-progress.json");
const DELAY_MS = 150;

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

async function fetchWithRetry(url: string, retries = 2): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (crossword-research-bot)" },
        signal: AbortSignal.timeout(10000),
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
      if (i === retries) return null;
      await sleep(2000);
    }
  }
  return null;
}

/**
 * Extract clue-answer pairs from a dico-mots word page.
 * Two sources:
 * 1. "Solutions pour X" section: clues FOR the search word itself
 * 2. <h3>ANSWER</h3> blocks: other words whose definition involves the search word
 */
function extractPairs(html: string, searchWord?: string): { answer: string; clue: string }[] {
  const pairs: { answer: string; clue: string }[] = [];

  // Source 1: Self-clues (Solutions pour X)
  if (searchWord) {
    const normalized = normalize(searchWord);
    const solMatch = /Solutions pour[\s\S]*?class="csi_clue">([\s\S]*?)<\/div>/.exec(html);
    if (solMatch) {
      const titleRegex = /title="([^"]+)"/g;
      let m;
      while ((m = titleRegex.exec(solMatch[1])) !== null) {
        const clue = m[1].trim();
        // Skip nav links and the word itself as its own clue
        if (clue.length >= 3 && clue.length <= 300 && normalize(clue) !== normalized) {
          pairs.push({ answer: normalized, clue });
        }
      }
    }
  }

  // Source 2: Answer blocks with clues
  const blockRegex = /<h3[^>]*>([A-Z]+)<\/h3>[\s\S]*?<div class="csi_clue">([\s\S]*?)<\/div>/g;
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

function loadProgress(): { processed: number; totalPairs: number } {
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch {}
  return { processed: 0, totalPairs: 0 };
}

function saveProgress(processed: number, totalPairs: number) {
  writeFileSync(PROGRESS_FILE, JSON.stringify({ processed, totalPairs }), "utf-8");
}

async function main() {
  const args = process.argv.slice(2);
  const concIdx = args.indexOf("--concurrency");
  const concurrency = concIdx !== -1 ? parseInt(args[concIdx + 1], 10) : 3;
  const startAtIdx = args.indexOf("--start-at");
  const startAt = startAtIdx !== -1 ? parseInt(args[startAtIdx + 1], 10) : 0;
  const endAtIdx = args.indexOf("--end-at");
  const endAt = endAtIdx !== -1 ? parseInt(args[endAtIdx + 1], 10) : Infinity;
  const maxLetters = args.includes("--short") ? 8 : 15;

  // Load French word list
  const wordListPath = join(process.cwd(), "data", "french-words-full.txt");
  if (!existsSync(wordListPath)) {
    console.error("Missing data/french-words-full.txt");
    process.exit(1);
  }

  const allWords = readFileSync(wordListPath, "utf-8")
    .split("\n")
    .map((w) => w.trim().toLowerCase())
    .filter((w) => {
      const normalized = w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return w.length >= 3 && w.length <= maxLetters && /^[a-z]+$/i.test(normalized);
    });

  // Deduplicate and apply range
  const uniqueWords = [...new Set(allWords)].slice(startAt, endAt === Infinity ? undefined : endAt);
  console.log(`Word list: ${uniqueWords.length} words (range ${startAt}-${startAt + uniqueWords.length}, max ${maxLetters} letters)`);

  const progress = loadProgress();
  const startFrom = progress.processed;

  if (startFrom === 0) {
    writeFileSync(OUTPUT, "answer\tclue\n", "utf-8");
  }

  console.log(`Concurrency: ${concurrency}`);
  console.log(`Resuming from word #${startFrom} of ${uniqueWords.length}`);
  console.log(`Previously collected: ${progress.totalPairs} pairs\n`);

  let totalPairs = progress.totalPairs;
  let processed = startFrom;
  let notFound = 0;

  // Process in batches
  const BATCH_SIZE = 100;

  for (let batchStart = startFrom; batchStart < uniqueWords.length; batchStart += BATCH_SIZE) {
    const batch = uniqueWords.slice(batchStart, batchStart + BATCH_SIZE);

    // Concurrent fetch within batch
    let batchIdx = 0;
    const batchPairs: { answer: string; clue: string }[] = [];

    async function worker() {
      while (batchIdx < batch.length) {
        const i = batchIdx++;
        const word = batch[i];
        const url = `https://www.dico-mots.fr/mots-croises/${encodeURIComponent(word)}.html`;

        await sleep(DELAY_MS);

        const html = await fetchWithRetry(url);
        if (!html) {
          notFound++;
          continue;
        }

        const pairs = extractPairs(html, word);
        batchPairs.push(...pairs);
      }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    // Append to output
    if (batchPairs.length > 0) {
      const lines = batchPairs.map((p) => `${p.answer}\t${p.clue}`).join("\n");
      appendFileSync(OUTPUT, lines + "\n", "utf-8");
      totalPairs += batchPairs.length;
    }

    processed += batch.length;
    process.stdout.write(
      `\r${processed}/${uniqueWords.length} words | ${totalPairs} pairs | ${notFound} not found`
    );

    // Save progress every batch
    if (processed % 500 === 0) {
      saveProgress(processed, totalPairs);
    }
  }

  saveProgress(processed, totalPairs);
  console.log(`\n\nDone! ${totalPairs} French clue-answer pairs in ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
