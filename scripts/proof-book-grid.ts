/**
 * Proof: render a real book's first grid to a print-ready A5 PDF — puzzle,
 * solution and plain answer-key variants — so we can eyeball vector fidelity
 * against the on-screen FlecheGrid.
 *
 *   pnpm tsx --env-file=.env.local scripts/proof-book-grid.ts [BOOK_CODE]
 *
 * Writes .context/proof-grid.pdf.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { db } from "@/db";
import { bookPages, books } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { serializePages } from "@/lib/books/serialize";
import { embedBookFonts } from "@/lib/book-pdf/fonts";
import { composeGridPage } from "@/lib/book-pdf/compose-grid-page";
import { PAGE_SPECS, pageGeometry, drawCropMarks } from "@/lib/book-pdf/geometry";
import type { GridPage } from "@/types/book";

async function main() {
  const argCode = process.argv[2];

  // Find a book that actually has grid pages.
  let bookId: string;
  let code: string;
  if (argCode) {
    const [b] = await db.select().from(books).where(eq(books.code, argCode)).limit(1);
    if (!b) throw new Error(`No book with code ${argCode}`);
    bookId = b.id;
    code = b.code;
  } else {
    const [gp] = await db.select({ bookId: bookPages.bookId }).from(bookPages).where(eq(bookPages.kind, "grid")).limit(1);
    if (!gp) throw new Error("No grid pages in any book — create one on /fleche and add to a book.");
    bookId = gp.bookId;
    const [b] = await db.select().from(books).where(eq(books.id, bookId)).limit(1);
    code = b.code;
  }

  const pages = await serializePages(bookId);
  const grids = pages.filter((p): p is GridPage => p.kind === "grid");
  if (grids.length === 0) throw new Error("Book has no grid pages.");
  const grid = grids[0];
  console.log(`Book ${code}: ${grids.length} grid(s). Rendering grid ${grid.width}×${grid.height}, hidden="${grid.config.hiddenWord ?? ""}"`);

  const spec = PAGE_SPECS.a5;
  const g = pageGeometry(spec);
  const doc = await PDFDocument.create();
  const fonts = await embedBookFonts(doc);

  for (const mode of ["puzzle", "solution", "plain"] as const) {
    const page = doc.addPage([g.pageW, g.pageH]);
    composeGridPage({
      page,
      g,
      fonts,
      grid,
      gridNumber: 1,
      mode,
      headingOverride: mode === "puzzle" ? undefined : mode === "solution" ? "Solution — Grille 1" : "Clé — Grille 1",
    });
    drawCropMarks(page, g);
  }

  const bytes = await doc.save();
  await mkdir(".context", { recursive: true });
  await writeFile(".context/proof-grid.pdf", bytes);
  console.log("Wrote .context/proof-grid.pdf");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
