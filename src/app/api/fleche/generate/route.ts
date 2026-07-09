import { NextResponse } from "next/server";
import { z } from "zod";
import { generateFlecheVector } from "@/lib/crossword/fleche-vector-gen";
import { getFrenchWordList, getFrenchClueDb, getFrenchClueDifficulty, ensureLoaded } from "@/lib/crossword/load-french-clues";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { generateCrosswordCode } from "@/lib/code";
import { checkCapacity } from "@/lib/crossword/check-capacity";
import { normalizeAnswer, answerBreaks } from "@/lib/crossword/normalize";
import type { Coord } from "@/lib/crossword/fleche-math";

export const maxDuration = 120;

const requestSchema = z.object({
  width: z.number().min(5).max(20).default(10),
  height: z.number().min(5).max(20).default(10),
  customClues: z
    .array(z.object({ answer: z.string(), clue: z.string() }))
    .default([]),
  excludeClues: z.array(z.string()).default([]),
  excludeAnswers: z.array(z.string()).default([]),
  hiddenWord: z.string().optional(),
  difficulty: z.enum(["facile", "moyen", "difficile", "balanced"]).optional(),
});

/**
 * Convert a CluePlacement flow vector to the old "right" | "down" direction.
 */
function flowToDirection(flow: Coord): "right" | "down" {
  return flow.x === 1 ? "right" : "down";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const params = requestSchema.parse(body);

    // Fast capacity guard: reject provably-impossible requests instantly instead
    // of spinning the full ~110s generation budget before failing.
    const capacityError = checkCapacity(
      params.width,
      params.height,
      params.customClues,
    );
    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 400 });
    }

    await ensureLoaded();
    const wordList = getFrenchWordList();
    const rawClueDb = getFrenchClueDb();
    const clueDifficulty = getFrenchClueDifficulty();

    // Filter out excluded clues and answers
    let clueDb = rawClueDb;
    const excludedClues = new Set(params.excludeClues);
    const excludedAnswers = new Set(params.excludeAnswers.map((a) => a.toUpperCase()));

    if (excludedClues.size > 0 || excludedAnswers.size > 0) {
      clueDb = new Map();
      for (const [word, clues] of rawClueDb) {
        if (excludedAnswers.has(word)) continue; // skip entire word
        const filtered = excludedClues.size > 0
          ? clues.filter((c) => !excludedClues.has(c))
          : clues;
        if (filtered.length > 0) {
          clueDb.set(word, filtered);
        }
      }
    }

    const result = generateFlecheVector(
      {
        width: params.width,
        height: params.height,
        customClues: params.customClues,
        hiddenWord: params.hiddenWord,
        difficulty: params.difficulty,
      },
      wordList,
      clueDb,
      clueDifficulty,
    );

    if (!result.success) {
      const customWords = (params.customClues ?? [])
        .map((c) => normalizeAnswer(c.answer))
        .filter((a) => a.length >= 2);

      // Find which words are hardest (all consonants, very long, etc.)
      const hard = customWords.filter((w) => {
        const vowels = [...w].filter((c) => "AEIOUY".includes(c)).length;
        return vowels === 0 || w.length >= 10;
      });
      const hint = hard.length > 0
        ? `Les mots ${hard.join(", ")} sont tres difficiles a placer (peu de voyelles ou tres long). Essayez de les retirer ou modifier.`
        : customWords.length > 3
          ? "Essayez avec moins de mots personnalises ou des mots plus courts."
          : "Essayez de regenerer.";
      return NextResponse.json(
        { error: `Impossible de generer la grille. ${hint}` },
        { status: 500 },
      );
    }

    // Convert vector grid to the old format expected by the frontend
    const { grid, words } = result;
    const cells: {
      type: "letter" | "clue" | "empty";
      letter?: string;
      /** Right/bottom edge is a multi-word break → render dotted. */
      breakRight?: boolean;
      breakBottom?: boolean;
      clues?: {
        text: string;
        direction: "right" | "down";
        answerRow: number;
        answerCol: number;
        answerLength: number;
        answer: string;
        isCustom?: boolean;
      }[];
    }[][] = [];

    // Map each custom answer (folded) to its word-break offsets so the placed
    // word can render dotted borders where one word ends and the next begins.
    const breaksByAnswer = new Map<string, number[]>();
    for (const c of params.customClues ?? []) {
      const breaks = answerBreaks(c.answer);
      if (breaks.length > 0) breaksByAnswer.set(normalizeAnswer(c.answer), breaks);
    }

    for (let y = 0; y < grid.height; y++) {
      const row: (typeof cells)[0] = [];
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.cells[y][x];
        if (cell.kind === "blue") {
          // Only include clues that actually have a word assigned
          const customAnswers = new Set(
            (params.customClues ?? []).map((c) => normalizeAnswer(c.answer)),
          );
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
          row.push({
            type: "letter",
            letter: cell.letter || undefined,
          });
        }
      }
      cells.push(row);
    }

    // Mark word breaks: for each placed custom answer with breaks, walk its
    // letter cells and flag the trailing edge of the last cell of each word.
    if (breaksByAnswer.size > 0) {
      for (const row of cells) {
        for (const cell of row) {
          if (cell.type !== "clue") continue;
          for (const clue of cell.clues ?? []) {
            const breaks = clue.isCustom ? breaksByAnswer.get(clue.answer) : undefined;
            if (!breaks) continue;
            for (const p of breaks) {
              if (p < 1 || p >= clue.answerLength) continue;
              const k = p - 1; // last cell of the finished word
              const rr = clue.answerRow + (clue.direction === "down" ? k : 0);
              const cc = clue.answerCol + (clue.direction === "right" ? k : 0);
              const target = cells[rr]?.[cc];
              if (target?.type !== "letter") continue;
              if (clue.direction === "right") target.breakRight = true;
              else target.breakBottom = true;
            }
          }
        }
      }
    }

    const wordList2 = words.map((w) => ({
      answer: w.word,
      clue: w.clueText,
      direction: w.slot.direction === "horizontal" ? "right" : "down",
      isCustom: w.isCustom,
    }));

    // Auto-save to DB
    let gridCode: string | undefined;
    let gridId: string | undefined;
    try {
      let pattern = "";
      let solution = "";
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const cell = grid.cells[y][x];
          pattern += cell.kind === "blue" ? "#" : ".";
          solution += cell.kind === "white" && cell.letter ? cell.letter : "#";
        }
      }

      gridCode = generateCrosswordCode();
      const [saved] = await db
        .insert(crosswords)
        .values({
          code: gridCode,
          language: "fr",
          width: grid.width,
          height: grid.height,
          gridPattern: pattern,
          gridSolution: solution,
          hiddenWord: params.hiddenWord?.trim() || null,
          status: "ready",
        })
        .returning({ id: crosswords.id });
      gridId = saved.id;

      const wordRows = words.map((w, i) => ({
        crosswordId: saved.id,
        answer: w.word,
        direction: w.slot.direction === "horizontal" ? "right" : "down",
        number: i + 1,
        startRow: w.slot.cells[0].y,
        startCol: w.slot.cells[0].x,
        length: w.slot.length,
        clueText: w.clueText,
        isCustom: w.isCustom,
      }));
      if (wordRows.length > 0) {
        await db.insert(placedWords).values(wordRows);
      }
    } catch (saveErr) {
      console.error("Failed to save grid:", saveErr);
    }

    return NextResponse.json({
      id: gridId,
      code: gridCode,
      width: grid.width,
      height: grid.height,
      hiddenWord: params.hiddenWord?.trim() || undefined,
      hiddenWordSatisfied: result.hiddenWordSatisfied,
      cells,
      words: wordList2,
    });
  } catch (error) {
    console.error("Fléchés generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate mots fléchés" },
      { status: 500 },
    );
  }
}
