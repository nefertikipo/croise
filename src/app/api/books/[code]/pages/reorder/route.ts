import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books, bookPages } from "@/db/schema/books";
import { eq } from "drizzle-orm";

const requestSchema = z.object({
  pageIds: z.array(z.string()),
});

/** Rewrite spine positions to match the given page order. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const { pageIds } = requestSchema.parse(await request.json());

    const [book] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.code, code))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    await Promise.all(
      pageIds.map((id, index) =>
        db
          .update(bookPages)
          .set({ position: index })
          .where(eq(bookPages.id, id)),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json({ error: "Failed to reorder pages" }, { status: 500 });
  }
}
