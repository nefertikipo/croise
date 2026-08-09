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

import { PDFDocument } from "pdf-lib";
import { embedBookFonts } from "@/lib/book-pdf/fonts";
import { composeGridPage } from "@/lib/book-pdf/compose-grid-page";
import { composeContentPage, composeDedicationPage } from "@/lib/book-pdf/compose-content-page";
import { composeIndexPages, countIndexPages } from "@/lib/book-pdf/compose-index-page";
import { bookAuthors } from "@/lib/books/authors";
import { composePhotoPage, type PhotoPageContent } from "@/lib/book-pdf/compose-photo-page";
import { composeSolutionsPages, countSolutionsPages } from "@/lib/book-pdf/compose-solutions-page";
import { getPhotoLayout, type PhotoLayout } from "@/lib/book-pdf/photo-layouts";
import { getOriginal } from "@/lib/book-pdf/photo-store";
import {
  hex2rgb,
  pageGeometry,
  setPrintBoxes,
  sideForPageIndex,
  PAGE_SPECS,
  type AddPage,
  type PageSize,
} from "@/lib/book-pdf/geometry";
import type { BookData, ContentPageConfig, GridPage } from "@/types/book";

const PAGE_BG = "#fff6ec";

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
      authors: bookAuthors(book.clueIdeas),
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

  // Defensive: the counter and the composers share their pagination, so any
  // drift here is a bug (it would misplace the cover spine).
  const predicted = countInteriorPages(book, size);
  if (doc.getPageCount() !== predicted) {
    console.warn(`Interior page count drift: rendered ${doc.getPageCount()}, predicted ${predicted}`);
  }

  return doc.save();
}
