import { NextResponse } from "next/server";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const [grid] = await db
      .select()
      .from(crosswords)
      .where(eq(crosswords.code, code))
      .limit(1);

    if (!grid) {
      return NextResponse.json({ error: "Grid not found" }, { status: 404 });
    }

    const words = await db
      .select()
      .from(placedWords)
      .where(eq(placedWords.crosswordId, grid.id));

    // Reconstruct cells from pattern + solution
    const cells = [];
    for (let y = 0; y < grid.height; y++) {
      const row = [];
      for (let x = 0; x < grid.width; x++) {
        const idx = y * grid.width + x;
        const isBlue = grid.gridPattern[idx] === "#";
        if (isBlue) {
          // Find words that start from adjacent positions
          const clueData = words
            .filter((w) => {
              // This blue cell is the clue source if the word starts right next to it
              if (w.direction === "right" && w.startRow === y && w.startCol === x + 1) return true;
              if (w.direction === "down" && w.startCol === x && w.startRow === y + 1) return true;
              // Offset patterns
              if (w.direction === "right" && w.startRow === y + 1 && w.startCol === x + 1) return true;
              if (w.direction === "down" && w.startRow === y + 1 && w.startCol === x + 1) return true;
              // Comb offsets
              if (w.direction === "right" && w.startRow === y + 1 && w.startCol === x) return true;
              if (w.direction === "down" && w.startRow === y && w.startCol === x + 1) return true;
              return false;
            })
            .slice(0, 2)
            .map((w) => ({
              text: w.clueText,
              direction: w.direction as "right" | "down",
              answerRow: w.startRow,
              answerCol: w.startCol,
              answerLength: w.length,
              answer: w.answer,
              isCustom: w.isCustom,
            }));
          row.push({ type: "clue" as const, clues: clueData });
        } else {
          const letter = grid.gridSolution[idx];
          row.push({
            type: "letter" as const,
            letter: letter !== "#" ? letter : undefined,
          });
        }
      }
      cells.push(row);
    }

    return NextResponse.json({
      id: grid.id,
      code: grid.code,
      title: grid.title,
      width: grid.width,
      height: grid.height,
      cells,
      words: words.map((w) => ({
        answer: w.answer,
        clue: w.clueText,
        direction: w.direction,
        isCustom: w.isCustom,
        startRow: w.startRow,
        startCol: w.startCol,
        length: w.length,
      })),
    });
  } catch (error) {
    console.error("Grid fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch grid" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const body = await request.json();

    if (body.title !== undefined) {
      await db
        .update(crosswords)
        .set({ title: body.title })
        .where(eq(crosswords.code, code));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Grid update error:", error);
    return NextResponse.json({ error: "Failed to update grid" }, { status: 500 });
  }
}
