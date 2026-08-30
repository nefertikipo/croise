import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { books } from "@/db/schema/books";
import { composeInput } from "@/lib/crossword/normalize";
import { BOOK_CLUE_IDEAS_MAX, bookContributionSchema } from "@/lib/books/validation";

/**
 * Public "invite friends to add clues" endpoint. Anyone holding a book's share
 * code may append one clue idea to its pool — but ONLY when the owner has
 * opted in (`contributionsEnabled`). No login: the share link is the
 * credential, mirroring how anonymous books are edited by code.
 *
 * The append is atomic (jsonb `||` with a length guard in the WHERE) so two
 * contributors submitting at the same moment can't clobber each other, and the
 * 200-idea cap can't be exceeded by a race.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const body = await request.json().catch(() => ({}));
  const parsed = bookContributionSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Indice invalide." }, { status: 400 });
  }

  // Normalize the answer the same way the generator/CSV import do, then require
  // at least two letters so a blank/one-letter entry can't slip in.
  const answer = composeInput(parsed.data.answer).slice(0, 120);
  if (answer.length < 2) {
    return NextResponse.json(
      { error: "Le mot doit faire au moins deux lettres." },
      { status: 400 },
    );
  }
  const clue = parsed.data.clue.trim().slice(0, 500);
  const author = parsed.data.author?.trim().slice(0, 80) || undefined;

  const [book] = await db
    .select({ id: books.id, enabled: books.contributionsEnabled })
    .from(books)
    .where(eq(books.code, code))
    .limit(1);
  if (!book) {
    return NextResponse.json({ error: "Carnet introuvable." }, { status: 404 });
  }
  if (!book.enabled) {
    return NextResponse.json(
      { error: "Les contributions sont fermées pour ce carnet." },
      { status: 403 },
    );
  }

  const idea = {
    id: crypto.randomUUID(),
    answer,
    clue,
    ...(author ? { author } : {}),
  };

  const appended = await db
    .update(books)
    .set({
      clueIdeas: sql`COALESCE(${books.clueIdeas}, '[]'::jsonb) || ${JSON.stringify([idea])}::jsonb`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(books.id, book.id),
        sql`jsonb_array_length(COALESCE(${books.clueIdeas}, '[]'::jsonb)) < ${BOOK_CLUE_IDEAS_MAX}`,
      ),
    )
    .returning({ count: sql<number>`jsonb_array_length(${books.clueIdeas})` });

  if (appended.length === 0) {
    return NextResponse.json(
      { error: "Ce carnet a atteint le nombre maximal d'idées." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, count: Number(appended[0].count) });
}
