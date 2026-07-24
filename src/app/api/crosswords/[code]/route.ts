import { NextResponse } from "next/server";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { bookPages } from "@/db/schema/books";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const crossword = await db
    .select()
    .from(crosswords)
    .where(eq(crosswords.code, code))
    .limit(1);

  if (crossword.length === 0) {
    return NextResponse.json({ error: "Crossword not found" }, { status: 404 });
  }

  const words = await db
    .select()
    .from(placedWords)
    .where(eq(placedWords.crosswordId, crossword[0].id));

  const width = crossword[0].width;
  const height = crossword[0].height;
  const solution = crossword[0].gridSolution;

  // Convert flat solution string back to grid rows
  const grid: string[] = [];
  for (let r = 0; r < height; r++) {
    grid.push(solution.slice(r * width, (r + 1) * width));
  }

  return NextResponse.json({
    ...crossword[0],
    grid,
    words: words.map((w) => ({
      answer: w.answer,
      clue: w.clueText,
      direction: w.direction,
      number: w.number,
      startRow: w.startRow,
      startCol: w.startCol,
      length: w.length,
      isCustom: w.isCustom,
    })),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const [grid] = await db
    .select({ id: crosswords.id, ownerId: crosswords.ownerId })
    .from(crosswords)
    .where(eq(crosswords.code, code))
    .limit(1);

  if (!grid) {
    return NextResponse.json({ error: "Grille introuvable" }, { status: 404 });
  }

  if (grid.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // A grid used inside a book can't be deleted on its own; remove the book first.
  const [inBook] = await db
    .select({ id: bookPages.id })
    .from(bookPages)
    .where(eq(bookPages.crosswordId, grid.id))
    .limit(1);

  if (inBook) {
    return NextResponse.json(
      { error: "Cette grille fait partie d'un livre." },
      { status: 409 }
    );
  }

  await db.delete(placedWords).where(eq(placedWords.crosswordId, grid.id));
  await db.delete(crosswords).where(eq(crosswords.id, grid.id));

  return NextResponse.json({ success: true });
}
