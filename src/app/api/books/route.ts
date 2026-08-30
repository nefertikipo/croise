import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books, bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { generateBookCode, retryOnUniqueViolation } from "@/lib/code";
import { copyCrossword } from "@/lib/books/copy-crossword";
import { auth } from "@/lib/auth";
import {
  bookClueIdeasSchema,
  bookDedicationSchema,
  bookTitleSchema,
} from "@/lib/books/validation";
import { and, count, desc, eq, inArray } from "drizzle-orm";

const requestSchema = z.object({
  title: bookTitleSchema.optional(),
  description: z.string().max(2000).optional(),
  dedicationText: bookDedicationSchema.optional(),
  clueIdeas: bookClueIdeasSchema.optional(),
  coverConfig: z.record(z.string(), z.unknown()).optional(),
  /** Which puzzle type this carnet holds (chosen in the wizard). */
  puzzleType: z.enum(["fleche", "croise", "melange"]).optional(),
  /** Link an already-generated grid (e.g. from /fleche) as the first page. */
  seedCrosswordCode: z.string().optional(),
  seedConfig: z
    .object({ gridColor: z.string().optional(), hiddenWord: z.string().optional() })
    .optional(),
});

/**
 * List the signed-in user's books (for the "add this grid to a book" picker on
 * /fleche). Anonymous callers get an empty list — anonymous books all share a
 * null owner, so there's no safe way to scope them to "yours".
 */
export async function GET(request: Request) {
  try {
    const authSession = await auth.api.getSession({ headers: request.headers });
    const ownerId = authSession?.user.id ?? null;
    if (!ownerId) return NextResponse.json({ books: [] });

    const rows = await db
      .select({ id: books.id, code: books.code, title: books.title })
      .from(books)
      .where(eq(books.ownerId, ownerId))
      .orderBy(desc(books.createdAt));

    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? await db
          .select({ bookId: bookPages.bookId, n: count() })
          .from(bookPages)
          .where(and(inArray(bookPages.bookId, ids), eq(bookPages.kind, "grid")))
          .groupBy(bookPages.bookId)
      : [];
    const gridCountById = new Map(counts.map((c) => [c.bookId, Number(c.n)]));

    return NextResponse.json({
      books: rows.map((r) => ({
        code: r.code,
        title: r.title,
        gridCount: gridCountById.get(r.id) ?? 0,
      })),
    });
  } catch (error) {
    console.error("Book list error:", error);
    return NextResponse.json({ error: "Failed to list books" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Book creation requires an account: every new book gets an owner so it is
    // always retrievable from "Mes livres" (legacy anonymous books are
    // unaffected — read paths and edit authorization stay as they were).
    const authSession = await auth.api.getSession({ headers: request.headers });
    const ownerId = authSession?.user.id;
    if (!ownerId) {
      return NextResponse.json(
        { error: "Connectez-vous pour créer un livre." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const result = requestSchema.safeParse(body ?? {});
    if (!result.success) {
      return NextResponse.json(
        { error: "Requête invalide : certains champs sont mal formés ou trop longs." },
        { status: 400 },
      );
    }
    const parsed = result.data;

    // Optionally seed the first grid page from an existing crossword — as a
    // deep COPY (like attach-grid), so deleting the book page later can never
    // destroy the original standalone grid the user may still share.
    let seedCrosswordId: string | null = null;
    if (parsed.seedCrosswordCode) {
      const [grid] = await db
        .select({ id: crosswords.id })
        .from(crosswords)
        .where(eq(crosswords.code, parsed.seedCrosswordCode))
        .limit(1);
      if (grid) {
        seedCrosswordId = await copyCrossword(grid.id);
      }
    }

    // Pre-generate the id so book + seed page insert atomically in one batch
    // (neon-http has no interactive transactions), retrying on the
    // astronomically rare share-code collision.
    const bookId = crypto.randomUUID();
    const code = await retryOnUniqueViolation(async () => {
      const freshCode = generateBookCode();
      const insertBook = db.insert(books).values({
        id: bookId,
        code: freshCode,
        ownerId,
        title: parsed.title || "Mon livre de mots fleches",
        description: parsed.description,
        dedicationText: parsed.dedicationText,
        clueIdeas: parsed.clueIdeas,
        coverConfig: parsed.coverConfig,
        language: "fr",
        puzzleType: parsed.puzzleType ?? "fleche",
        status: "draft",
      });
      if (seedCrosswordId) {
        await db.batch([
          insertBook,
          db.insert(bookPages).values({
            bookId,
            position: 0,
            kind: "grid",
            crosswordId: seedCrosswordId,
            config: parsed.seedConfig ?? {},
          }),
        ]);
      } else {
        await insertBook;
      }
      return freshCode;
    });

    return NextResponse.json({ id: bookId, code });
  } catch (error) {
    console.error("Book creation error:", error);
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
}
