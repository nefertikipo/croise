/**
 * Scrape French crossword clue-answer pairs from cruciverbe.fr
 *
 * Strategy:
 * 1. Get all definition URLs from /definitions-par-lettre/{a-z}/{page}
 * 2. Visit each definition page and extract answers from <span class="k">
 * 3. Save as TSV: answer\tclue
 *
 * Usage:
 *   pnpm tsx scripts/scrape-cruciverbe.ts
 *
 * Output: data/french-clues.tsv
 */

import { writeFileSync, appendFileSync, existsSync } from "fs";
import { join } from "path";

const BASE = "https://cruciverbe.fr";
const OUTPUT = join(process.cwd(), "data", "french-clues.tsv");
const DELAY_MS = 200; // Be polite

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalize(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (crossword-research)" },
  });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}

/**
 * Get all definition URLs from a letter page.
 */
function extractDefLinks(html: string): string[] {
  const links: string[] = [];
  const regex = /href="(\/definitions\/[^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    // Skip navigation links (definitions-par-lettre, etc.)
    if (!href.includes("definitions-par-lettre") && href !== "/definitions") {
      links.push(href);
    }
  }
  return [...new Set(links)];
}

/**
 * Get pagination links from a letter page.
 */
function extractPageLinks(html: string, letter: string): number[] {
  const pages: number[] = [];
  const regex = new RegExp(
    `href="/definitions-par-lettre/${letter}/(\\d+)"`,
    "g"
  );
  let match;
  while ((match = regex.exec(html)) !== null) {
    pages.push(parseInt(match[1], 10));
  }
  return [...new Set(pages)].sort((a, b) => a - b);
}

/**
 * Extract answers from a definition page.
 */
function extractAnswers(html: string): string[] {
  const answers: string[] = [];
  const regex = /<span class="k">([^<]+)<\/span>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const answer = normalize(match[1]);
    if (answer.length >= 3 && answer.length <= 15) {
      answers.push(answer);
    }
  }
  return answers;
}

/**
 * Extract the definition text from a definition page URL slug.
 */
function slugToDefinition(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/^\/definitions\//, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

async function main() {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");

  // Initialize output file
  writeFileSync(OUTPUT, "answer\tclue\n", "utf-8");

  let totalPairs = 0;
  let totalPages = 0;

  for (const letter of letters) {
    console.log(`\n=== Letter ${letter.toUpperCase()} ===`);

    // Get first page to discover pagination
    const firstUrl = `${BASE}/definitions-par-lettre/${letter}`;
    let firstHtml: string;
    try {
      firstHtml = await fetchPage(firstUrl);
    } catch (err) {
      console.error(`Failed to fetch ${firstUrl}:`, err);
      continue;
    }

    const pageNums = extractPageLinks(firstHtml, letter);
    const allPages = [0, ...pageNums]; // Page 0 is the first page (no number in URL)
    console.log(`Found ${allPages.length} pages for letter ${letter.toUpperCase()}`);

    // Collect all definition URLs across all pages
    const allDefLinks: string[] = [];

    // Process first page
    allDefLinks.push(...extractDefLinks(firstHtml));

    // Process remaining pages
    for (const pageNum of pageNums) {
      await sleep(DELAY_MS);
      const url = `${BASE}/definitions-par-lettre/${letter}/${pageNum}`;
      try {
        const html = await fetchPage(url);
        allDefLinks.push(...extractDefLinks(html));
        totalPages++;
      } catch (err) {
        console.error(`Failed page ${pageNum}:`, err);
      }
    }

    const uniqueLinks = [...new Set(allDefLinks)];
    console.log(`Found ${uniqueLinks.length} definitions for letter ${letter.toUpperCase()}`);

    // Visit each definition page and extract answers
    let letterPairs = 0;
    for (let i = 0; i < uniqueLinks.length; i++) {
      const defLink = uniqueLinks[i];
      const clue = slugToDefinition(defLink);

      await sleep(DELAY_MS);

      try {
        const html = await fetchPage(`${BASE}${defLink}`);
        const answers = extractAnswers(html);

        for (const answer of answers) {
          appendFileSync(OUTPUT, `${answer}\t${clue}\n`, "utf-8");
          letterPairs++;
          totalPairs++;
        }
      } catch {
        // Skip failed pages
      }

      if ((i + 1) % 100 === 0) {
        process.stdout.write(
          `\r  ${letter.toUpperCase()}: ${i + 1}/${uniqueLinks.length} definitions, ${letterPairs} pairs`
        );
      }
    }

    console.log(
      `\n  ${letter.toUpperCase()} done: ${letterPairs} clue-answer pairs`
    );
  }

  console.log(`\n=== DONE ===`);
  console.log(`Total: ${totalPairs} clue-answer pairs saved to ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
