/**
 * Build the FILLER BANK of contribuer-word grids, standalone (no dev server).
 *
 * Uses its OWN worker pool (fewer workers than cores so the main-thread timeout
 * stays responsive), races each grid across it, and saves straight to the DB —
 * isolated from browser traffic and the route's fixed budget. Covers the whole
 * contribuer pool, partitioned so no word repeats across grids; climbs each grid
 * to the densest count the pool can solve, keeps the best, drops intermediates.
 *
 *   set -a; source .env.local; set +a
 *   node_modules/.bin/tsx scripts/build-filler-bank.ts
 */
import { cpus } from "node:os";
import { neon } from "@neondatabase/serverless";
import { FlechePool } from "@/lib/crossword/fleche-pool";
import type { VectorGenResult } from "@/lib/crossword/fleche-vector-gen";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { generateCrosswordCode } from "@/lib/code";

const W = 11, H = 17;
// RESUME mode: keep existing "Filler contribuer #" grids, seed `used` from what
// they already cover, continue numbering, and only place the leftover words.
const RESUME = process.env.RESUME !== "0";
const START_K = RESUME ? 6 : 8; // leftovers are the hard words → start lower
const MAX_K = RESUME ? 9 : 12;
const RETRIES = 3;
const MIN_TAIL = 3;
const MAX_WAIT_MS = 95000;
const WORKERS = Math.max(4, cpus().length - 3); // leave headroom for the timer

type Word = { answer: string; clue: string };

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function hardness(w: string): number {
  const rare = [...w].filter((c) => "JKQWXYZ".includes(c)).length;
  return rare * 4 + Math.max(0, w.length - 9) * 3;
}

const sql = neon(process.env.DATABASE_URL!);

async function saveGrid(result: VectorGenResult, title: string): Promise<string> {
  const { grid, words } = result;
  let pattern = "", solution = "";
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      pattern += cell.kind === "blue" ? "#" : ".";
      solution += cell.kind === "white" && cell.letter ? cell.letter : "#";
    }
  }
  const code = generateCrosswordCode();
  const [saved] = await db.insert(crosswords).values({
    code, ownerId: null, language: "fr", title,
    width: grid.width, height: grid.height,
    gridPattern: pattern, gridSolution: solution, hiddenWord: null, status: "ready",
    theme: "filler-contribuer", // marks it as a shared filler-bank grid
  }).returning({ id: crosswords.id });

  const wordRows = words.map((w, i) => ({
    crosswordId: saved.id,
    answer: w.word,
    direction: (w.slot.direction === "horizontal" ? "right" : "down") as "right" | "down",
    number: i + 1,
    startRow: w.slot.cells[0].y,
    startCol: w.slot.cells[0].x,
    length: w.slot.length,
    clueText: w.clueText,
    isCustom: w.isCustom,
    difficulty: w.difficulty,
    breaks: null as string | null,
  }));
  if (wordRows.length) await db.insert(placedWords).values(wordRows);
  return code;
}

