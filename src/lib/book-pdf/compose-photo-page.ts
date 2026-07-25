/**
 * Compose an interior photo page to the reference look: photos placed into a
 * layout's slots (with a subtle vintage grade), baked graphic tiles (colour +
 * lens motif), and a film-grain overlay over the whole page — rendered at
 * 300 DPI and drawn onto a page of the interior document.
 *
 * The page is composited as a raster (sharp) so the grain sits over everything,
 * matching the references; photo pages carry no text, so raster is fine.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PDFDocument, PDFPage } from "pdf-lib";
import sharp, { type OverlayOptions } from "sharp";
import type { PhotoLayout, LayoutSlot } from "@/lib/book-pdf/photo-layouts";
import { graphicInner, HAND_IMAGE_DIR } from "@/lib/book-pdf/graphic-motifs";
import type { HandDir } from "@/lib/book-pdf/graphic-motifs";
import { pt2px, type Geometry } from "@/lib/book-pdf/geometry";

const CREAM = "#fff6ec";

function hexToObj(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Pixel frame of the page being composited (page = trim + bleed). */
interface PxFrame {
  pageW: number;
  pageH: number;
  bleed: number;
  trimW: number;
  trimH: number;
}

/** Resolve a top-left trim-relative slot to an integer px box (image space). */
function resolveBox(slot: LayoutSlot, f: PxFrame) {
  const b = slot.bleed;
  const left = b?.left ? 0 : Math.round(f.bleed + slot.rect.x * f.trimW);
  const top = b?.top ? 0 : Math.round(f.bleed + slot.rect.y * f.trimH);
  const right = b?.right ? f.pageW : Math.round(f.bleed + (slot.rect.x + slot.rect.w) * f.trimW);
  const bottom = b?.bottom ? f.pageH : Math.round(f.bleed + (slot.rect.y + slot.rect.h) * f.trimH);
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
function grain(w: number, h: number): Promise<Buffer> {
  const raw = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = 128 + Math.round((Math.random() - 0.5) * 40);
    raw[i * 4] = v;
    raw[i * 4 + 1] = v;
    raw[i * 4 + 2] = v;
    raw[i * 4 + 3] = 255;
  }
  return sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

export interface PhotoPageOptions {
  doc: PDFDocument;
  page: PDFPage;
  g: Geometry;
  layout: PhotoLayout;
  content: PhotoPageContent;
}

export async function composePhotoPage({ doc, page, g, layout, content }: PhotoPageOptions): Promise<void> {
  const pageWpx = pt2px(g.pageW);
  const pageHpx = pt2px(g.pageH);
  const bleedPx = pt2px(g.bleedPt);
  const frame: PxFrame = {
    pageW: pageWpx,
    pageH: pageHpx,
    bleed: bleedPx,
    trimW: pageWpx - 2 * bleedPx,
    trimH: pageHpx - 2 * bleedPx,
  };

  const composites: OverlayOptions[] = [];
  const mono = layout.id === "hermes";
  let photoIdx = 0;
  for (const slot of layout.slots) {
    const box = resolveBox(slot, frame);
    if (slot.kind === "graphic") {
      composites.push({ input: await graphicTile(slot, box.width, box.height), left: box.left, top: box.top });
    } else {
      const fill = content.photos[photoIdx++];
      if (fill) composites.push({ input: await gradePhoto(fill, box.width, box.height, mono), left: box.left, top: box.top });
    }
  }
  composites.push({ input: await grain(pageWpx, pageHpx), blend: "overlay" });

  const pageJpeg = await sharp({
    create: { width: pageWpx, height: pageHpx, channels: 3, background: hexToObj(layout.background ?? CREAM) },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toBuffer();

  const img = await doc.embedJpg(pageJpeg);
  page.drawImage(img, { x: 0, y: 0, width: g.pageW, height: g.pageH });
}
