import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { and, eq, inArray } from "drizzle-orm";
import { serializePage } from "@/lib/books/serialize";
import { copyCrossword } from "@/lib/books/copy-crossword";
import { authorizeBookEdit, touchBookStatement } from "@/lib/books/authorize";
import { normalizeAnswer } from "@/lib/crossword/normalize";
import { BOOK_MIN_GRIDS, FILLER_THEME } from "@/lib/books/constants";
import type { BookPageData } from "@/types/book";

export const maxDuration = 60;

const requestSchema = z.object({
  /** How many filler grids to add. Defaults to "enough to reach the minimum". */
  count: z.number().int().min(1).max(BOOK_MIN_GRIDS).optional(),
});

/**
 * Top up a short book with generic filler grids drawn from the shared bank of
 * `/contribuer`-word grids (`crosswords.theme = FILLER_THEME`). Picks pristine
 * bank grids (never one already attached to a book) whose CUSTOM answers don't
 * collide with the book's, copies each into the book, and returns the new pages.
 *
 * Instant vs the generic-grid path (`/grids`), which generates fresh — here we
 * only copy pre-made grids. Conflict is judged on custom answers only (the words
 * a reader notices); background corpus fill may repeat across padding pages, the
 * same tolerance the book grants short filler.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const { count } = requestSchema.parse(await request.json().catch(() => ({})));

    const authz = await authorizeBookEdit(request, code);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const book = authz.book;

    const allPages = await db
      .select({ position: bookPages.position, kind: bookPages.kind, crosswordId: bookPages.crosswordId })
      .from(bookPages)
      .where(eq(bookPages.bookId, book.id));
    const gridCount = allPages.filter((p) => p.kind === "grid").length;

    const need = count ?? Math.max(0, BOOK_MIN_GRIDS - gridCount);
    if (need <= 0) {
      return NextResponse.json({ pages: [], attached: 0, needed: 0 });
    }

    // Bank = filler grids in the book's language not yet attached to any book
    // (attached copies are separate rows, so a copy is never re-picked).
    const bankRows = await db
      .select({ id: crosswords.id })
      .from(crosswords)
      .where(and(eq(crosswords.theme, FILLER_THEME), eq(crosswords.language, book.language)));
    const usedAsPage = new Set(
      (await db.select({ crosswordId: bookPages.crosswordId }).from(bookPages))
        .map((r) => r.crosswordId)
        .filter(Boolean) as string[],
    );
    const candidateIds = bankRows.map((r) => r.id).filter((id) => !usedAsPage.has(id));
    if (candidateIds.length === 0) {
      return NextResponse.json({ pages: [], attached: 0, needed: need, exhausted: true });
    }

    // Each candidate's custom answers, and the book's existing custom answers.
    const candidateCustom = await db
      .select({ crosswordId: placedWords.crosswordId, answer: placedWords.answer })
      .from(placedWords)
      .where(and(inArray(placedWords.crosswordId, candidateIds), eq(placedWords.isCustom, true)));
    const customByGrid = new Map<string, string[]>();
    for (const w of candidateCustom) {
      const arr = customByGrid.get(w.crosswordId) ?? [];
      arr.push(normalizeAnswer(w.answer));
      customByGrid.set(w.crosswordId, arr);
    }

    const bookGridIds = allPages
      .filter((p) => p.kind === "grid" && p.crosswordId)
      .map((p) => p.crosswordId as string);
    const usedCustom = new Set<string>();
    if (bookGridIds.length > 0) {
      const rows = await db
        .select({ answer: placedWords.answer })
        .from(placedWords)
        .where(and(inArray(placedWords.crosswordId, bookGridIds), eq(placedWords.isCustom, true)));
      for (const r of rows) usedCustom.add(normalizeAnswer(r.answer));
    }

    // Greedily pick grids with no custom-answer clash; reserve each pick's custom
    // answers so successive fillers don't collide with one another either.
    const picked: string[] = [];
    for (const id of candidateIds) {
      if (picked.length >= need) break;
      const custom = customByGrid.get(id) ?? [];
      if (custom.some((w) => usedCustom.has(w))) continue;
      picked.push(id);
      for (const w of custom) usedCustom.add(w);
    }

    let position =
      allPages.length > 0 ? Math.max(...allPages.map((p) => p.position)) + 1 : 0;
    const newPages: BookPageData[] = [];
    for (const sourceId of picked) {
      const crosswordId = await copyCrossword(sourceId);
      if (!crosswordId) continue;
      // The copy must not carry the bank marker (copyCrossword clones `theme`),
      // or a deleted-page orphan could re-enter the bank pick.
      await db.update(crosswords).set({ theme: null }).where(eq(crosswords.id, crosswordId));
      const pageId = crypto.randomUUID();
      await db.insert(bookPages).values({
        id: pageId,
        bookId: book.id,
        position: position++,
        kind: "grid",
        crosswordId,
        config: {},
      });
      const serialized = await serializePage(pageId);
      if (serialized) newPages.push(serialized);
    }
    if (newPages.length > 0) await touchBookStatement(book.id);

    return NextResponse.json({
      pages: newPages,
      attached: newPages.length,
      needed: need,
      exhausted: picked.length < need,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    console.error("Add filler grids error:", error);
    return NextResponse.json({ error: "Failed to add filler grids" }, { status: 500 });
  }
}
