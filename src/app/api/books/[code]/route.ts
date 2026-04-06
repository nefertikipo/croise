import { NextResponse } from "next/server";
import { db } from "@/db";
import { books, bookCrosswords } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq, asc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.code, code))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Get all grids in order
    const gridLinks = await db
      .select({
        crosswordId: bookCrosswords.crosswordId,
        position: bookCrosswords.position,
      })
      .from(bookCrosswords)
      .where(eq(bookCrosswords.bookId, book.id))
      .orderBy(asc(bookCrosswords.position));

    const grids = [];
    for (const link of gridLinks) {
      const [grid] = await db
        .select()
        .from(crosswords)
        .where(eq(crosswords.id, link.crosswordId))
        .limit(1);

      if (!grid) continue;

      const words = await db
        .select()
        .from(placedWords)
        .where(eq(placedWords.crosswordId, grid.id));

      grids.push({
        id: grid.id,
        code: grid.code,
        width: grid.width,
        height: grid.height,
        gridPattern: grid.gridPattern,
        gridSolution: grid.gridSolution,
        position: link.position,
        words: words.map((w) => ({
          answer: w.answer,
          clue: w.clueText,
          direction: w.direction,
          startRow: w.startRow,
          startCol: w.startCol,
          length: w.length,
          isCustom: w.isCustom,
        })),
      });
    }

    return NextResponse.json({
      id: book.id,
      code: book.code,
      title: book.title,
      description: book.description,
      dedicationText: book.dedicationText,
      language: book.language,
      status: book.status,
      grids,
    });
  } catch (error) {
    console.error("Book fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch book" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const body = await request.json();

    const [book] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.code, code))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.dedicationText !== undefined) updates.dedicationText = body.dedicationText;

    if (Object.keys(updates).length > 0) {
      await db.update(books).set(updates).where(eq(books.id, book.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Book update error:", error);
    return NextResponse.json({ error: "Failed to update book" }, { status: 500 });
  }
}
