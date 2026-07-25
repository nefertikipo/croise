/**
 * Shared print geometry for the book PDF engine: physical page sizes, unit
 * conversions, colour helpers, print boxes (Trim/Bleed) and the binding-gutter
 * margins. Used by every interior page composer (grid, index, content,
 * solutions) so trim/bleed stays consistent.
 *
 * POD output (a5) is trim + bleed with TrimBox/BleedBox metadata and NO crop
 * marks — that is what Gelato-class print-on-demand expects. The a4 variant is
 * a true 210×297 mm "print at home" page: no bleed, no marks, content inside a
 * plain 10 mm margin.
 */

import { rgb, type PDFPage, type RGB } from "pdf-lib";

/** Print resolution for embedded raster (photos). Vector art is resolution-free. */
export const DPI = 300;
const MM_PER_INCH = 25.4;

export const mm2pt = (mm: number) => (mm * 72) / MM_PER_INCH;
export const mm2px = (mm: number) => Math.round((mm / MM_PER_INCH) * DPI);
export const pt2px = (pt: number) => Math.round((pt / 72) * DPI);

/**
 * Paper thickness per interior page (leaf side), used to derive the spine
 * width of the wraparound cover: `spineMm = interiorPageCount × this`.
 *
 * 0.055 mm/page approximates a 90–130 gsm uncoated book paper. IMPORTANT:
 * this MUST be calibrated against the exact Gelato product/paper chosen for
 * the book before the first real order — every paper has its own bulk, and a
 * wrong value visibly misplaces the spine text.
 */
export const PAPER_THICKNESS_MM_PER_PAGE = 0.055;

/** Spine width in millimetres for an interior of `pageCount` pages. */
export const spineWidthMm = (pageCount: number) => pageCount * PAPER_THICKNESS_MM_PER_PAGE;

/** Minimum spine width for printing the title on it; below this, leave blank. */
export const SPINE_TEXT_MIN_MM = 6;

/** A named trim size. Interior pages use A5 (the book) or A4 (print-at-home). */
export type PageSize = "a5" | "a4";

export interface PageSpec {
  /** Trim size in millimetres. */
  trimWmm: number;
  trimHmm: number;
  /** Bleed on every edge in millimetres (0 = no bleed, page = trim). */
  bleedMm: number;
  /** Safe margins from the trim edge, in millimetres. Inner = spine side. */
  marginTopMm: number;
  marginBottomMm: number;
  marginInnerMm: number;
  marginOuterMm: number;
}

export const PAGE_SPECS: Record<PageSize, PageSpec> = {
  // POD interior: mirrored margins — 15 mm on the spine side (binding gutter),
  // 10 mm on the fore-edge, 12 mm top/bottom (unchanged).
  a5: { trimWmm: 148, trimHmm: 210, bleedMm: 3, marginTopMm: 12, marginBottomMm: 12, marginInnerMm: 15, marginOuterMm: 10 },
  // Print-at-home: TRUE A4, no bleed, symmetric ~10 mm margins.
  a4: { trimWmm: 210, trimHmm: 297, bleedMm: 0, marginTopMm: 10, marginBottomMm: 10, marginInnerMm: 10, marginOuterMm: 10 },
};

export function resolvePageSize(size?: string): PageSize {
  return size === "a4" ? "a4" : "a5";
}

/**
 * Which side of the spread a bound page lands on. Page 1 (doc index 0) is a
 * recto (right-hand page): its spine — and inner margin — is on the LEFT.
 * Versos mirror it.
 */
export type PageSide = "recto" | "verso";

/** Side of the page at 0-based index `i` in the assembled document. */
export const sideForPageIndex = (i: number): PageSide => (i % 2 === 0 ? "recto" : "verso");

/**
 * Resolved page geometry in PDF points (72/inch), bottom-left origin. The page
 * is trim + bleed on all sides; `content*` is the safe area inside the margins
 * (gutter-aware: pass the page's `side`).
 */
export interface Geometry {
  pageW: number;
  pageH: number;
  bleedPt: number;
  trimWpt: number;
  trimHpt: number;
  /** Safe content box (inside the margins), top-left origin fields for layout. */
  contentX: number;
  contentTop: number;
  contentW: number;
  contentH: number;
}

export function pageGeometry(spec: PageSpec, side: PageSide = "recto"): Geometry {
  const bleedPt = mm2pt(spec.bleedMm);
  const trimWpt = mm2pt(spec.trimWmm);
  const trimHpt = mm2pt(spec.trimHmm);
  const innerPt = mm2pt(spec.marginInnerMm);
  const outerPt = mm2pt(spec.marginOuterMm);
  const topPt = mm2pt(spec.marginTopMm);
  const bottomPt = mm2pt(spec.marginBottomMm);
  // Recto: spine (inner margin) on the left. Verso: on the right.
  const leftPt = side === "recto" ? innerPt : outerPt;
  const pageW = mm2pt(spec.trimWmm + 2 * spec.bleedMm);
  const pageH = mm2pt(spec.trimHmm + 2 * spec.bleedMm);
  return {
    pageW,
    pageH,
    bleedPt,
    trimWpt,
    trimHpt,
    contentX: bleedPt + leftPt,
    contentTop: bleedPt + topPt,
    contentW: trimWpt - innerPt - outerPt,
    contentH: trimHpt - topPt - bottomPt,
  };
}

/** A page factory used by paginating composers (index, solutions): each call
 * adds a page with the correct recto/verso geometry and print boxes set. */
export type AddPage = () => { page: PDFPage; g: Geometry };

/** An axis-aligned rectangle in PDF points, bottom-left origin. Used for the
 * cover-spread panels (back / spine / front). */
export interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * POD print metadata: MediaBox is trim + bleed (the page itself), BleedBox =
 * MediaBox, TrimBox = the trim rectangle. No crop marks — POD wants clean
 * trim+bleed files with boxes.
 */
export function setPrintBoxes(page: PDFPage, g: Geometry) {
  page.setBleedBox(0, 0, g.pageW, g.pageH);
  page.setTrimBox(g.bleedPt, g.bleedPt, g.trimWpt, g.trimHpt);
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
