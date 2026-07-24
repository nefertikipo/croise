/**
 * Compose an interior photo page to the reference look: photos placed into a
 * layout's slots (with a subtle vintage grade), baked graphic tiles (colour +
 * lens motif), and a film-grain overlay over the whole page — then wrapped in a
 * print PDF at 300 DPI with bleed + crop marks.
 *
 * The page is composited as a raster (sharp) so the grain sits over everything,
 * matching the references; photo pages carry no text, so raster is fine.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import sharp, { type OverlayOptions } from "sharp";
import type { PhotoLayout, LayoutSlot } from "@/lib/book-pdf/photo-layouts";
import { graphicInner, HAND_IMAGE_DIR } from "@/lib/book-pdf/graphic-motifs";
import type { HandDir } from "@/lib/book-pdf/graphic-motifs";

const DPI = 300;
const MM = 25.4;
const TRIM_W = 148;
const TRIM_H = 210;
const BLEED = 3;
const CREAM = "#fff6ec";

const mm2px = (mm: number) => Math.round((mm / MM) * DPI);
const mm2pt = (mm: number) => (mm * 72) / MM;

const PAGE_W = mm2px(TRIM_W + 2 * BLEED);
const PAGE_H = mm2px(TRIM_H + 2 * BLEED);
const BLEED_PX = mm2px(BLEED);
const TRIM_WPX = mm2px(TRIM_W);
const TRIM_HPX = mm2px(TRIM_H);

function hexToObj(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Resolve a top-left trim-relative slot to an integer px box (image space). */
function resolveBox(slot: LayoutSlot) {
  const b = slot.bleed;
  const left = b?.left ? 0 : Math.round(BLEED_PX + slot.rect.x * TRIM_WPX);
  const top = b?.top ? 0 : Math.round(BLEED_PX + slot.rect.y * TRIM_HPX);
  const right = b?.right ? PAGE_W : Math.round(BLEED_PX + (slot.rect.x + slot.rect.w) * TRIM_WPX);
  const bottom = b?.bottom ? PAGE_H : Math.round(BLEED_PX + (slot.rect.y + slot.rect.h) * TRIM_HPX);
  return { left, top, width: right - left, height: bottom - top };
}

export interface PhotoFill {
  photo: Buffer;
  crop?: { x: number; y: number; w: number; h: number };
}

export interface PhotoPageContent {
  /** One entry per PHOTO slot, in order (graphic slots are skipped). */
  photos: (PhotoFill | null)[];
}

const handAssets = new Map<HandDir, Buffer | null>();
async function loadHandAsset(dir: HandDir): Promise<Buffer | null> {
  if (handAssets.has(dir)) return handAssets.get(dir) ?? null;
  let buf: Buffer | null = null;
  try {
    if (HAND_IMAGE_DIR) buf = await readFile(join(process.cwd(), "public", HAND_IMAGE_DIR, `hand-${dir}.png`));
  } catch {
    buf = null;
  }
  handAssets.set(dir, buf);
  return buf;
}

async function graphicTile(slot: LayoutSlot, w: number, h: number): Promise<Buffer> {
  if (slot.motif === "hand") {
    const asset = await loadHandAsset(slot.dir ?? "right");
    // The cut-out already carries its paper ground; cover-fit it to the cell.
    if (asset) return sharp(asset).resize(w, h, { fit: "cover" }).png().toBuffer();
  }
  const inner = graphicInner(w, h, slot.color ?? "#1f7a4d", slot.motif, slot.dir);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${inner}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Crop, cover-fit to the slot, and apply a subtle vintage grade (or mono). */
async function gradePhoto(fill: PhotoFill, w: number, h: number, mono = false): Promise<Buffer> {
  let buf = fill.photo;
  if (fill.crop) {
    const meta = await sharp(buf).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    const left = Math.min(W - 1, Math.max(0, Math.round(fill.crop.x * W)));
    const top = Math.min(H - 1, Math.max(0, Math.round(fill.crop.y * H)));
    const width = Math.max(1, Math.min(W - left, Math.round(fill.crop.w * W)));
    const height = Math.max(1, Math.min(H - top, Math.round(fill.crop.h * H)));
    buf = await sharp(buf).extract({ left, top, width, height }).toBuffer();
  }
  const pipe = sharp(buf).rotate().resize(w, h, { fit: "cover" });
  if (mono) pipe.grayscale().modulate({ brightness: 1.04 }).linear(1.12, -12);
  else pipe.modulate({ saturation: 0.82, brightness: 1.02 });
  return pipe.jpeg({ quality: 92 }).toBuffer();
}

/** RGBA mid-grey noise for an "overlay"-blend film grain. */
function grain(): Promise<Buffer> {
  const raw = Buffer.alloc(PAGE_W * PAGE_H * 4);
  for (let i = 0; i < PAGE_W * PAGE_H; i++) {
    const v = 128 + Math.round((Math.random() - 0.5) * 40);
    raw[i * 4] = v;
    raw[i * 4 + 1] = v;
    raw[i * 4 + 2] = v;
    raw[i * 4 + 3] = 255;
  }
  return sharp(raw, { raw: { width: PAGE_W, height: PAGE_H, channels: 4 } }).png().toBuffer();
}

function drawCropMarks(page: PDFPage) {
  const len = mm2pt(3);
  const gap = mm2pt(1.5);
  const b = mm2pt(BLEED);
  const w = mm2pt(TRIM_W + 2 * BLEED);
  const h = mm2pt(TRIM_H + 2 * BLEED);
  const mark = { thickness: 0.4, color: rgb(0, 0, 0) };
  const corners = [
    { x: b, y: b, sx: -1, sy: -1 },
    { x: w - b, y: b, sx: 1, sy: -1 },
    { x: b, y: h - b, sx: -1, sy: 1 },
    { x: w - b, y: h - b, sx: 1, sy: 1 },
  ];
  for (const c of corners) {
    page.drawLine({ start: { x: c.x + c.sx * gap, y: c.y }, end: { x: c.x + c.sx * (gap + len), y: c.y }, ...mark });
    page.drawLine({ start: { x: c.x, y: c.y + c.sy * gap }, end: { x: c.x, y: c.y + c.sy * (gap + len) }, ...mark });
  }
}

export async function composePhotoPage(layout: PhotoLayout, content: PhotoPageContent): Promise<Uint8Array> {
  const composites: OverlayOptions[] = [];
  const mono = layout.id === "hermes";
  let photoIdx = 0;
  for (const slot of layout.slots) {
    const box = resolveBox(slot);
    if (slot.kind === "graphic") {
      composites.push({ input: await graphicTile(slot, box.width, box.height), left: box.left, top: box.top });
    } else {
      const fill = content.photos[photoIdx++];
      if (fill) composites.push({ input: await gradePhoto(fill, box.width, box.height, mono), left: box.left, top: box.top });
    }
  }
  composites.push({ input: await grain(), blend: "overlay" });

  const pageJpeg = await sharp({
    create: { width: PAGE_W, height: PAGE_H, channels: 3, background: hexToObj(layout.background ?? CREAM) },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toBuffer();

  const doc = await PDFDocument.create();
  const page = doc.addPage([mm2pt(TRIM_W + 2 * BLEED), mm2pt(TRIM_H + 2 * BLEED)]);
  const img = await doc.embedJpg(pageJpeg);
  page.drawImage(img, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  drawCropMarks(page);
  return doc.save();
}
