/**
 * Render example book grids with a photo embedded, one PDF page per preset
 * position, so we can eyeball the feature. Writes .context/example-photo-grids.pdf
 * (and PNGs alongside if pdftoppm is available).
 *
 *   pnpm tsx --env-file=.env.local scripts/example-photo-grids.ts
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
import { reservedRectForPreset, PHOTO_PRESETS } from "@/lib/crossword/photo-presets";
import { ingestPhoto } from "@/lib/book-pdf/photo-ingest";
import { embedBookFonts } from "@/lib/book-pdf/fonts";
import { composeGridPage } from "@/lib/book-pdf/compose-grid-page";
import { PAGE_SPECS, pageGeometry } from "@/lib/book-pdf/geometry";
import type { GridPage } from "@/types/book";

const W = 11;
const H = 17;
const SHOW = ["center", "top-right", "bottom-left"] as const;

/** A photo-ish keepsake image: warm gradient + a heart, big enough to print. */
async function keepsakePhoto(): Promise<Buffer> {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f6c9a8"/>
          <stop offset="0.55" stop-color="#e8896b"/>
          <stop offset="1" stop-color="#8f3f57"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="1600" fill="url(#g)"/>
      <text x="800" y="900" font-size="520" text-anchor="middle" fill="#fff6ec" opacity="0.92">&#9829;</text>
    </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

async function makeGridPage(preset: string, photoRef: string): Promise<GridPage> {
  const rect = reservedRectForPreset(preset, W, H)!;
  const custom = [
    { answer: "LOUISE", clue: "Prénom" },
    { answer: "EMMA", clue: "Prénom" },
    { answer: "JULES", clue: "Prénom" },
  ];
  const res = generateFlecheVector(
    { width: W, height: H, customClues: custom, difficulty: "balanced", reservedRect: rect, timeBudgetMs: 60000 },
    getFrenchWordList(),
    getFrenchClueDb(),
    getFrenchClueDifficulty(),
  );
  if (!res.success) throw new Error(`generation failed for ${preset}`);

  let pattern = "";
  let solution = "";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = res.grid.cells[y][x];
      if (res.grid.reserved?.has(`${x},${y}`)) { pattern += "*"; solution += "#"; }
      else { pattern += cell.kind === "blue" ? "#" : "."; solution += cell.kind === "white" && cell.letter ? cell.letter : "#"; }
    }
  }
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
  const label = PHOTO_PRESETS.find((p) => p.id === preset)?.label ?? preset;
  return {
    kind: "grid", pageId: preset, gridId: preset, code: "EX", position: 0,
    width: W, height: H, cells,
    words: words.map((w) => ({ answer: w.answer, clue: w.clueText, direction: w.direction, isCustom: w.isCustom, difficulty: null })),
    config: { title: `Photo — ${label}`, photo: { preset, photoRef } },
  };
}

async function main() {
  await ensureLoaded();
  const { photoRef } = await ingestPhoto(await keepsakePhoto());

  const spec = PAGE_SPECS.a5;
  const g = pageGeometry(spec);
  const doc = await PDFDocument.create();
  const fonts = await embedBookFonts(doc);

  for (const preset of SHOW) {
    const grid = await makeGridPage(preset, photoRef);
    const page = doc.addPage([g.pageW, g.pageH]);
    await composeGridPage({ doc, page, g, fonts, grid, gridNumber: 1, mode: "puzzle" });
    console.log(`rendered ${preset}`);
  }

  const bytes = await doc.save();
  await mkdir(".context", { recursive: true });
  await writeFile(".context/example-photo-grids.pdf", bytes);
  console.log("Wrote .context/example-photo-grids.pdf");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
