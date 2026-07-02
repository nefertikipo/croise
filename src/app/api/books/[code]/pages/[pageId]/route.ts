import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { eq } from "drizzle-orm";

/** Update a page's config (grid styling or content-page fields). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; pageId: string }> },
) {
  try {
    const { pageId } = await params;
    const body = await request.json();

    const [page] = await db
      .select({ id: bookPages.id, config: bookPages.config })
      .from(bookPages)
      .where(eq(bookPages.id, pageId))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Merge into existing config so partial updates are safe.
    const current = (page.config as Record<string, unknown>) ?? {};
    const nextConfig =
      body.config !== undefined ? { ...current, ...body.config } : current;

    await db.update(bookPages).set({ config: nextConfig }).where(eq(bookPages.id, pageId));

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
    const { pageId } = await params;

    const [page] = await db
      .select({ id: bookPages.id, kind: bookPages.kind, crosswordId: bookPages.crosswordId })
      .from(bookPages)
      .where(eq(bookPages.id, pageId))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    await db.delete(bookPages).where(eq(bookPages.id, pageId));

    if (page.kind === "grid" && page.crosswordId) {
      // Cascades to placed_words.
      await db.delete(crosswords).where(eq(crosswords.id, page.crosswordId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Page deletion error:", error);
    return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
  }
}
