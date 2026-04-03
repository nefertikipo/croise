/**
 * Fast scraper for cruciverbe.fr French crossword clues.
 * Uses sitemaps + concurrent fetching.
 *
 * Usage:
 *   pnpm tsx scripts/scrape-cruciverbe-fast.ts [--concurrency 10] [--start-from 0]
 *
 * Outputs: data/french-clues.tsv (answer\tclue\tsource)
 * Progress is saved so you can resume.
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from "fs";
import { join } from "path";
import "dotenv/config";

const OUTPUT = join(process.cwd(), "data", "french-clues.tsv");
const PROGRESS_FILE = join(process.cwd(), "data", "scrape-progress.json");
const SITEMAP_COUNT = 21; // 0-20
const DELAY_MS = 100;

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

async function fetchWithRetry(url: string, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (crossword-research-bot)" },
        signal: AbortSignal.timeout(10000),
      });
      if (res.status === 429) {
        console.log("\nRate limited, waiting 5s...");
        await sleep(5000);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries) throw err;
      await sleep(1000);
    }
  }
  throw new Error("Unreachable");
}

/**
 * Extract all definition URLs from a sitemap XML file.
 */
function parseUrls(xml: string): string[] {
  const urls: string[] = [];
  const regex = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

/**
 * Extract answers from a definition page HTML.
 */
function extractAnswers(html: string): string[] {
  const answers: string[] = [];
  const regex = /<span class="k">([^<]+)<\/span>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const answer = normalize(match[1]);
    if (answer.length >= 2 && answer.length <= 15 && /^[A-Z]+$/.test(answer)) {
      answers.push(answer);
    }
  }
  return answers;
}

/**
 * Extract the definition/clue text from a URL.
 */
function urlToClue(url: string): string {
  const slug = url.split("/definitions/")[1];
  if (!slug) return "";
  return decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Process a batch of URLs concurrently.
 */
async function processBatch(
  urls: string[],
  concurrency: number
): Promise<{ answer: string; clue: string }[]> {
  const results: { answer: string; clue: string }[] = [];
  let idx = 0;

  async function worker() {
    while (idx < urls.length) {
      const i = idx++;
      const url = urls[i];
      const clue = urlToClue(url);
      if (!clue || clue.length < 2) continue;

      try {
        await sleep(DELAY_MS);
        const html = await fetchWithRetry(url);
        const answers = extractAnswers(html);
        for (const answer of answers) {
          results.push({ answer, clue });
        }
      } catch {
        // Skip failed URLs
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

function loadProgress(): { completedSitemaps: number[]; totalPairs: number } {
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch {}
  return { completedSitemaps: [], totalPairs: 0 };
}

function saveProgress(completedSitemaps: number[], totalPairs: number) {
  writeFileSync(
    PROGRESS_FILE,
    JSON.stringify({ completedSitemaps, totalPairs }),
    "utf-8"
  );
}

async function main() {
  const args = process.argv.slice(2);
  const concIdx = args.indexOf("--concurrency");
  const concurrency = concIdx !== -1 ? parseInt(args[concIdx + 1], 10) : 5;
  const startIdx = args.indexOf("--start-from");
  const startFrom = startIdx !== -1 ? parseInt(args[startIdx + 1], 10) : -1;

  const progress = loadProgress();

  // Initialize output file if starting fresh
  if (progress.completedSitemaps.length === 0) {
    writeFileSync(OUTPUT, "answer\tclue\n", "utf-8");
  }

  let totalPairs = progress.totalPairs;

  console.log(`Concurrency: ${concurrency}`);
  console.log(`Previously completed sitemaps: ${progress.completedSitemaps.length}`);
  console.log(`Resuming from ${totalPairs} pairs\n`);

  for (let sitemapIdx = 0; sitemapIdx < SITEMAP_COUNT; sitemapIdx++) {
    if (startFrom >= 0 && sitemapIdx < startFrom) continue;
    if (progress.completedSitemaps.includes(sitemapIdx)) {
      console.log(`Sitemap ${sitemapIdx}: already done, skipping`);
      continue;
    }

    console.log(`\n=== Sitemap ${sitemapIdx}/${SITEMAP_COUNT - 1} ===`);

    // Fetch sitemap
    let sitemapXml: string;
    try {
      sitemapXml = await fetchWithRetry(
        `https://cruciverbe.fr/sitemap-definitions-${sitemapIdx}.xml`
      );
    } catch (err) {
      console.error(`Failed to fetch sitemap ${sitemapIdx}:`, err);
      continue;
    }

    const urls = parseUrls(sitemapXml);
    console.log(`Found ${urls.length} definition URLs`);

    // Process in chunks of 200 for progress tracking
    const CHUNK_SIZE = 200;
    let sitemapPairs = 0;

    for (let chunkStart = 0; chunkStart < urls.length; chunkStart += CHUNK_SIZE) {
      const chunk = urls.slice(chunkStart, chunkStart + CHUNK_SIZE);
      const pairs = await processBatch(chunk, concurrency);

      // Append to output
      const lines = pairs.map((p) => `${p.answer}\t${p.clue}`).join("\n");
      if (lines) appendFileSync(OUTPUT, lines + "\n", "utf-8");

      sitemapPairs += pairs.length;
      totalPairs += pairs.length;

      process.stdout.write(
        `\r  Progress: ${chunkStart + chunk.length}/${urls.length} URLs, ${sitemapPairs} pairs this sitemap, ${totalPairs} total`
      );
    }

    console.log(`\n  Sitemap ${sitemapIdx} done: ${sitemapPairs} pairs`);

    progress.completedSitemaps.push(sitemapIdx);
    saveProgress(progress.completedSitemaps, totalPairs);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Total: ${totalPairs} French clue-answer pairs in ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
