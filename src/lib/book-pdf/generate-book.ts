/**
 * Assemble the print-ready interior of a book into one PDF: every grid page,
 * then the word index, then the solutions — at A5 (the book) or A4
 * (print-at-home). Covers are separate files (see generate-cover / back-cover),
 * as print-on-demand expects.
 */

import { PDFDocument } from "pdf-lib";
import { embedBookFonts } from "@/lib/book-pdf/fonts";
import { composeGridPage } from "@/lib/book-pdf/compose-grid-page";
import { composeIndexPages } from "@/lib/book-pdf/compose-index-page";
import { pageGeometry, PAGE_SPECS, drawCropMarks, type PageSize } from "@/lib/book-pdf/geometry";
import type { BookData, GridPage } from "@/types/book";

/** Thrown when a book has no grid pages to print. */
export class EmptyBookError extends Error {
  constructor() {
    super("Book has no grids to print.");
    this.name = "EmptyBookError";
  }
}

export async function generateBookInteriorPdf(book: BookData, size: PageSize = "a5"): Promise<Uint8Array> {
  const grids = book.pages.filter((p): p is GridPage => p.kind === "grid");
  if (grids.length === 0) throw new EmptyBookError();

  const g = pageGeometry(PAGE_SPECS[size]);
  const doc = await PDFDocument.create();
  const fonts = await embedBookFonts(doc);

  // 1) Puzzle pages, numbered in book order.
  grids.forEach((grid, i) => {
    const page = doc.addPage([g.pageW, g.pageH]);
    composeGridPage({ page, g, fonts, grid, gridNumber: i + 1, mode: "puzzle" });
    drawCropMarks(page, g);
  });

  // 2) Word index.
  composeIndexPages({ doc, g, fonts, entries: book.wordIndex });

  // 3) Solutions, same order.
  grids.forEach((grid, i) => {
    const page = doc.addPage([g.pageW, g.pageH]);
    composeGridPage({
      page,
      g,
      fonts,
      grid,
      gridNumber: i + 1,
      mode: "solution",
      headingOverride: `Solution — ${grid.config.title ?? `Grille N°${i + 1}`}`,
    });
    drawCropMarks(page, g);
  });

  return doc.save();
}
