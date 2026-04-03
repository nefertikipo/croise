import { NextResponse } from "next/server";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq } from "drizzle-orm";

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
