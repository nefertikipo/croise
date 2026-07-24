/**
 * Proof: render a real book's full print interior (grids → index → solutions)
 * and its back cover to PDFs, to eyeball the whole print pipeline.
 *
 *   pnpm tsx --env-file=.env.local scripts/proof-book-full.ts [BOOK_CODE] [a5|a4]
 *
 * Writes .context/proof-book.pdf and .context/proof-back-cover.pdf.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { db } from "@/db";
import { bookPages, books } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { loadBook } from "@/lib/books/serialize";
import { generateBookInteriorPdf } from "@/lib/book-pdf/generate-book";
import { generateBackCoverPdf } from "@/lib/book-pdf/compose-back-cover";
import { resolvePageSize } from "@/lib/book-pdf/geometry";

async function main() {
  const argCode = process.argv[2];
  const size = resolvePageSize(process.argv[3]);

  let code = argCode;
  if (!code) {
    const [gp] = await db.select({ bookId: bookPages.bookId }).from(bookPages).where(eq(bookPages.kind, "grid")).limit(1);
    if (!gp) throw new Error("No grid pages in any book.");
    const [b] = await db.select().from(books).where(eq(books.id, gp.bookId)).limit(1);
    code = b.code;
  }

  const book = await loadBook(code!);
  if (!book) throw new Error(`No book ${code}`);
  const grids = book.pages.filter((p) => p.kind === "grid").length;
  console.log(`Book ${code} "${book.title}": ${grids} grids, ${book.wordIndex.reduce((n, e) => n + e.words.length, 0)} words, size=${size}`);

  const interior = await generateBookInteriorPdf(book, size);
  const back = await generateBackCoverPdf({ title: book.title, code: book.code, cover: book.coverConfig });

  await mkdir(".context", { recursive: true });
  await writeFile(".context/proof-book.pdf", interior);
  await writeFile(".context/proof-back-cover.pdf", back);
  console.log("Wrote .context/proof-book.pdf and .context/proof-back-cover.pdf");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
