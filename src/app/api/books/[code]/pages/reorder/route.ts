import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { and, eq } from "drizzle-orm";
import { authorizeBookEdit, touchBookStatement } from "@/lib/books/authorize";
import type { BatchItem } from "drizzle-orm/batch";

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

    const authz = await authorizeBookEdit(request, code);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const book = authz.book;

    if (pageIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    // One atomic batch; every update is scoped to THIS book so a page id from
    // another book can't be moved.
    const statements: BatchItem<"pg">[] = pageIds.map((id, index) =>
      db
        .update(bookPages)
        .set({ position: index })
        .where(and(eq(bookPages.id, id), eq(bookPages.bookId, book.id))),
    );
    statements.push(touchBookStatement(book.id));
    await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    console.error("Reorder error:", error);
    return NextResponse.json({ error: "Failed to reorder pages" }, { status: 500 });
  }
}
