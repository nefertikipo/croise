/**
 * End-to-end verification of the photo-in-grid pipeline (server side):
 *   generate with a reserved center block → encode gridPattern with `*` (as
 *   generate-grid does) → reconstructCells → assert the block is empty and no
 *   word crosses it → render a real PDF grid page with a photo composited into
 *   the block (exercises sharp crop + embedJpg + geometry).
 *
 *   pnpm tsx --env-file=.env.local scripts/verify-photo-pipeline.ts
 *
 * Writes .context/proof-photo-grid.pdf. Exits non-zero on any failed assertion.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import {
  ensureLoaded,
  getFrenchWordList,
  getFrenchClueDb,
  getFrenchClueDifficulty,
} from "@/lib/crossword/load-french-clues";
import { generateFlecheVector } from "@/lib/crossword/fleche-vector-gen";
import { reconstructCells } from "@/lib/crossword/reconstruct-cells";
import { reservedRectForPreset } from "@/lib/crossword/photo-presets";
import { ingestPhoto } from "@/lib/book-pdf/photo-ingest";
import { embedBookFonts } from "@/lib/book-pdf/fonts";
import { composeGridPage } from "@/lib/book-pdf/compose-grid-page";
import { PAGE_SPECS, pageGeometry } from "@/lib/book-pdf/geometry";
import type { GridPage } from "@/types/book";

const W = 11;
const H = 17;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

async function main() {
  await ensureLoaded();
  const wl = getFrenchWordList();
  const db = getFrenchClueDb();
  const diff = getFrenchClueDifficulty();

  const rect = reservedRectForPreset("center", W, H);
  assert(!!rect, `center preset resolves to a rect on ${W}×${H}`);
  if (!rect) return;
  console.log(`  reserved rect: x=${rect.x} y=${rect.y} w=${rect.w} h=${rect.h}`);

  // Generate with the reserved block + a few custom words (the real book case).
  const custom = [
    { answer: "LOUISE", clue: "Prénom" },
    { answer: "EMMA", clue: "Prénom" },
    { answer: "JULES", clue: "Prénom" },
  ];
  const res = generateFlecheVector(
    { width: W, height: H, customClues: custom, difficulty: "balanced", reservedRect: rect, timeBudgetMs: 60000 },
    wl,
    db,
    diff,
  );
  assert(res.success, "generation succeeded with a reserved block + 3 custom words");

  // Encode gridPattern / gridSolution exactly as generate-grid.ts does.
  const reserved = res.grid.reserved;
  let pattern = "";
  let solution = "";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = res.grid.cells[y][x];
      if (reserved?.has(`${x},${y}`)) {
        pattern += "*";
        solution += "#";
      } else {
        pattern += cell.kind === "blue" ? "#" : ".";
        solution += cell.kind === "white" && cell.letter ? cell.letter : "#";
      }
    }
  }
  const starCount = [...pattern].filter((c) => c === "*").length;
  assert(starCount === rect.w * rect.h, `gridPattern has ${rect.w * rect.h} '*' cells (got ${starCount})`);

  // Reconstruct and assert the block is empty and everything else is intact.
  const words = res.words.map((w) => ({
    answer: w.word,
    direction: w.slot.direction === "horizontal" ? "right" : "down",
    startRow: w.slot.cells[0].y,
    startCol: w.slot.cells[0].x,
    length: w.slot.length,
    clueText: w.clueText,
    isCustom: false,
    breaks: null as string | null,
  }));
  const cells = reconstructCells({ width: W, height: H, gridPattern: pattern, gridSolution: solution }, words);

  let emptyInRect = 0;
  let emptyOutsideRect = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inRect = x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
      if (cells[y][x].type === "empty") {
        if (inRect) emptyInRect++;
        else emptyOutsideRect++;
      } else if (inRect) {
        console.error(`  cell (${x},${y}) in block is ${cells[y][x].type}, expected empty`);
      }
    }
  }
  assert(emptyInRect === rect.w * rect.h, `all ${rect.w * rect.h} block cells reconstruct as 'empty'`);
  assert(emptyOutsideRect === 0, "no 'empty' cells outside the block");

  // Render a real PDF page with a photo composited into the block.
  const photoBytes = await sharp({
    create: { width: 1600, height: 1600, channels: 3, background: { r: 210, g: 90, b: 70 } },
  }).jpeg().toBuffer();
  const { photoRef } = await ingestPhoto(photoBytes);
  assert(!!photoRef, "synthetic photo ingested to a photoRef");

  const gridPage: GridPage = {
    kind: "grid",
    pageId: "verify",
    gridId: "verify",
    code: "VERIFY",
    position: 0,
    width: W,
    height: H,
    cells,
    words: words.map((w) => ({ answer: w.answer, clue: w.clueText, direction: w.direction, isCustom: w.isCustom, difficulty: null })),
    config: { title: "Photo test", photo: { preset: "center", photoRef, crop: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } } },
  };

  const spec = PAGE_SPECS.a5;
  const g = pageGeometry(spec);
  const doc = await PDFDocument.create();
  const fonts = await embedBookFonts(doc);
  const page = doc.addPage([g.pageW, g.pageH]);
  await composeGridPage({ doc, page, g, fonts, grid: gridPage, gridNumber: 1, mode: "puzzle" });
  const bytes = await doc.save();
  await mkdir(".context", { recursive: true });
  await writeFile(".context/proof-photo-grid.pdf", bytes);
  assert(bytes.length > 1000, "PDF with grid photo rendered without error");
  console.log("\nWrote .context/proof-photo-grid.pdf");
  console.log("\nAll photo-pipeline checks passed.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
