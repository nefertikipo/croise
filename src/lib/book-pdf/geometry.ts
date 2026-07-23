/**
 * Shared print geometry for the book PDF engine: physical page sizes, unit
 * conversions, colour helpers and crop marks. Used by every interior page
 * composer (grid, index, back cover) so trim/bleed stays consistent.
 */

import { rgb, type PDFPage, type RGB } from "pdf-lib";

/** Print resolution for embedded raster (photos). Vector art is resolution-free. */
export const DPI = 300;
const MM_PER_INCH = 25.4;

export const mm2pt = (mm: number) => (mm * 72) / MM_PER_INCH;
export const mm2px = (mm: number) => Math.round((mm / MM_PER_INCH) * DPI);
export const pt2px = (pt: number) => Math.round((pt / 72) * DPI);

/** A named trim size. Interior pages use A5 (the book) or A4 (print-at-home). */
export type PageSize = "a5" | "a4";

export interface PageSpec {
  /** Trim size in millimetres. */
  trimWmm: number;
  trimHmm: number;
  /** Bleed on every edge in millimetres. */
  bleedMm: number;
  /** Safe inner margin from the trim edge, in millimetres. */
  marginMm: number;
}

export const PAGE_SPECS: Record<PageSize, PageSpec> = {
  a5: { trimWmm: 148, trimHmm: 210, bleedMm: 3, marginMm: 12 },
  a4: { trimWmm: 210, trimHmm: 297, bleedMm: 3, marginMm: 16 },
};

export function resolvePageSize(size?: string): PageSize {
  return size === "a4" ? "a4" : "a5";
}

/**
 * Resolved page geometry in PDF points (72/inch), bottom-left origin. The page
 * is trim + bleed on all sides; `content*` is the safe area inside the margin.
 */
export interface Geometry {
  pageW: number;
  pageH: number;
  bleedPt: number;
  trimWpt: number;
  trimHpt: number;
  /** Safe content box (inside the margin), top-left origin fields for layout. */
  contentX: number;
  contentTop: number;
  contentW: number;
  contentH: number;
}

export function pageGeometry(spec: PageSpec): Geometry {
  const bleedPt = mm2pt(spec.bleedMm);
  const trimWpt = mm2pt(spec.trimWmm);
  const trimHpt = mm2pt(spec.trimHmm);
  const marginPt = mm2pt(spec.marginMm);
  const pageW = mm2pt(spec.trimWmm + 2 * spec.bleedMm);
  const pageH = mm2pt(spec.trimHmm + 2 * spec.bleedMm);
  return {
    pageW,
    pageH,
    bleedPt,
    trimWpt,
    trimHpt,
    contentX: bleedPt + marginPt,
    contentTop: bleedPt + marginPt,
    contentW: trimWpt - 2 * marginPt,
    contentH: trimHpt - 2 * marginPt,
  };
}

/** Parse a #rgb / #rrggbb hex into a pdf-lib RGB. */
export function hex2rgb(hex: string): RGB {
  const { r, g, b } = hexToObj(hex);
  return rgb(r / 255, g / 255, b / 255);
}

/** Parse a hex string into 0..255 channel components. */
export function hexToObj(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h,
    16,
  );
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Mix two hex colours in linear sRGB by weight `t` toward `b` (0 = all `a`).
 * A close, cheap stand-in for the on-screen `color-mix(in oklab, ...)` tints —
 * accurate enough at the low chroma / small ratios the grid uses.
 */
export function mixHex(a: string, b: string, t: number): RGB {
  const A = hexToObj(a);
  const B = hexToObj(b);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const enc = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  const ch = (ca: number, cb: number) => enc(lin(ca) * (1 - t) + lin(cb) * t);
  return rgb(ch(A.r, B.r), ch(A.g, B.g), ch(A.b, B.b));
}

/** Convert a top-left-origin y (points from page top) to pdf-lib's bottom-left. */
export const flipY = (g: Geometry, yTop: number) => g.pageH - yTop;

/** Small crop marks at the four trim corners, drawn into the bleed. */
export function drawCropMarks(page: PDFPage, g: Geometry) {
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
