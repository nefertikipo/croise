/**
 * Server-side front-cover composition engine.
 *
 * Given a CoverTemplate (data) + CoverContent (photo + title), draws the front
 * cover into a PANEL of an existing page (the right-hand panel of the
 * wraparound cover spread): full-resolution photo cropped into its slot, the
 * "gridify" vector overlay, a placeholder frame and the fitted title. Pure
 * server-side (pdf-lib + sharp); no headless browser. Everything except the
 * photo prints as sharp vector.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont, PDFPage } from "pdf-lib";
import sharp from "sharp";
import { scramble } from "@/lib/design/shuffle-grid";
import { hex2rgb, hexToObj, mm2pt, type PanelRect } from "@/lib/book-pdf/geometry";
import { ellipsize, nfc } from "@/lib/book-pdf/text";
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

/** Embed a cover title font (from public/fonts) into `doc`. Shared with the
 * spine text of the wraparound spread. */
export async function embedCoverTitleFont(doc: PDFDocument, file: string): Promise<PDFFont> {
  doc.registerFontkit(fontkit);
  return doc.embedFont(await loadTitleFont(file), { subset: true });
}

/** Print resolution for embedded raster (photos). */
const DPI = 300;
const mm2px = (mm: number) => Math.round((mm / 25.4) * DPI);

/** Resolve a top-left panel-relative FracRect (optionally bleeding out to the
 * `outer` rect) into a bottom-left-origin PDF rectangle in points. */
function resolveRect(rect: FracRect, bleed: BleedEdges | undefined, panel: PanelRect, outer: PanelRect) {
  let left = panel.x + rect.x * panel.w;
  let right = panel.x + (rect.x + rect.w) * panel.w;
  // y measured from the panel top, then flipped to bottom-left origin.
  let top = panel.y + panel.h - rect.y * panel.h;
  let bottom = panel.y + panel.h - (rect.y + rect.h) * panel.h;

  if (bleed?.left) left = outer.x;
  if (bleed?.right) right = outer.x + outer.w;
  if (bleed?.top) top = outer.y + outer.h;
  if (bleed?.bottom) bottom = outer.y;

  return { x: left, y: bottom, width: right - left, height: top - bottom };
}

/** Crop the photo to exactly the slot aspect at 300 DPI and return JPEG bytes. */
async function cropPhotoToSlot(photo: Buffer, widthPt: number, heightPt: number) {
  const pxW = Math.max(1, Math.round((widthPt / 72) * DPI));
  const pxH = Math.max(1, Math.round((heightPt / 72) * DPI));
  return sharp(photo).rotate().resize(pxW, pxH, { fit: "cover" }).jpeg({ quality: 92 }).toBuffer();
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

/** Best 2-line split of `text` at a space: minimizes the wider line. Returns
 * null when the text has no space to break at. */
function splitTwoLines(font: PDFFont, text: string): [string, string] | null {
  const words = text.split(" ").filter(Boolean);
  if (words.length < 2) return null;
  let best: [string, string] | null = null;
  let bestW = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const w = Math.max(font.widthOfTextAtSize(a, 100), font.widthOfTextAtSize(b, 100));
    if (w < bestW) {
      bestW = w;
      best = [a, b];
    }
  }
  return best;
}

export interface CoverPanelOptions {
  doc: PDFDocument;
  page: PDFPage;
  /** Trim rect of the front-cover panel (bottom-left origin, pt). */
  panel: PanelRect;
  /** How far full-bleed slots may extend (usually the whole page). */
  outer: PanelRect;
  template: CoverTemplate;
  content: CoverContent;
}

/** Compose the front cover into its panel. The caller fills the page
 * background (shared across the whole spread) and sets the print boxes. */
export async function composeCoverPanel({ doc, page, panel, outer, template, content }: CoverPanelOptions): Promise<void> {
  // Photo: shuffled tile grid (homepage effect) or a plain crop-to-slot.
  const slot = resolveRect(template.photo.rect, template.photo.bleed, panel, outer);
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
      x: panel.x + inset,
      y: panel.y + inset,
      width: panel.w - 2 * inset,
      height: panel.h - 2 * inset,
      borderColor: hex2rgb(template.frame.color),
      borderWidth: template.frame.widthPt,
    });
  }

  // Title in the chosen embedded font, so print matches the editor preview.
  const font = await embedCoverTitleFont(doc, content.titleFontFile ?? "InstrumentSerif-Regular.ttf");
  const t = template.title;
  const box = resolveRect(t.rect, undefined, panel, outer);
  if (t.fill) {
    page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, color: hex2rgb(t.fill) });
  }
  if (t.border) {
    page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, borderColor: hex2rgb(t.border.color), borderWidth: t.border.widthPt });
  }
  const raw = nfc(content.title);
  const text = t.uppercase ? raw.toUpperCase() : raw;
  const maxW = box.width - (t.border ? mm2pt(12) : 0);
  const titleColor = hex2rgb(t.color);
  const drawLine = (line: string, size: number, y: number) => {
    const lw = font.widthOfTextAtSize(line, size);
    const x = t.align === "left" ? box.x : t.align === "right" ? box.x + box.width - lw : box.x + (box.width - lw) / 2;
    page.drawText(line, { x, y, size, font, color: titleColor });
    // Synthetic bold: redraw slightly offset to thicken the strokes.
    if (content.titleBold) {
      page.drawText(line, { x: x + Math.max(0.4, size * 0.02), y, size, font, color: titleColor });
    }
  };

  const startSize = t.sizeFrac * panel.h;
  // 1) Single line, shrinking no further than 18pt.
  let size = startSize;
  while (size > 18 && font.widthOfTextAtSize(text, size) > maxW) size -= 0.5;
  if (font.widthOfTextAtSize(text, size) <= maxW) {
    drawLine(text, size, box.y + (box.height - font.heightAtSize(size)) / 2);
    return;
  }
  // 2) Wrap to two lines if the title zone allows it, before shrinking further.
  const two = splitTwoLines(font, text);
  if (two) {
    let s = startSize;
    const fitsTwo = (sz: number) =>
      font.widthOfTextAtSize(two[0], sz) <= maxW &&
      font.widthOfTextAtSize(two[1], sz) <= maxW &&
      2 * font.heightAtSize(sz) * 1.05 <= box.height;
    while (s > 8 && !fitsTwo(s)) s -= 0.5;
    if (fitsTwo(s)) {
      const lh = font.heightAtSize(s) * 1.05;
      const blockBottom = box.y + (box.height - 2 * lh) / 2;
      drawLine(two[1], s, blockBottom);
      drawLine(two[0], s, blockBottom + lh);
      return;
    }
  }
  // 3) Last resort: keep shrinking the single line, floored at 8pt + ellipsis.
  while (size > 8 && font.widthOfTextAtSize(text, size) > maxW) size -= 0.5;
  drawLine(ellipsize(font, text, size, maxW), size, box.y + (box.height - font.heightAtSize(size)) / 2);
}
