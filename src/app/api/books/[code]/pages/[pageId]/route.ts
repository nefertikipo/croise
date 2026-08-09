import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { and, eq } from "drizzle-orm";
import { authorizeBookEdit, touchBookStatement } from "@/lib/books/authorize";
import { loadBook } from "@/lib/books/serialize";
import { interiorPageCountForCapacity } from "@/lib/book-pdf/generate-book";
import type { BatchItem } from "drizzle-orm/batch";

/** Update a page's config (grid styling or content-page fields). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; pageId: string }> },
) {
  try {
    const { code, pageId } = await params;

    const authz = await authorizeBookEdit(request, code);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const book = authz.book;

    const body = await request.json();

    // Scope to the book from the URL so a page id from another book 404s.
    const [page] = await db
      .select({ id: bookPages.id, config: bookPages.config })
      .from(bookPages)
      .where(and(eq(bookPages.id, pageId), eq(bookPages.bookId, book.id)))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Merge into existing config so partial updates are safe.
    const current = (page.config as Record<string, unknown>) ?? {};
    const nextConfig =
      body.config !== undefined ? { ...current, ...body.config } : current;

    await db.batch([
      db
        .update(bookPages)
        .set({ config: nextConfig })
        .where(and(eq(bookPages.id, pageId), eq(bookPages.bookId, book.id))),
      touchBookStatement(book.id),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Page update error:", error);
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
  }
}

/** Delete a page. For grid pages, also delete the underlying crossword. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string; pageId: string }> },
) {
  try {
    const { code, pageId } = await params;

    const authz = await authorizeBookEdit(request, code);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const book = authz.book;

    // Scope to the book from the URL so a page id from another book 404s.
    const [page] = await db
      .select({ id: bookPages.id, kind: bookPages.kind, crosswordId: bookPages.crosswordId })
      .from(bookPages)
      .where(and(eq(bookPages.id, pageId), eq(bookPages.bookId, book.id)))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const statements: BatchItem<"pg">[] = [
      db
        .delete(bookPages)
        .where(and(eq(bookPages.id, pageId), eq(bookPages.bookId, book.id))),
      touchBookStatement(book.id),
    ];
    if (page.kind === "grid" && page.crosswordId) {
      // Cascades to placed_words.
      statements.push(db.delete(crosswords).where(eq(crosswords.id, page.crosswordId)));
    }
    await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

    // Report the freed page count so the editor can re-enable add controls.
    const afterDelete = await loadBook(code);
    const interiorPages = afterDelete
      ? interiorPageCountForCapacity(afterDelete)
      : undefined;
    return NextResponse.json({ success: true, interiorPages });
  } catch (error) {
    console.error("Page deletion error:", error);
    return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
  }
}
