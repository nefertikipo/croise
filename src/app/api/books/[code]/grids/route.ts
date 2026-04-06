import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { books, bookCrosswords } from "@/db/schema/books";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq, asc } from "drizzle-orm";
import { generateFlecheVector } from "@/lib/crossword/fleche-vector-gen";
import { getFrenchWordList, getFrenchClueDb, ensureLoaded } from "@/lib/crossword/load-french-clues";
import { generateCrosswordCode } from "@/lib/code";
import type { Coord } from "@/lib/crossword/fleche-math";

export const maxDuration = 60;

const requestSchema = z.object({
  width: z.number().min(8).max(20).default(11),
  height: z.number().min(8).max(20).default(17),
  customClues: z
    .array(z.object({ answer: z.string(), clue: z.string() }))
    .default([]),
});

function flowToDirection(flow: Coord): "right" | "down" {
  return flow.x === 1 ? "right" : "down";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const gridParams = requestSchema.parse(body);

    // Find the book
    const [book] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.code, code))
      .limit(1);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Get existing grids to collect used clues
    const existingLinks = await db
      .select({ crosswordId: bookCrosswords.crosswordId, position: bookCrosswords.position })
      .from(bookCrosswords)
      .where(eq(bookCrosswords.bookId, book.id));

    const usedClues = new Set<string>();
    for (const link of existingLinks) {
      const words = await db
        .select({ clueText: placedWords.clueText })
        .from(placedWords)
        .where(eq(placedWords.crosswordId, link.crosswordId));
      for (const w of words) {
        usedClues.add(w.clueText);
      }
    }

    // Load clue data (from DB in production, files in dev)
    await ensureLoaded();
    const wordList = getFrenchWordList();
    const rawClueDb = getFrenchClueDb();

    let clueDb = rawClueDb;
    if (usedClues.size > 0) {
      clueDb = new Map();
      for (const [word, clues] of rawClueDb) {
        const filtered = clues.filter((c) => !usedClues.has(c));
        if (filtered.length > 0) {
          clueDb.set(word, filtered);
        }
      }
    }

    // Generate the grid
    const result = generateFlecheVector(
      {
        width: gridParams.width,
        height: gridParams.height,
        customClues: gridParams.customClues,
      },
      wordList,
      clueDb,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to generate grid after max attempts" },
        { status: 500 },
      );
    }

    // Convert grid to storage format
    const { grid, words } = result;
    let pattern = "";
    let solution = "";
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.cells[y][x];
        pattern += cell.kind === "blue" ? "#" : ".";
        solution += cell.kind === "white" && cell.letter ? cell.letter : "#";
      }
    }

    // Save crossword to DB
    const gridCode = generateCrosswordCode();
    const [savedGrid] = await db
      .insert(crosswords)
      .values({
        code: gridCode,
        title: `Grille ${existingLinks.length + 1}`,
        language: "fr",
        width: grid.width,
        height: grid.height,
        gridPattern: pattern,
        gridSolution: solution,
        status: "ready",
      })
      .returning({ id: crosswords.id });

    // Save placed words
    const customAnswers = new Set(
      (gridParams.customClues ?? []).map((c) =>
        c.answer.toUpperCase().replace(/[^A-Z]/g, ""),
      ),
    );

    const wordRows = words.map((w, i) => ({
      crosswordId: savedGrid.id,
      answer: w.word,
      direction: w.slot.direction === "horizontal" ? "right" : "down",
      number: i + 1,
      startRow: w.slot.cells[0].y,
      startCol: w.slot.cells[0].x,
      length: w.slot.length,
      clueText: w.clueText,
      isCustom: customAnswers.has(w.word),
    }));

    if (wordRows.length > 0) {
      await db.insert(placedWords).values(wordRows);
    }

    // Link to book
    const nextPosition = existingLinks.length > 0
      ? Math.max(...existingLinks.map((l) => l.position)) + 1
      : 0;

    await db.insert(bookCrosswords).values({
      bookId: book.id,
      crosswordId: savedGrid.id,
      position: nextPosition,
    });

    // Return the grid in the format the frontend expects
    const cells = [];
    for (let y = 0; y < grid.height; y++) {
      const row = [];
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.cells[y][x];
        if (cell.kind === "blue") {
          const clueData = cell.clues
            .filter((clue) => clue.answer.length > 0)
            .map((clue) => {
              const firstLetterPos = {
                x: cell.coord.x + clue.placement.target.x,
                y: cell.coord.y + clue.placement.target.y,
              };
              return {
                text: clue.text || "?",
                direction: flowToDirection(clue.placement.flow),
                answerRow: firstLetterPos.y,
                answerCol: firstLetterPos.x,
                answerLength: clue.answer.length,
                answer: clue.answer,
                isCustom: customAnswers.has(clue.answer),
              };
            });
          row.push({ type: "clue", clues: clueData });
        } else {
          row.push({ type: "letter", letter: cell.letter || undefined });
        }
      }
      cells.push(row);
    }

    return NextResponse.json({
      id: savedGrid.id,
      code: gridCode,
      position: nextPosition,
      width: grid.width,
      height: grid.height,
      cells,
      words: words.map((w) => ({
        answer: w.word,
        clue: w.clueText,
        direction: w.slot.direction === "horizontal" ? "right" : "down",
        isCustom: customAnswers.has(w.word),
      })),
    });
  } catch (error) {
    console.error("Grid generation error:", error);
    return NextResponse.json({ error: "Failed to add grid" }, { status: 500 });
  }
}
