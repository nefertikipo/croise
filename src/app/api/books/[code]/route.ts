import { NextResponse } from "next/server";
import { db } from "@/db";
import { books } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { loadBook } from "@/lib/books/serialize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const book = await loadBook(code);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
    return NextResponse.json(book);
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
    const body = await request.json().catch(() => ({}));

    const [book] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.code, code))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.dedicationText !== undefined) updates.dedicationText = body.dedicationText;
    if (body.coverConfig !== undefined) updates.coverConfig = body.coverConfig;
    if (body.status !== undefined) updates.status = body.status;

    await db.update(books).set(updates).where(eq(books.id, book.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Book update error:", error);
    return NextResponse.json({ error: "Failed to update book" }, { status: 500 });
  }
}
