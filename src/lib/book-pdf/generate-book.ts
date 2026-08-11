/**
 * Assemble the print-ready interior of a book into one PDF, in the same order
 * the editor shows (see book-print-layout.tsx): dedication → the spine (grid,
 * photo, note and quote pages in book order) → word index → solutions — then
 * padded with blank pages to a MULTIPLE-OF-4 page count (saddle-stitch
 * booklets need complete 4-page signatures; perfect binding only needs even,
 * so the stricter rule serves both). At A5 (the POD book, trim+bleed+boxes, binding gutter) or
 * A4 (true print-at-home pages). The cover is a separate wraparound spread
 * (see generate-cover.ts).
 */

import { PDFDocument, type PDFPage } from "pdf-lib";
import { embedBookFonts } from "@/lib/book-pdf/fonts";
import { composeGridPage } from "@/lib/book-pdf/compose-grid-page";
import { composeContentPage, composeDedicationPage } from "@/lib/book-pdf/compose-content-page";
import { composeIndexPages, countIndexPages } from "@/lib/book-pdf/compose-index-page";
import { dedicationSignatureNames } from "@/lib/books/authors";
import { composePhotoPage, type PhotoPageContent } from "@/lib/book-pdf/compose-photo-page";
import { composeSolutionsPages, countSolutionsPages } from "@/lib/book-pdf/compose-solutions-page";
import { getPhotoLayout, type PhotoLayout } from "@/lib/book-pdf/photo-layouts";
import { getOriginal } from "@/lib/book-pdf/photo-store";
import {
  hex2rgb,
  mm2pt,
  pageGeometry,
  setPrintBoxes,
  sideForPageIndex,
  PAGE_SPECS,
  type AddPage,
  type Geometry,
  type PageSide,
  type PageSize,
} from "@/lib/book-pdf/geometry";
import type { BookFonts } from "@/lib/book-pdf/fonts";
import type { BookData, ContentPageConfig, GridPage } from "@/types/book";

const PAGE_BG = "#fff6ec";

/** Muted ink for the page-number folios, low-contrast so it reads as chrome. */
const FOLIO_INK = "#9a9088";

/**
 * Draw a page-number folio in the outer bottom margin: right-aligned to the
 * fore-edge on a recto, left-aligned on a verso, so it always sits on the open
 * (outer) side of the spread.
 *
 * Print-safe placement: the baseline is ~6 mm above the trim edge — inside the
 * bottom margin, never in the 3.175 mm bleed, and ~2.8 mm clear of the
 * worst-case POD trim shift — while staying ~2 mm below the content box, so it
 * collides with neither the cut nor the page content. Horizontally it hugs the
 * same 8 mm fore-edge safe line the content uses.
 *
 * `onPhoto` pages get a translucent cream plate behind the digits so the number
 * reads as clearly as on the paper pages, whatever the photo's brightness.
 */
function drawFolio(
  page: PDFPage,
  g: Geometry,
  side: PageSide,
  n: number,
  fonts: BookFonts,
  onPhoto: boolean,
): void {
  const size = 8;
  const label = String(n);
  const w = fonts.letter.widthOfTextAtSize(label, size);
  const y = g.bleedPt + mm2pt(6);
  const x = side === "recto" ? g.contentX + g.contentW - w : g.contentX;
  if (onPhoto) {
    const padX = 3;
    page.drawRectangle({
      x: x - padX,
      y: y - 2,
      width: w + padX * 2,
      height: size + 2,
      color: hex2rgb(PAGE_BG),
      opacity: 0.85,
    });
  }
  page.drawText(label, { x, y, size, font: fonts.letter, color: hex2rgb(FOLIO_INK) });
}

/** Typical POD perfect-bound minimum — below this we warn, not block.
 * Re-exported from the client-safe constants module. */
export { POD_MIN_INTERIOR_PAGES } from "@/lib/books/constants";

/** Thrown when a book has no grid pages to print (a crossword book needs grids,
 * whatever content pages it carries). */
export class EmptyBookError extends Error {
  constructor() {
    super("Book has no grids to print.");
    this.name = "EmptyBookError";
  }
}

/**
 * Exact final page count of the interior PDF — dedication + spine pages +
 * index + solutions + even-count padding — WITHOUT rendering anything. Index
 * and solutions pagination is pure arithmetic shared with the composers, so
 * this is what generateBookInteriorPdf will produce. The cover route needs it
 * for the spine width.
 */
export function countInteriorPages(book: BookData, size: PageSize = "a5"): number {
  const grids = book.pages.filter((p): p is GridPage => p.kind === "grid");
  if (grids.length === 0) throw new EmptyBookError();
  const g = pageGeometry(PAGE_SPECS[size]); // content metrics are side-independent
  let n = 1; // opening page (dedication or default title page) is always present
  n += book.pages.length;
  n += countIndexPages(book.wordIndex, g);
  n += countSolutionsPages(grids, g);
  if (n % 4 !== 0) n += 4 - (n % 4); // blank pad to a multiple of 4 (signatures)
  return n;
}

