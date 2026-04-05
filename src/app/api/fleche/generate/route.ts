import { NextResponse } from "next/server";
import { z } from "zod";
import { generateFleche } from "@/lib/crossword/fleche-wordfirst";
import { getFrenchWordList, getFrenchClueDb } from "@/lib/crossword/load-french-clues";

export const maxDuration = 60;

const requestSchema = z.object({
  width: z.number().min(8).max(20).default(10),
  height: z.number().min(8).max(20).default(10),
  customClues: z
    .array(z.object({ answer: z.string(), clue: z.string() }))
    .default([]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const params = requestSchema.parse(body);

    const wordList = getFrenchWordList();
    const clueDb = getFrenchClueDb();

    const grid = generateFleche(
      {
        width: params.width,
        height: params.height,
        customClues: params.customClues,
      },
      wordList,
      clueDb
    );

    return NextResponse.json({
      width: grid.width,
      height: grid.height,
      cells: grid.cells,
      words: grid.words,
    });
  } catch (error) {
    console.error("Fléchés generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate mots fléchés" },
      { status: 500 }
    );
  }
}
