/**
 * Reconcile fsolver-sourced clues against the live "Les définitions du mot X"
 * section (#definitions block).
 *
 * The original scraper read every li.ml-n4 on the page, which also captured a
 * second block (ul.ul-def) holding definitions of OTHER words — so ~13% of
 * fsolver clues are attached to the wrong word.
 *
 * IMPORTANT: the #definitions block shows only a ~10-item rotating SAMPLE of a
 * word's definitions, so absence from the live block does NOT prove a DB clue
 * is misattached (a deletion test on EU/EUE wrongly removed legitimate clues).
 * This script therefore CONFIRMS and INSERTS only — it never deletes:
 *  - DB clues found in the live block are recorded to
 *    data/fsolver-confirmed.tsv (a trust signal for scoring).
 *  - DB clues absent from the live block are recorded to
 *    data/fsolver-unconfirmed.tsv for LLM/agent review.
 *  - Live definitions missing from the DB are inserted.
 *  - Resumable via data/fsolver-reconcile-progress.json.
 *
 * Usage:
 *   pnpm tsx scripts/reconcile-fsolver.ts [--concurrency 3] [--limit N]
 */

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });

const DATA_DIR = join(process.cwd(), "data");
const CONFIRMED_FILE = join(DATA_DIR, "fsolver-confirmed.tsv");
const UNCONFIRMED_FILE = join(DATA_DIR, "fsolver-unconfirmed.tsv");
const PROGRESS_FILE = join(DATA_DIR, "fsolver-reconcile-progress.json");
const DELAY_MS = 1800;

const sql = neon(process.env.DATABASE_URL!);

function normClue(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Progress = { done: string[]; confirmed: number; unconfirmed: number; inserted: number; noSection: string[]; failed: string[] };

function loadProgress(): Progress {
  if (existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    } catch {}
  }
  return { done: [], confirmed: 0, unconfirmed: 0, inserted: 0, noSection: [], failed: [] };
}

/** Extract the ground-truth definitions block. null = page failed to load. */
async function extractDefinitions(page: Page, word: string): Promise<string[] | null | "no-section" | "blocked"> {
  try {
    await page.goto(`https://www.fsolver.fr/mots-fleches/${word}`, {
      waitUntil: "networkidle",
      timeout: 25000,
    });
    await page.waitForTimeout(1000);

    const title = await page.title();
    if (/cloudflare|attention required|blocked/i.test(title)) return "blocked";

    const hasSection = (await page.$("#definitions")) !== null;
    if (!hasSection) return "no-section";

    return await page.$$eval("#definitions li.ml-n4", (els) =>
      els
        .map((el) => el.textContent?.trim() ?? "")
        .filter((t) => t.length >= 3 && t.length <= 150),
    );
  } catch {
    return null;
  }
}