/**
 * Like {@link countInteriorPages} but never throws on a grid-less book: a book
 * being built can hold content pages (or nothing) before its first grid, and
 * the capacity guards still need a page count for it. A grid-less book has no
 * index or solutions, so it is just the opening page + its content pages, padded
 * to a signature. Use this for the printable-window guards (add-page routes,
 * order gate); use countInteriorPages when a real PDF is about to be rendered.
 */
export function interiorPageCountForCapacity(book: BookData, size: PageSize = "a5"): number {
  try {
    return countInteriorPages(book, size);
  } catch (err) {
    if (err instanceof EmptyBookError) {
      let n = 1 + book.pages.length; // opening page + any content pages
      if (n % 4 !== 0) n += 4 - (n % 4);
      return n;
    }
    throw err;
  }
}

/** Fetch the full-res photos for a photo page's PHOTO slots, in slot order. */
async function loadPhotoContent(layout: PhotoLayout, config: ContentPageConfig): Promise<PhotoPageContent> {
  const photoSlotCount = layout.slots.filter((s) => s.kind !== "graphic").length;
  const photos: PhotoPageContent["photos"] = [];
  for (let i = 0; i < photoSlotCount; i++) {
    const design = config.photos?.[i];
    if (design?.photoRef) {
      photos.push({ photo: await getOriginal(design.photoRef), crop: design.crop });
    } else {
      photos.push(null);
    }
  }
  return { photos };
}

export async function generateBookInteriorPdf(book: BookData, size: PageSize = "a5"): Promise<Uint8Array> {
  const grids = book.pages.filter((p): p is GridPage => p.kind === "grid");
  if (grids.length === 0) throw new EmptyBookError();

  const spec = PAGE_SPECS[size];
  const doc = await PDFDocument.create();
  const fonts = await embedBookFonts(doc);

  // Every page goes through this factory so recto/verso binding-gutter margins
  // and the Trim/Bleed boxes are always right for its final position.
  const addPage: AddPage = () => {
    const g = pageGeometry(spec, sideForPageIndex(doc.getPageCount()));
    const page = doc.addPage([g.pageW, g.pageH]);
    setPrintBoxes(page, g);
    return { page, g };
  };

  // Every page is folioed (below). Full-bleed photo pages are tracked so their
  // folio gets a legibility plate behind it.
  const photoPageIdx = new Set<number>();

  // 1) Opening page — always present so a grid is never the lonely first recto
  //    facing the inside cover. A personal message makes it the dedication;
  //    otherwise it's a title page (book title + a sign-off from the makers).
  {
    const { page, g } = addPage();
    composeDedicationPage({
      page,
      g,
      fonts,
      text: book.dedicationText ?? "",
      font: book.dedicationFont,
      title: book.title,
      authors: dedicationSignatureNames(book.dedicationSignature, book.clueIdeas),
      signoff: book.dedicationSignoff,
    });
  }

  // 2) The spine, in editor order. Grids are numbered by their order among
  //    grid pages — the index and solutions reference these numbers.
  let gridNumber = 0;
  for (const p of book.pages) {
    const { page, g } = addPage();
    if (p.kind === "grid") {
      gridNumber += 1;
      await composeGridPage({ doc, page, g, fonts, grid: p, gridNumber, mode: "puzzle" });
    } else if (p.config.layout === "photo") {
      photoPageIdx.add(doc.getPageCount() - 1); // folio needs a plate over the image
      const layout = getPhotoLayout(p.config.photoLayout);
      const content = await loadPhotoContent(layout, p.config);
      await composePhotoPage({ doc, page, g, layout, content });
    } else {
      composeContentPage({ page, g, fonts, config: p.config });
    }
  }

  // 3) Word index + 4) Solutions (tiled plain answer-key mini grids).
  const gBase = pageGeometry(spec);
  composeIndexPages({ addPage, g: gBase, fonts, entries: book.wordIndex });
  composeSolutionsPages({ addPage, g: gBase, fonts, grids });

  // 5) Pad to a multiple-of-4 page count with blank (background-only) pages.
  while (doc.getPageCount() % 4 !== 0) {
    const { page, g } = addPage();
    page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(PAGE_BG) });
  }

  // 6) Folios — drawn last so they sit above each page's content. Every page is
  //    numbered by physical position (opening page is 1), recto/verso decides
  //    which side they hug, and photo pages get a legibility plate.
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const side = sideForPageIndex(i);
    drawFolio(pages[i], pageGeometry(spec, side), side, i + 1, fonts, photoPageIdx.has(i));
  }

  // Defensive: the counter and the composers share their pagination, so any
  // drift here is a bug (it would misplace the cover spine).
  const predicted = countInteriorPages(book, size);
  if (doc.getPageCount() !== predicted) {
    console.warn(`Interior page count drift: rendered ${doc.getPageCount()}, predicted ${predicted}`);
  }

  return doc.save();
}
