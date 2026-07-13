/** Proposed starter set of composed photo-page templates (art-directed, not
 * grids). Renders a gallery to react to.
 *   pnpm tsx scripts/make-composed-templates.ts  → .context/composed-templates.png */

import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { getPhotoLayout } from "@/lib/book-pdf/photo-layouts";

type Cell = { x: number; y: number; w: number; h: number; kind: "photo" | "graphic" | "empty"; color?: string };
type Template = { label: string; bg: string; lensColor: string; cells: Cell[] };

const RED = "#cc3a2f";
const BLUE = "#0f4c81";
const TEAL = "#108474";
const GOLD = "#bb9a62";
const SUN = "#f1d879";
const CREAM = "#fff6ec";

/** Uniform grid cells (fraction-based). */
function grid(cols: number, rows: number, m: number, g: number): Cell[] {
  const cw = (1 - 2 * m - (cols - 1) * g) / cols;
  const ch = (1 - 2 * m - (rows - 1) * g) / rows;
  const out: Cell[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push({ x: m + c * (cw + g), y: m + r * (ch + g), w: cw, h: ch, kind: "photo" });
  return out;
}

// 1. Sunleak — square grid with graphic tiles interspersed.
const sunleak: Template = {
  label: "Sunleak", bg: CREAM, lensColor: CREAM,
  cells: getPhotoLayout("grille-16").slots.map((s, i) => ({
    x: s.rect.x, y: s.rect.y, w: s.rect.w, h: s.rect.h,
    kind: [1, 4, 6, 11, 13].includes(i) ? "graphic" : "photo",
    color: [TEAL, SUN, BLUE, RED, TEAL][[1, 4, 6, 11, 13].indexOf(i)] ?? TEAL,
  })),
};

// 2. Hermès — Swiss, thick dark lines, mostly empty, sparse photos + one colour.
const hermesCells = grid(3, 4, 0.05, 0.045);
const hermesFilled: Record<number, Cell["kind"] | "color"> = { 0: "photo", 4: "color", 7: "photo", 10: "photo", 2: "photo" };
const hermes: Template = {
  label: "Hermès", bg: "#1a1a1a", lensColor: CREAM,
  cells: hermesCells.map((c, i) => {
    const f = hermesFilled[i];
    if (f === "photo") return { ...c, kind: "photo" };
    if (f === "color") return { ...c, kind: "graphic", color: RED };
    return { ...c, kind: "empty" };
  }),
};

// 3. Une grande — hero + scatter with negative space.
const hero: Template = {
  label: "Une grande", bg: CREAM, lensColor: CREAM,
  cells: [
    { x: 0.06, y: 0.06, w: 0.58, h: 0.42, kind: "photo" },
    { x: 0.68, y: 0.06, w: 0.26, h: 0.26, kind: "graphic", color: RED },
    { x: 0.68, y: 0.36, w: 0.26, h: 0.34, kind: "photo" },
    { x: 0.06, y: 0.54, w: 0.34, h: 0.4, kind: "photo" },
    { x: 0.44, y: 0.54, w: 0.2, h: 0.2, kind: "graphic", color: TEAL },
    { x: 0.44, y: 0.78, w: 0.5, h: 0.16, kind: "photo" },
  ],
};

// 4. Sur couleur — small photos floating on a colour field.
const field: Template = {
  label: "Sur couleur", bg: RED, lensColor: CREAM,
  cells: [
    { x: 0.12, y: 0.12, w: 0.3, h: 0.22, kind: "photo" },
    { x: 0.54, y: 0.26, w: 0.26, h: 0.19, kind: "photo" },
    { x: 0.2, y: 0.46, w: 0.3, h: 0.22, kind: "photo" },
    { x: 0.58, y: 0.6, w: 0.24, h: 0.18, kind: "graphic", color: CREAM },
    { x: 0.16, y: 0.74, w: 0.34, h: 0.16, kind: "photo" },
  ],
};

// 5. Diptyque — two large photos + a colour accent.
const diptyque: Template = {
  label: "Diptyque", bg: CREAM, lensColor: CREAM,
  cells: [
    { x: 0.06, y: 0.06, w: 0.88, h: 0.42, kind: "photo" },
    { x: 0.06, y: 0.52, w: 0.6, h: 0.42, kind: "photo" },
    { x: 0.7, y: 0.52, w: 0.24, h: 0.42, kind: "graphic", color: BLUE },
  ],
};

// 6. Éditorial — mixed sizes, one graphic, breathing room.
const editorial: Template = {
  label: "Éditorial", bg: CREAM, lensColor: CREAM,
  cells: [
    { x: 0.06, y: 0.06, w: 0.88, h: 0.3, kind: "photo" },
    { x: 0.06, y: 0.4, w: 0.4, h: 0.3, kind: "photo" },
    { x: 0.5, y: 0.4, w: 0.2, h: 0.2, kind: "graphic", color: GOLD },
    { x: 0.72, y: 0.4, w: 0.22, h: 0.2, kind: "photo" },
    { x: 0.5, y: 0.64, w: 0.44, h: 0.3, kind: "photo" },
  ],
};

const TEMPLATES: Template[] = [sunleak, hermes, hero, field, diptyque, editorial];

const TW = 210;
const TH = Math.round((TW * 210) / 148);
const COLS = 3;
const GX = 46;
const GY = 30;
const LABEL = 26;

function lens(cx: number, cy: number, lw: number, lh: number): string {
  return `M ${cx - lw / 2} ${cy} Q ${cx} ${cy - lh / 2} ${cx + lw / 2} ${cy} Q ${cx} ${cy + lh / 2} ${cx - lw / 2} ${cy} Z`;
}

function drawCell(c: Cell, ox: number, oy: number, lensColor: string): string {
  const x = ox + c.x * TW;
  const y = oy + c.y * TH;
  const w = c.w * TW;
  const h = c.h * TH;
  if (c.kind === "empty") return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff6ec"/>`;
  if (c.kind === "photo")
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#b9b19d"/><circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) * 0.14}" fill="#a49c86"/>`;
  const cx = x + w / 2;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c.color}"/>
    <path d="${lens(cx, y + h * 0.29, w * 0.78, h * 0.32)}" fill="${lensColor}"/>
    <path d="${lens(cx, y + h * 0.71, w * 0.78, h * 0.32)}" fill="${lensColor}"/>`;
}

function thumb(t: Template, ox: number, oy: number): string {
  const parts = [`<rect x="${ox}" y="${oy}" width="${TW}" height="${TH}" fill="${t.bg}" stroke="#c9bfa8" stroke-width="1"/>`];
  for (const c of t.cells) parts.push(drawCell(c, ox, oy, t.lensColor));
  parts.push(`<text x="${ox + TW / 2}" y="${oy + TH + 18}" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#111">${t.label}</text>`);
  return parts.join("\n");
}

async function main() {
  const rows = Math.ceil(TEMPLATES.length / COLS);
  const width = COLS * TW + (COLS + 1) * GX;
  const height = rows * (TH + LABEL) + (rows + 1) * GY;
  const cells = TEMPLATES.map((t, i) =>
    thumb(t, GX + (i % COLS) * (TW + GX), GY + Math.floor(i / COLS) * (TH + LABEL + GY)),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#e7e0d1"/>
    ${cells.join("\n")}
  </svg>`;
  await mkdir(".context", { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(".context/composed-templates.png");
  console.log(`Wrote .context/composed-templates.png (${TEMPLATES.length} templates)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
