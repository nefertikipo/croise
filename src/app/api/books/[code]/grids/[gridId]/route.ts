import { NextResponse } from "next/server";
import { db } from "@/db";
import { books, bookCrosswords } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string; gridId: string }> },
) {
  try {
    const { code, gridId } = await params;

    const [book] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.code, code))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Remove the link (placed_words cascade from crossword delete)
    await db
      .delete(bookCrosswords)
      .where(
        and(
          eq(bookCrosswords.bookId, book.id),
          eq(bookCrosswords.crosswordId, gridId),
        ),
      );

    // Delete the crossword itself (cascades to placed_words)
    await db.delete(crosswords).where(eq(crosswords.id, gridId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Grid deletion error:", error);
    return NextResponse.json({ error: "Failed to delete grid" }, { status: 500 });
  }
}
