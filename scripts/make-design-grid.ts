/**
 * Generate a print design guide (bleed / trim / safe + modular grid) to design
 * cover and photo-page templates on.
 *
 *   pnpm tsx scripts/make-design-grid.ts
 *
 * Writes .context/design-grid-a5.svg (+ .png preview). Import the SVG into
 * Figma as a locked background layer and design on top of it.
 */

import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const DPI = 300;
const MM = DPI / 25.4; // px per mm at 300 DPI

// A5 page.
const TRIM_W = 148;
const TRIM_H = 210;
const BLEED = 3;
const SAFE = 8; // keep text / key content this far inside the trim
const COLS = 6;
const ROWS = 9;

const px = (mm: number) => +(mm * MM).toFixed(2);

function svg(): string {
  const artW = px(TRIM_W + 2 * BLEED);
  const artH = px(TRIM_H + 2 * BLEED);
  const b = px(BLEED);
  const trimW = px(TRIM_W);
  const trimH = px(TRIM_H);
  const s = px(BLEED + SAFE);
  const safeW = px(TRIM_W - 2 * SAFE);
  const safeH = px(TRIM_H - 2 * SAFE);

  const lines: string[] = [];

  // Modular grid inside the safe area (the light scaffold to design against).
  for (let c = 1; c < COLS; c++) {
    const x = +(s + (safeW * c) / COLS).toFixed(2);
    lines.push(`<line x1="${x}" y1="${s}" x2="${x}" y2="${s + safeH}" stroke="#e3ddce" stroke-width="1.5"/>`);
  }
  for (let r = 1; r < ROWS; r++) {
    const y = +(s + (safeH * r) / ROWS).toFixed(2);
    lines.push(`<line x1="${s}" y1="${y}" x2="${s + safeW}" y2="${y}" stroke="#e3ddce" stroke-width="1.5"/>`);
  }

  // Crop marks at the four trim corners (drawn into the bleed).
  const L = px(3);
  const G = px(1.5);
  const marks: string[] = [];
  const corner = (cx: number, cy: number, sx: number, sy: number) => {
    marks.push(`<line x1="${(cx + sx * G).toFixed(2)}" y1="${cy}" x2="${(cx + sx * (G + L)).toFixed(2)}" y2="${cy}" stroke="#111" stroke-width="1"/>`);
    marks.push(`<line x1="${cx}" y1="${(cy + sy * G).toFixed(2)}" x2="${cx}" y2="${(cy + sy * (G + L)).toFixed(2)}" stroke="#111" stroke-width="1"/>`);
  };
  corner(b, b, -1, -1);
  corner(b + trimW, b, 1, -1);
  corner(b, b + trimH, -1, 1);
  corner(b + trimW, b + trimH, 1, 1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${artW}" height="${artH}" viewBox="0 0 ${artW} ${artH}">
  <rect width="${artW}" height="${artH}" fill="#ffffff"/>
  ${lines.join("\n  ")}
  <!-- safe margin (keep title/text inside): turquoise dashed -->
  <rect x="${s}" y="${s}" width="${safeW}" height="${safeH}" fill="none" stroke="#2c7a7b" stroke-width="2" stroke-dasharray="12 8"/>
  <!-- trim / cut line: red -->
  <rect x="${b}" y="${b}" width="${trimW}" height="${trimH}" fill="none" stroke="#c0392b" stroke-width="2"/>
  <!-- bleed / artboard edge: grey -->
  <rect x="1" y="1" width="${(artW - 2).toFixed(2)}" height="${(artH - 2).toFixed(2)}" fill="none" stroke="#cccccc" stroke-width="2"/>
  ${marks.join("\n  ")}
</svg>`;
}

async function main() {
  await mkdir(".context", { recursive: true });
  const out = svg();
  await writeFile(".context/design-grid-a5.svg", out);
  await sharp(Buffer.from(out)).png().toFile(".context/design-grid-a5.png");

  console.log("Wrote .context/design-grid-a5.svg (+ .png)");
  console.log(`  artboard (bleed): ${px(TRIM_W + 2 * BLEED)} x ${px(TRIM_H + 2 * BLEED)} px  = ${TRIM_W + 2 * BLEED} x ${TRIM_H + 2 * BLEED} mm`);
  console.log(`  trim (cut):       ${px(TRIM_W)} x ${px(TRIM_H)} px  = ${TRIM_W} x ${TRIM_H} mm (A5)`);
  console.log(`  safe box:         ${px(TRIM_W - 2 * SAFE)} x ${px(TRIM_H - 2 * SAFE)} px  (${SAFE}mm inside trim)`);
  console.log(`  modular grid:     ${COLS} cols x ${ROWS} rows inside safe`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
