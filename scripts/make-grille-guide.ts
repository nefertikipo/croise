/**
 * Generate a grid-PAGE design guide: an A5 page with a representative mots
 * fleches grille (letter cells, clue cells, arrows, a split clue cell, a
 * multi-word break) at true print size — to design the grid-page look around.
 *
 *   pnpm tsx scripts/make-grille-guide.ts
 *
 * Writes .context/grille-guide-a5.svg (+ .png). Not a valid puzzle — a style
 * scaffold showing every element you need to style.
 */

import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const DPI = 300;
const MM = DPI / 25.4;
const px = (mm: number) => +(mm * MM).toFixed(2);

// A5 page.
const TRIM_W = 148;
const TRIM_H = 210;
const BLEED = 3;
const SAFE = 8;

// Grille geometry. 11x17 is the book's default preset (see add-page.tsx);
// cell size is auto-fit to the page.
const COLS = 11;
const ROWS = 17;
const TITLE_H = 16;

/** Which cells are clue cells (deterministic scatter, plausible fleche layout). */
function isClue(r: number, c: number): boolean {
  if (r === 0 && c % 2 === 0) return true;
  if (c === 0 && r % 3 === 0) return true;
  return (r * 5 + c * 3) % 7 === 0;
}

function svg(): string {
  const artW = px(TRIM_W + 2 * BLEED);
  const artH = px(TRIM_H + 2 * BLEED);
  const safeX = px(BLEED + SAFE);
  const safeY = px(BLEED + SAFE);
  const safeW = px(TRIM_W - 2 * SAFE);
  const safeH = px(TRIM_H - 2 * SAFE);

  // Auto-fit square cells into the safe area below the title (reserve page-no).
  const availH = safeH - px(TITLE_H) - px(4) - px(10);
  const cell = +Math.min(safeW / COLS, availH / ROWS).toFixed(2);
  const gridW = COLS * cell;
  const gridH = ROWS * cell;
  const gx = +(safeX + (safeW - gridW) / 2).toFixed(2);
  const gy = +(safeY + px(TITLE_H) + px(4)).toFixed(2);

  const out: string[] = [];

  // Page frame guides.
  out.push(`<rect x="1" y="1" width="${(artW - 2).toFixed(2)}" height="${(artH - 2).toFixed(2)}" fill="none" stroke="#cccccc" stroke-width="2"/>`);
  out.push(`<rect x="${px(BLEED)}" y="${px(BLEED)}" width="${px(TRIM_W)}" height="${px(TRIM_H)}" fill="none" stroke="#c0392b" stroke-width="2"/>`);
  out.push(`<rect x="${safeX}" y="${safeY}" width="${safeW}" height="${safeH}" fill="none" stroke="#2c7a7b" stroke-width="1.5" stroke-dasharray="12 8"/>`);

  // Title zone placeholder.
  out.push(`<rect x="${safeX}" y="${safeY}" width="${safeW}" height="${px(TITLE_H)}" fill="none" stroke="#bbb" stroke-width="1.5" stroke-dasharray="6 6"/>`);
  out.push(`<text x="${(safeX + 8).toFixed(2)}" y="${(safeY + px(TITLE_H) / 2 + 12).toFixed(2)}" font-family="sans-serif" font-size="34" fill="#bbb">zone titre</text>`);

  const strokeW = 3;
  const arrow = (cx: number, cy: number, dir: "right" | "down") => {
    const a = 14;
    return dir === "right"
      ? `<path d="M ${cx} ${cy - a / 2} L ${cx + a} ${cy} L ${cx} ${cy + a / 2} Z" fill="#111"/>`
      : `<path d="M ${cx - a / 2} ${cy} L ${cx + a / 2} ${cy} L ${cx} ${cy + a} Z" fill="#111"/>`;
  };
  const clueLines = (x: number, y: number, w: number, n: number) => {
    const lines: string[] = [];
    for (let i = 0; i < n; i++) {
      const ly = +(y + 12 + i * 10).toFixed(2);
      lines.push(`<line x1="${(x + 6).toFixed(2)}" y1="${ly}" x2="${(x + w - 6).toFixed(2)}" y2="${ly}" stroke="#9a9384" stroke-width="2"/>`);
    }
    return lines.join("");
  };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = +(gx + c * cell).toFixed(2);
      const y = +(gy + r * cell).toFixed(2);
      const clue = isClue(r, c);
      const split = r === 3 && c === 4; // one split (two-clue) cell
      const fill = clue ? "#ece7d8" : "#ffffff";
      out.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${fill}" stroke="#111" stroke-width="${strokeW}"/>`);

      if (split) {
        out.push(`<line x1="${x}" y1="${y}" x2="${(x + cell).toFixed(2)}" y2="${(y + cell).toFixed(2)}" stroke="#111" stroke-width="2"/>`);
        out.push(clueLines(x, y - 2, cell / 2, 1));
        out.push(clueLines(x + cell / 2, y + cell / 2 - 2, cell / 2, 1));
        out.push(arrow(x + cell - 3, y + cell * 0.28, "right"));
        out.push(arrow(x + cell * 0.72, y + cell - 3, "down"));
      } else if (clue) {
        out.push(clueLines(x, y, cell, 3));
        // Give clue cells a direction arrow into an adjacent answer.
        if ((r + c) % 2 === 0 && c < COLS - 1) out.push(arrow(x + cell - 3, y + cell / 2, "right"));
        else if (r < ROWS - 1) out.push(arrow(x + cell / 2, y + cell - 3, "down"));
      }
    }
  }

  // One multi-word break rule (dotted) on a letter-cell edge.
  const bx = +(gx + 6 * cell).toFixed(2);
  const by = +(gy + 8 * cell).toFixed(2);
  out.push(`<line x1="${(bx + cell).toFixed(2)}" y1="${by}" x2="${(bx + cell).toFixed(2)}" y2="${(by + cell).toFixed(2)}" stroke="#c0392b" stroke-width="4" stroke-dasharray="5 5"/>`);

  // Page-number zone.
  out.push(`<text x="${(safeX + safeW / 2).toFixed(2)}" y="${(safeY + safeH - 6).toFixed(2)}" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#bbb">n° page</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${artW}" height="${artH}" viewBox="0 0 ${artW} ${artH}">
  <rect width="${artW}" height="${artH}" fill="#ffffff"/>
  ${out.join("\n  ")}
</svg>`;
}

async function main() {
  await mkdir(".context", { recursive: true });
  const out = svg();
  await writeFile(".context/grille-guide-a5.svg", out);
  await sharp(Buffer.from(out)).png().toFile(".context/grille-guide-a5.png");

  console.log("Wrote .context/grille-guide-a5.svg (+ .png)");
  console.log(`  page: ${TRIM_W}x${TRIM_H}mm (A5) + ${BLEED}mm bleed`);
  console.log(`  grille: ${COLS}x${ROWS} cells (book default preset), cell auto-fit to page`);
  console.log(`  elements: letter cell, clue cell, arrows, split clue cell, dotted break, title + page-number zones`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
