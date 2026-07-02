import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books, bookPages } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { serializePage } from "@/lib/books/serialize";

const requestSchema = z.object({
  layout: z.enum(["note", "quote"]).default("note"),
  title: z.string().optional(),
  body: z.string().optional(),
  quote: z.string().optional(),
  backgroundColor: z.string().optional(),
  imageUrl: z.string().optional(),
  /** Insert after this position (defaults to end). */
  afterPosition: z.number().optional(),
});

/** Create a content page in the book spine. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const config = requestSchema.parse(await request.json());

    const [book] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.code, code))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const existing = await db
      .select({ position: bookPages.position })
      .from(bookPages)
      .where(eq(bookPages.bookId, book.id));

    const position =
      existing.length > 0 ? Math.max(...existing.map((p) => p.position)) + 1 : 0;

    const [page] = await db
      .insert(bookPages)
      .values({
        bookId: book.id,
        position,
        kind: "content",
        config,
      })
      .returning({ id: bookPages.id });

    const serialized = await serializePage(page.id);
    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Content page creation error:", error);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
}
