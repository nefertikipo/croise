/**
 * Second-pass scraper: look up our existing ANSWERS on dico-mots
 * to find clues FOR those words.
 *
 * This fills the gap: the main scraper finds clues by searching dictionary words,
 * but many crossword answers only get clues when searched directly.
 *
 * Usage:
 *   pnpm tsx scripts/scrape-dicomots-answers.ts [--concurrency 10]
 *
 * Reads: data/french-clues-dicomots.tsv (to get unique answers)
 * Appends to: data/french-clues-dicomots.tsv
 */

import { readFileSync, appendFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

const OUTPUT = join(process.cwd(), "data", "french-clues-dicomots.tsv");
const PROGRESS_FILE = join(process.cwd(), "data", "dicomots-answers-progress.json");
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
        headers: { "User-Agent": "Mozilla/5.0 (crossword-research)" },
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

function extractSelfClues(html: string, answer: string): string[] {
  const clues: string[] = [];
  const normalized = normalize(answer);

  // Find "Solutions pour X" section
  const solMatch = /Solutions pour[\s\S]*?class="csi_clue">([\s\S]*?)<\/div>/.exec(html);
  if (solMatch) {
    const titleRegex = /title="([^"]+)"/g;
    let m;
    while ((m = titleRegex.exec(solMatch[1])) !== null) {
      const clue = m[1].trim();
      if (clue.length >= 3 && clue.length <= 300 && normalize(clue) !== normalized) {
        clues.push(clue);
      }
    }
  }

  return clues;
}

function loadProgress(): { processed: number } {
  try {
    if (existsSync(PROGRESS_FILE))
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
  } catch {}
  return { processed: 0 };
}

function saveProgress(processed: number) {
  writeFileSync(PROGRESS_FILE, JSON.stringify({ processed }), "utf-8");
}

async function main() {
  const args = process.argv.slice(2);
  const concIdx = args.indexOf("--concurrency");
  const concurrency = concIdx !== -1 ? parseInt(args[concIdx + 1], 10) : 5;

  // Get unique answers from existing data
  console.log("Loading existing answers...");
  const content = readFileSync(OUTPUT, "utf-8");
  const existingAnswers = new Set<string>();
  for (const line of content.split("\n").slice(1)) {
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    existingAnswers.add(normalize(line.slice(0, tab)));
  }

  const answers = [...existingAnswers].sort();
  console.log(`${answers.length} unique answers to look up`);

  const progress = loadProgress();
  console.log(`Resuming from #${progress.processed}`);

  let totalNew = 0;
  const BATCH_SIZE = 50;

  for (let batchStart = progress.processed; batchStart < answers.length; batchStart += BATCH_SIZE) {
    const batch = answers.slice(batchStart, batchStart + BATCH_SIZE);
    let batchIdx = 0;
    const newPairs: { answer: string; clue: string }[] = [];

    async function worker() {
      while (batchIdx < batch.length) {
        const i = batchIdx++;
        const answer = batch[i];
        const url = `https://www.dico-mots.fr/mots-croises/${encodeURIComponent(answer.toLowerCase())}.html`;

        await sleep(DELAY_MS);
        const html = await fetchWithRetry(url);
        if (!html) continue;

        const clues = extractSelfClues(html, answer);
        for (const clue of clues) {
          newPairs.push({ answer, clue });
        }
      }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    if (newPairs.length > 0) {
      const lines = newPairs.map((p) => `${p.answer}\t${p.clue}`).join("\n");
      appendFileSync(OUTPUT, lines + "\n", "utf-8");
      totalNew += newPairs.length;
    }

    const processed = batchStart + batch.length;
    process.stdout.write(`\r${processed}/${answers.length} answers | ${totalNew} new clues found`);

    if (processed % 500 === 0) saveProgress(processed);
  }

  saveProgress(answers.length);
  console.log(`\n\nDone! Found ${totalNew} new self-clues for existing answers.`);
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
