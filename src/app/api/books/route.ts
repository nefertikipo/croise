import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books, bookPages } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { generateBookCode } from "@/lib/code";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

const requestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  dedicationText: z.string().optional(),
  coverConfig: z.record(z.string(), z.unknown()).optional(),
  /** Link an already-generated grid (e.g. from /fleche) as the first page. */
  seedCrosswordCode: z.string().optional(),
  seedConfig: z
    .object({ gridColor: z.string().optional(), hiddenWord: z.string().optional() })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.parse(body ?? {});

    const code = generateBookCode();

    // Attach to the signed-in user if there is one (anonymous otherwise).
    const authSession = await auth.api.getSession({ headers: request.headers });
    const ownerId = authSession?.user.id ?? null;

    const [book] = await db
      .insert(books)
      .values({
        code,
        ownerId,
        title: parsed.title || "Mon livre de mots fleches",
        description: parsed.description,
        dedicationText: parsed.dedicationText,
        coverConfig: parsed.coverConfig,
        language: "fr",
        status: "draft",
      })
      .returning({ id: books.id, code: books.code });

    // Optionally seed the first grid page from an existing crossword.
    if (parsed.seedCrosswordCode) {
      const [grid] = await db
        .select({ id: crosswords.id })
        .from(crosswords)
        .where(eq(crosswords.code, parsed.seedCrosswordCode))
        .limit(1);
      if (grid) {
        await db.insert(bookPages).values({
          bookId: book.id,
          position: 0,
          kind: "grid",
          crosswordId: grid.id,
          config: parsed.seedConfig ?? {},
        });
      }
    }

    return NextResponse.json({ id: book.id, code: book.code });
  } catch (error) {
    console.error("Book creation error:", error);
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
}
