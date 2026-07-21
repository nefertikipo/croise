import { NextResponse } from "next/server";
import { db } from "@/db";
import { books } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { loadBook } from "@/lib/books/serialize";
import { auth } from "@/lib/auth";

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const [book] = await db
      .select({ id: books.id, ownerId: books.ownerId })
      .from(books)
      .where(eq(books.code, code))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: "Livre introuvable" }, { status: 404 });
    }

    if (book.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // book_pages rows cascade on book delete; the grids themselves are kept.
    await db.delete(books).where(eq(books.id, book.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Book delete error:", error);
    return NextResponse.json({ error: "Failed to delete book" }, { status: 500 });
  }
}
