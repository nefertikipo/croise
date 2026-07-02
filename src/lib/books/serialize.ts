import { db } from "@/db";
import { books, bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq, asc, inArray } from "drizzle-orm";
import { reconstructCells } from "@/lib/crossword/reconstruct-cells";
import { buildWordIndex } from "@/lib/crossword/word-index";
import type {
  BookData,
  BookPageData,
  ContentPageConfig,
  CoverConfig,
  GridPage,
  GridPageConfig,
} from "@/types/book";

interface PageRow {
  id: string;
  position: number;
  kind: string;
  crosswordId: string | null;
  config: unknown;
}

/** Build a single grid page payload from its spine row + crossword + words. */
async function serializeGridPage(page: PageRow): Promise<GridPage | null> {
  if (!page.crosswordId) return null;
  const [grid] = await db
    .select()
    .from(crosswords)
    .where(eq(crosswords.id, page.crosswordId))
    .limit(1);
  if (!grid) return null;

  const words = await db
    .select()
    .from(placedWords)
    .where(eq(placedWords.crosswordId, grid.id));

  return {
    kind: "grid",
    pageId: page.id,
    gridId: grid.id,
    code: grid.code,
    position: page.position,
    width: grid.width,
    height: grid.height,
    cells: reconstructCells(grid, words),
    words: words.map((w) => ({
      answer: w.answer,
      clue: w.clueText,
      direction: w.direction,
      isCustom: w.isCustom,
    })),
    config: (page.config as GridPageConfig) ?? {},
  };
}

/** Serialize the ordered spine (grid + content pages) of a book. */
export async function serializePages(bookId: string): Promise<BookPageData[]> {
  const rows = await db
    .select({
      id: bookPages.id,
      position: bookPages.position,
      kind: bookPages.kind,
      crosswordId: bookPages.crosswordId,
      config: bookPages.config,
    })
    .from(bookPages)
    .where(eq(bookPages.bookId, bookId))
    .orderBy(asc(bookPages.position));

  const pages: BookPageData[] = [];
  for (const row of rows) {
    if (row.kind === "grid") {
      const gp = await serializeGridPage(row);
      if (gp) pages.push(gp);
    } else {
      pages.push({
        kind: "content",
        pageId: row.id,
        position: row.position,
        config: (row.config as ContentPageConfig) ?? { layout: "note" },
      });
    }
  }
  return pages;
}

/** Full book payload for GET /api/books/[code]. Returns null if not found. */
export async function loadBook(code: string): Promise<BookData | null> {
  const [book] = await db.select().from(books).where(eq(books.code, code)).limit(1);
  if (!book) return null;

  const pages = await serializePages(book.id);
  const grids = pages.filter((p): p is GridPage => p.kind === "grid");

  return {
    id: book.id,
    code: book.code,
    title: book.title,
    description: book.description,
    dedicationText: book.dedicationText,
    coverConfig: (book.coverConfig as CoverConfig) ?? null,
    language: book.language,
    status: book.status,
    pages,
    wordIndex: buildWordIndex(grids),
  };
}

/** Serialize one page (grid or content) by its id, for returning after a mutation. */
export async function serializePage(pageId: string): Promise<BookPageData | null> {
  const rows = await db
    .select({
      id: bookPages.id,
      position: bookPages.position,
      kind: bookPages.kind,
      crosswordId: bookPages.crosswordId,
      config: bookPages.config,
    })
    .from(bookPages)
    .where(inArray(bookPages.id, [pageId]))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.kind === "grid") return serializeGridPage(row);
  return {
    kind: "content",
    pageId: row.id,
    position: row.position,
    config: (row.config as ContentPageConfig) ?? { layout: "note" },
  };
}
