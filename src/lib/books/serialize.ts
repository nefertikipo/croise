import { db } from "@/db";
import { books, bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { americanCrosswords } from "@/db/schema/american-crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq, asc, inArray } from "drizzle-orm";
import { reconstructCells } from "@/lib/crossword/reconstruct-cells";
import { buildWordIndex } from "@/lib/crossword/word-index";
import type {
  BookData,
  BookPageData,
  ClueIdea,
  ContentPageConfig,
  CoverConfig,
  CroisesPage,
  GridPage,
  GridPageConfig,
  PuzzleType,
} from "@/types/book";
import type { AmPuzzle } from "@/lib/crossword/american/types";

interface PageRow {
  id: string;
  position: number;
  kind: string;
  crosswordId: string | null;
  americanCrosswordId: string | null;
  config: unknown;
}

/** Load mots croisés rows for a set of ids, keyed by id. */
async function loadCroisesData(
  ids: string[],
): Promise<Map<string, { id: string; code: string; puzzle: AmPuzzle }>> {
  const byId = new Map<string, { id: string; code: string; puzzle: AmPuzzle }>();
  if (ids.length === 0) return byId;
  const rows = await db
    .select({
      id: americanCrosswords.id,
      code: americanCrosswords.code,
      puzzle: americanCrosswords.puzzle,
    })
    .from(americanCrosswords)
    .where(inArray(americanCrosswords.id, ids));
  for (const r of rows) byId.set(r.id, r);
  return byId;
}

function buildCroisesPage(
  page: PageRow,
  data: { id: string; code: string; puzzle: AmPuzzle },
): CroisesPage {
  return {
    kind: "croises",
    pageId: page.id,
    gridId: data.id,
    code: data.code,
    position: page.position,
    puzzle: data.puzzle,
    config: (page.config as GridPageConfig) ?? {},
  };
}

interface GridData {
  grid: typeof crosswords.$inferSelect;
  words: (typeof placedWords.$inferSelect)[];
}

/**
 * Load crosswords + their placed words for a set of ids in two batched queries
 * (instead of two queries per grid page), grouped by crossword id.
 */
async function loadGridData(crosswordIds: string[]): Promise<Map<string, GridData>> {
  const byId = new Map<string, GridData>();
  if (crosswordIds.length === 0) return byId;

  const grids = await db
    .select()
    .from(crosswords)
    .where(inArray(crosswords.id, crosswordIds));
  for (const grid of grids) byId.set(grid.id, { grid, words: [] });

  const words = await db
    .select()
    .from(placedWords)
    .where(inArray(placedWords.crosswordId, crosswordIds));
  for (const w of words) byId.get(w.crosswordId)?.words.push(w);

  return byId;
}

/** Build a single grid page payload from its spine row + crossword + words. */
function buildGridPage(page: PageRow, data: GridData): GridPage {
  const { grid, words } = data;
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
      difficulty: w.difficulty,
    })),
    config: (page.config as GridPageConfig) ?? {},
  };
}

/** A grid page whose crossword is gone can't render; drop it, but never silently. */
function reportMissingCrossword(page: PageRow, bookRef: string): void {
  console.error(
    `[books] grid page ${page.id} (book ${bookRef}) references missing crossword ` +
      `${page.crosswordId ?? "(null)"} — dropping the page from the payload`,
  );
}

/** Serialize the ordered spine (grid + content pages) of a book. */
export async function serializePages(
  bookId: string,
  bookCode?: string,
): Promise<BookPageData[]> {
  const rows = await db
    .select({
      id: bookPages.id,
      position: bookPages.position,
      kind: bookPages.kind,
      crosswordId: bookPages.crosswordId,
      americanCrosswordId: bookPages.americanCrosswordId,
      config: bookPages.config,
    })
    .from(bookPages)
    .where(eq(bookPages.bookId, bookId))
    .orderBy(asc(bookPages.position));

  const gridIds = rows
    .filter((r) => r.kind === "grid" && r.crosswordId !== null)
    .map((r) => r.crosswordId as string);
  const gridData = await loadGridData(gridIds);

  const croisesIds = rows
    .filter((r) => r.kind === "croises" && r.americanCrosswordId !== null)
    .map((r) => r.americanCrosswordId as string);
  const croisesData = await loadCroisesData(croisesIds);

  const pages: BookPageData[] = [];
  for (const row of rows) {
    if (row.kind === "grid") {
      const data = row.crosswordId ? gridData.get(row.crosswordId) : undefined;
      if (!data) {
        reportMissingCrossword(row, bookCode ?? bookId);
        continue;
      }
      pages.push(buildGridPage(row, data));
    } else if (row.kind === "croises") {
      const data = row.americanCrosswordId
        ? croisesData.get(row.americanCrosswordId)
        : undefined;
      if (!data) {
        console.error(
          `[books] croisés page ${row.id} (book ${bookCode ?? bookId}) references ` +
            `missing grid ${row.americanCrosswordId ?? "(null)"} — dropping`,
        );
        continue;
      }
      pages.push(buildCroisesPage(row, data));
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

  const pages = await serializePages(book.id, book.code);
  const grids = pages.filter((p): p is GridPage => p.kind === "grid");

  return {
    id: book.id,
    code: book.code,
    title: book.title,
    description: book.description,
    dedicationText: book.dedicationText,
    dedicationFont: book.dedicationFont,
    dedicationSignature: book.dedicationSignature,
    dedicationSignoff: book.dedicationSignoff,
    coverConfig: (book.coverConfig as CoverConfig) ?? null,
    clueIdeas: (book.clueIdeas as ClueIdea[]) ?? [],
    language: book.language,
    puzzleType: (book.puzzleType as PuzzleType) ?? "fleche",
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
      americanCrosswordId: bookPages.americanCrosswordId,
      config: bookPages.config,
    })
    .from(bookPages)
    .where(eq(bookPages.id, pageId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.kind === "grid") {
    const data = row.crosswordId
      ? (await loadGridData([row.crosswordId])).get(row.crosswordId)
      : undefined;
    if (!data) {
      reportMissingCrossword(row, "(single-page load)");
      return null;
    }
    return buildGridPage(row, data);
  }
  if (row.kind === "croises") {
    const data = row.americanCrosswordId
      ? (await loadCroisesData([row.americanCrosswordId])).get(row.americanCrosswordId)
      : undefined;
    if (!data) return null;
    return buildCroisesPage(row, data);
  }
  return {
    kind: "content",
    pageId: row.id,
    position: row.position,
    config: (row.config as ContentPageConfig) ?? { layout: "note" },
  };
}
