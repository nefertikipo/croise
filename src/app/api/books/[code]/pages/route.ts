import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookPages } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { serializePage, loadBook } from "@/lib/books/serialize";
import { authorizeBookEdit, touchBookStatement } from "@/lib/books/authorize";
import { interiorPageCountForCapacity } from "@/lib/book-pdf/generate-book";
import { SADDLE_MAX_INTERIOR_PAGES } from "@/lib/books/constants";

const requestSchema = z.object({
  layout: z.enum(["note", "quote", "photo"]).default("note"),
  photoLayout: z.string().optional(),
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

    const authz = await authorizeBookEdit(request, code);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const book = authz.book;

    // HARD page ceiling: refuse to grow a book past the saddle-stitch printable
    // window (a content page adds exactly one interior page).
    const loadedForCapacity = await loadBook(code);
    if (
      loadedForCapacity &&
      interiorPageCountForCapacity(loadedForCapacity) >= SADDLE_MAX_INTERIOR_PAGES
    ) {
      return NextResponse.json(
        {
          error: `Votre carnet atteint la limite de ${SADDLE_MAX_INTERIOR_PAGES} pages imprimables. Supprimez des pages pour en ajouter une autre.`,
        },
        { status: 409 },
      );
    }

    const existing = await db
      .select({ position: bookPages.position })
      .from(bookPages)
      .where(eq(bookPages.bookId, book.id));

    const position =
      existing.length > 0 ? Math.max(...existing.map((p) => p.position)) + 1 : 0;

    const pageId = crypto.randomUUID();
    await db.batch([
      db.insert(bookPages).values({
        id: pageId,
        bookId: book.id,
        position,
        kind: "content",
        config,
      }),
      touchBookStatement(book.id),
    ]);

    const serialized = await serializePage(pageId);
    const afterAdd = await loadBook(code);
    const interiorPages = afterAdd ? interiorPageCountForCapacity(afterAdd) : undefined;
    return NextResponse.json({ ...serialized, interiorPages });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    console.error("Content page creation error:", error);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
}
