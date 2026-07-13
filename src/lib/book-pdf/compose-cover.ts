/**
 * Server-side cover composition engine.
 *
 * Given a CoverTemplate (data) + CoverContent (photo + title), produces a
 * print-ready PDF: full-resolution photo cropped into its slot, the "gridify"
 * vector overlay, a placeholder frame, the title, and — crucially — a proper
 * trim size + bleed with crop marks. Pure server-side (pdf-lib + sharp); no
 * headless browser. Everything except the photo prints as sharp vector.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import sharp from "sharp";
import { scramble } from "@/lib/design/shuffle-grid";
import type { CoverTemplate, CoverContent, FracRect, BleedEdges, ShuffleEffect } from "@/lib/book-pdf/template-spec";

/** Cover title fonts, read from public/fonts and cached by filename. */
const fontCache = new Map<string, Buffer>();
async function loadTitleFont(file: string): Promise<Buffer> {
  let bytes = fontCache.get(file);
  if (!bytes) {
    bytes = await readFile(join(process.cwd(), "public/fonts", file));
    fontCache.set(file, bytes);
  }
  return bytes;
}

/** Print resolution for embedded raster (photos). */
const DPI = 300;
const MM_PER_INCH = 25.4;

const mm2pt = (mm: number) => (mm * 72) / MM_PER_INCH;
const mm2px = (mm: number) => Math.round((mm / MM_PER_INCH) * DPI);

function hex2rgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

interface Geometry {
  pageW: number;
  pageH: number;
  bleedPt: number;
  trimWpt: number;
  trimHpt: number;
}

/** Resolve a top-left trim-relative FracRect (optionally bleeding to the page
 * edge) into a bottom-left-origin PDF rectangle in points. */
function resolveRect(rect: FracRect, bleed: BleedEdges | undefined, g: Geometry) {
  let left = g.bleedPt + rect.x * g.trimWpt;
  let right = g.bleedPt + (rect.x + rect.w) * g.trimWpt;
  // y measured from the trim top, then flipped to bottom-left origin.
  let top = g.pageH - (g.bleedPt + rect.y * g.trimHpt);
  let bottom = g.pageH - (g.bleedPt + (rect.y + rect.h) * g.trimHpt);

  if (bleed?.left) left = 0;
  if (bleed?.right) right = g.pageW;
  if (bleed?.top) top = g.pageH;
  if (bleed?.bottom) bottom = 0;

  return { x: left, y: bottom, width: right - left, height: top - bottom };
}

/** Crop the photo to exactly the slot aspect at 300 DPI and return JPEG bytes. */
async function cropPhotoToSlot(photo: Buffer, widthPt: number, heightPt: number) {
  const pxW = Math.max(1, Math.round((widthPt / 72) * DPI));
  const pxH = Math.max(1, Math.round((heightPt / 72) * DPI));
  return sharp(photo).rotate().resize(pxW, pxH, { fit: "cover" }).jpeg({ quality: 92 }).toBuffer();
}