async function reconcileWord(
  word: string,
  wordId: number,
  fresh: string[],
  progress: Progress,
): Promise<void> {
  const freshNorms = new Set(fresh.map(normClue));

  const dbClues = await sql`
    SELECT id, clue, verified FROM clues
    WHERE word_id = ${wordId} AND source = 'fsolver'`;

  const confirmed = dbClues.filter((c) => freshNorms.has(normClue(c.clue as string)));
  const unconfirmed = dbClues.filter((c) => !freshNorms.has(normClue(c.clue as string)));

  if (confirmed.length > 0) {
    appendFileSync(
      CONFIRMED_FILE,
      confirmed.map((c) => [c.id, word, String(c.clue).replace(/\t/g, " ")].join("\t")).join("\n") + "\n",
    );
    progress.confirmed += confirmed.length;
  }
  if (unconfirmed.length > 0) {
    appendFileSync(
      UNCONFIRMED_FILE,
      unconfirmed.map((c) => [c.id, word, String(c.clue).replace(/\t/g, " ")].join("\t")).join("\n") + "\n",
    );
    progress.unconfirmed += unconfirmed.length;
  }

  // Insert genuine definitions we don't have yet (keep the self-reference filter)
  const dbNorms = new Set(dbClues.map((c) => normClue(c.clue as string)));
  const wordNorm = normClue(word);
  const toInsert = fresh.filter((f) => {
    const n = normClue(f);
    return !dbNorms.has(n) && !n.includes(wordNorm);
  });
  for (const clueText of toInsert) {
    await sql`
      INSERT INTO clues (word_id, clue, language, source, origin, verified)
      VALUES (${wordId}, ${clueText}, 'fr', 'fsolver', 'scraped', false)`;
    progress.inserted++;
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
  const concurrency = concIdx !== -1 ? parseInt(args[concIdx + 1], 10) : 3;
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  mkdirSync(DATA_DIR, { recursive: true });
  for (const f of [CONFIRMED_FILE, UNCONFIRMED_FILE]) {
    if (!existsSync(f)) writeFileSync(f, "id\tword\tclue\n");
  }

  const progress = loadProgress();
  const doneSet = new Set(progress.done);

  // Every word with fsolver clues, most-used first so cleanup value front-loads
  const rows = await sql`
    SELECT DISTINCT w.id, w.word, w.frequency
    FROM words w JOIN clues c ON c.word_id = w.id
    WHERE w.language = 'fr' AND c.source = 'fsolver'
    ORDER BY w.frequency DESC, w.id`;
  const queue = rows.filter((r) => !doneSet.has(r.word as string)).slice(0, limit);
  console.log(`Words with fsolver clues: ${rows.length}, already done: ${doneSet.size}, this run: ${queue.length}`);

  // headless:false matches the original scraper's proven Cloudflare-tolerant
  // setup; headless mode got the IP blocked after ~35 requests.
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const workers: Page[] = [];
  for (let i = 0; i < concurrency; i++) {
    const ctx = await createStealthContext(browser);
    const page = await ctx.newPage();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.goto("https://www.fsolver.fr/", { waitUntil: "networkidle", timeout: 30000 });
        break;
      } catch {
        await page.waitForTimeout(5000);
      }
    }
    workers.push(page);
  }
  console.log(`${workers.length} workers ready`);

  let idx = 0;
  let processed = 0;

  async function worker(page: Page) {
    while (idx < queue.length) {
      const i = idx++;
      const row = queue[i];
      const word = row.word as string;

      const fresh = await extractDefinitions(page, word);

      if (fresh === "blocked") {
        // Cloudflare block: back off hard, don't mark done
        progress.failed.push(word);
        console.error(`\nCloudflare block on ${word} — backing off 120s`);
        await new Promise((r) => setTimeout(r, 120_000));
      } else if (fresh === null) {
        progress.failed.push(word); // retry on next run (not marked done)
      } else if (fresh === "no-section") {
        progress.noSection.push(word);
        progress.done.push(word);
      } else {
        try {
          await reconcileWord(word, row.id as number, fresh, progress);
          progress.done.push(word);
        } catch (err) {
          console.error(`\nDB error for ${word}:`, err);
          progress.failed.push(word);
        }
      }

      processed++;
      if (processed % 10 === 0) {
        process.stdout.write(
          `\r[${processed}/${queue.length}] confirmed=${progress.confirmed} unconfirmed=${progress.unconfirmed} inserted=${progress.inserted} noSection=${progress.noSection.length} failed=${progress.failed.length}`,
        );
      }
      if (processed % 50 === 0) {
        writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  await Promise.all(workers.map((p) => worker(p)));
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
  await browser.close();

  console.log(`\n\n=== DONE ===`);
  console.log(`Confirmed: ${progress.confirmed}, unconfirmed: ${progress.unconfirmed}, inserted: ${progress.inserted}`);
  console.log(`No #definitions section: ${progress.noSection.length}, failed (will retry): ${progress.failed.length}`);
}

main().catch((err) => {
  console.error("Reconcile failed:", err);
  process.exit(1);
});