async function main() {
  let startGridNo = 0;
  const used = new Set<string>();
  if (RESUME) {
    const covered = (await sql`
      SELECT DISTINCT p.answer FROM crosswords x JOIN placed_words p ON p.crossword_id = x.id
      WHERE x.title ILIKE ${"filler contribuer%"} AND p.is_custom
    `) as { answer: string }[];
    covered.forEach((r) => used.add(r.answer));
    const nums = (await sql`SELECT title FROM crosswords WHERE title ILIKE ${"filler contribuer%"}`) as { title: string }[];
    startGridNo = nums.reduce((m, r) => Math.max(m, Number(r.title.match(/\d+/)?.[0] ?? 0)), 0);
    console.log(`Resuming: ${used.size} words already covered across ${startGridNo} grids.`);
  } else {
    const del = await sql`DELETE FROM crosswords WHERE title ILIKE ${"contribuer #%"} OR title ILIKE ${"filler contribuer%"} RETURNING code`;
    if (del.length) console.log(`Cleared ${del.length} prior grids.`);
  }

  const rows = (await sql`
    SELECT DISTINCT ON (w.word) w.word AS answer, c.clue
    FROM clues c JOIN words w ON w.id = c.word_id
    WHERE c.origin = 'user' AND w.language = 'fr' AND length(w.word) >= 3
    ORDER BY w.word, c.id
  `) as { answer: string; clue: string }[];
  const pool: Word[] = rows.map((r) => ({ answer: r.answer, clue: r.clue || "Indice" }));

  const fp = new FlechePool(WORKERS);
  await fp.ready();
  console.log(`Pool ${pool.length} words · ${fp.size} workers · covering whole pool at ${W}×${H}\n`);

  async function tryGrid(custom: Word[], title: string): Promise<string | null> {
    const r = await fp.generate({ width: W, height: H, customClues: custom, difficulty: "balanced" }, { maxWaitMs: MAX_WAIT_MS });
    if (!r.result?.success) return null;
    const placed = r.result.words.filter((w) => w.isCustom).length;
    if (placed < custom.length) return null;
    return await saveGrid(r.result, title);
  }

  const results: { code: string; count: number; words: string[] }[] = [];
  let gridNo = startGridNo;

  while (true) {
    const remaining = pool.filter((w) => !used.has(w.answer));
    if (remaining.length < MIN_TAIL) {
      if (remaining.length) console.log(`\nUnplaced tail: ${remaining.map((w) => w.answer).join(", ")}`);
      break;
    }
    gridNo++;
    const easy = [...remaining].sort((a, b) => hardness(a.answer) - hardness(b.answer));
    const window = easy.slice(0, Math.max(MAX_K + 4, Math.ceil(easy.length * 0.75)));
    const title = `Filler contribuer #${gridNo}`;

    let best: { code: string; words: Word[] } | null = null;
    const floorK = Math.min(START_K, remaining.length);
    // Climb up from the floor.
    for (let k = floorK; k <= Math.min(MAX_K, remaining.length); k++) {
      let ok: string | null = null, batch: Word[] = [];
      for (let a = 0; a < RETRIES; a++) {
        batch = shuffle(window, mulberry32(1000 * gridNo + 37 * k + a)).slice(0, k);
        process.stdout.write(`  grid ${gridNo}: ${k} words (try ${a + 1}/${RETRIES})... `);
        ok = await tryGrid(batch, title);
        console.log(ok ? `OK → ${ok}` : "fail");
        if (ok) break;
      }
      if (!ok) break;
      if (best) await sql`DELETE FROM crosswords WHERE code = ${best.code}`; // supersede inline
      best = { code: ok, words: batch };
    }
    // Fallback below the floor if needed.
    if (!best) {
      for (let k = floorK - 1; k >= MIN_TAIL && !best; k--) {
        for (let a = 0; a < RETRIES; a++) {
          const batch = shuffle(window, mulberry32(9000 * gridNo + 37 * k + a)).slice(0, k);
          process.stdout.write(`  grid ${gridNo}: (fallback) ${k} words (try ${a + 1})... `);
          const ok = await tryGrid(batch, title);
          console.log(ok ? `OK → ${ok}` : "fail");
          if (ok) { best = { code: ok, words: batch }; break; }
        }
      }
    }

    if (best) {
      best.words.forEach((w) => used.add(w.answer));
      results.push({ code: best.code, count: best.words.length, words: best.words.map((w) => w.answer) });
      console.log(`  → grid ${gridNo}: ${best.words.length} words — ${best.code}  (${pool.length - used.size} left)\n`);
    } else {
      const hardest = [...remaining].sort((a, b) => hardness(b.answer) - hardness(a.answer))[0];
      console.log(`  → grid ${gridNo}: nothing solved, parking "${hardest.answer}"\n`);
      used.add(hardest.answer);
      gridNo--;
    }
  }

  console.log("\n" + "=".repeat(64));
  console.log(`NEW THIS RUN — ${results.length} grids, ${results.reduce((n, r) => n + r.count, 0)} words placed`);
  console.log("=".repeat(64));
  for (const r of results) console.log(`  ${r.code}  ${String(r.count).padStart(2)}w — ${r.words.join(", ")}`);
  const counts = results.map((r) => r.count);
  if (counts.length) console.log(`\ncounts: ${counts.join(", ")}  (max ${Math.max(...counts)}, avg ${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)})`);
  await fp.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