function hexToObj(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Render the photo as a shuffled tile grid — the same effect as the homepage
 * ShuffledImage, composed at 300 DPI with sharp. Gaps reveal the page bg.
 */
async function renderShuffled(photo: Buffer, widthPt: number, heightPt: number, fx: ShuffleEffect, bgHex: string): Promise<Buffer> {
  const gap = Math.max(1, mm2px(fx.gapMm));
  const availW = Math.max(fx.cols, Math.round((widthPt / 72) * DPI));
  const availH = Math.max(fx.rows, Math.round((heightPt / 72) * DPI));
  const tileW = Math.floor((availW - (fx.cols - 1) * gap) / fx.cols);
  const tileH = Math.floor((availH - (fx.rows - 1) * gap) / fx.rows);

  const src = await sharp(photo).rotate().resize(tileW * fx.cols, tileH * fx.rows, { fit: "cover" }).toBuffer();
  const perm = scramble(fx.cols, fx.rows, fx.intensity, fx.seed);

  const tiles = await Promise.all(
    perm.map(async (source, pos) => {
      const tile = await sharp(src)
        .extract({ left: (source % fx.cols) * tileW, top: Math.floor(source / fx.cols) * tileH, width: tileW, height: tileH })
        .toBuffer();
      return { input: tile, left: (pos % fx.cols) * (tileW + gap), top: Math.floor(pos / fx.cols) * (tileH + gap) };
    }),
  );

  const baseW = fx.cols * tileW + (fx.cols - 1) * gap;
  const baseH = fx.rows * tileH + (fx.rows - 1) * gap;
  return sharp({ create: { width: baseW, height: baseH, channels: 3, background: hexToObj(bgHex) } })
    .composite(tiles)
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** Small crop marks at the four trim corners (drawn into the bleed). */
function drawCropMarks(page: PDFPage, g: Geometry) {
  const len = mm2pt(3);
  const gap = mm2pt(1.5);
  const b = g.bleedPt;
  const mark = { thickness: 0.4, color: rgb(0, 0, 0) };
  const corners = [
    { x: b, y: b, sx: -1, sy: -1 },
    { x: g.pageW - b, y: b, sx: 1, sy: -1 },
    { x: b, y: g.pageH - b, sx: -1, sy: 1 },
    { x: g.pageW - b, y: g.pageH - b, sx: 1, sy: 1 },
  ];
  for (const c of corners) {
    page.drawLine({ start: { x: c.x + c.sx * gap, y: c.y }, end: { x: c.x + c.sx * (gap + len), y: c.y }, ...mark });
    page.drawLine({ start: { x: c.x, y: c.y + c.sy * gap }, end: { x: c.x, y: c.y + c.sy * (gap + len) }, ...mark });
  }
}

export async function composeCoverPdf(template: CoverTemplate, content: CoverContent): Promise<Uint8Array> {
  const g: Geometry = {
    pageW: mm2pt(template.trimWidthMm + 2 * template.bleedMm),
    pageH: mm2pt(template.trimHeightMm + 2 * template.bleedMm),
    bleedPt: mm2pt(template.bleedMm),
    trimWpt: mm2pt(template.trimWidthMm),
    trimHpt: mm2pt(template.trimHeightMm),
  };

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const page = doc.addPage([g.pageW, g.pageH]);

  // Background across the full bleed.
  page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(template.background) });

  // Photo: shuffled tile grid (homepage effect) or a plain crop-to-slot.
  const slot = resolveRect(template.photo.rect, template.photo.bleed, g);
  const fx = template.photo.shuffle;
  const jpeg = fx
    ? await renderShuffled(content.photo, slot.width, slot.height, fx, template.background)
    : await cropPhotoToSlot(content.photo, slot.width, slot.height);
  const img = await doc.embedJpg(jpeg);
  page.drawImage(img, slot);
  if (template.photo.border) {
    page.drawRectangle({ x: slot.x, y: slot.y, width: slot.width, height: slot.height, borderColor: hex2rgb(template.photo.border.color), borderWidth: template.photo.border.widthPt });
  }

  // Placeholder frame (stand-in for the real baked decoration).
  if (template.frame) {
    const inset = mm2pt(template.frame.insetMm);
    page.drawRectangle({
      x: g.bleedPt + inset,
      y: g.bleedPt + inset,
      width: g.trimWpt - 2 * inset,
      height: g.trimHpt - 2 * inset,
      borderColor: hex2rgb(template.frame.color),
      borderWidth: template.frame.widthPt,
    });
  }

  // Title in the chosen embedded font, so print matches the editor preview.
  const font = await doc.embedFont(await loadTitleFont(content.titleFontFile ?? "InstrumentSerif-Regular.ttf"), { subset: true });
  const t = template.title;
  const box = resolveRect(t.rect, undefined, g);
  if (t.fill) {
    page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, color: hex2rgb(t.fill) });
  }
  if (t.border) {
    page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, borderColor: hex2rgb(t.border.color), borderWidth: t.border.widthPt });
  }
  const text = t.uppercase ? content.title.toUpperCase() : content.title;
  const maxW = box.width - (t.border ? mm2pt(12) : 0);
  let size = t.sizeFrac * g.trimHpt;
  while (size > 4 && font.widthOfTextAtSize(text, size) > maxW) size -= 0.5;
  const textW = font.widthOfTextAtSize(text, size);
  const tx = t.align === "left" ? box.x : t.align === "right" ? box.x + box.width - textW : box.x + (box.width - textW) / 2;
  const ty = box.y + (box.height - font.heightAtSize(size)) / 2;
  const titleColor = hex2rgb(t.color);
  page.drawText(text, { x: tx, y: ty, size, font, color: titleColor });
  // Synthetic bold: redraw slightly offset to thicken the strokes.
  if (content.titleBold) {
    page.drawText(text, { x: tx + Math.max(0.4, size * 0.02), y: ty, size, font, color: titleColor });
  }

  drawCropMarks(page, g);

  return doc.save();
}
