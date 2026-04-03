import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { generateWithFallback } from "@/lib/crossword/generator";
import { getWordList } from "@/lib/crossword/load-words";
import { findCluesForAnswers, getWordFrequencies } from "@/lib/clues/repository";
import { buildWordListFromClues } from "@/lib/crossword/word-list";
import { personalizeClues } from "@/lib/clues/personalizer";
import { generateCrosswordCode } from "@/lib/code";
import type { Language, Difficulty, Vibe, CustomClue } from "@/types";

export const maxDuration = 60;

const requestSchema = z.object({
  language: z.enum(["en", "fr"]).default("en"),
  size: z.number().refine((n) => [5, 11, 13, 15].includes(n)),
  difficulty: z.number().min(1).max(5).default(3),
  vibe: z
    .enum(["classic", "easy-monday", "hard-saturday", "millennial", "pop-culture", "literary"])
    .default("classic"),
  customClues: z
    .array(z.object({ answer: z.string(), clue: z.string() }))
    .default([]),
  theme: z.string().optional(),
  personalizationNotes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const params = requestSchema.parse(body);

    // Build word list: try DB first, fall back to file-based list
    let wordList;
    try {
      const frequencies = await getWordFrequencies(params.language as Language);
      if (frequencies.length > 1000) {
        wordList = buildWordListFromClues(frequencies);
      } else {
        throw new Error("Not enough words in DB");
      }
    } catch {
      wordList = getWordList();
    }

    // Generate the grid
    const result = generateWithFallback(
      params.size,
      wordList,
      params.customClues as CustomClue[]
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to generate crossword." },
        { status: 422 }
      );
    }

    // Find clues from DB for non-custom words
    const nonCustomAnswers = result.words
      .filter((w) => !w.isCustom)
      .map((w) => w.answer);

    let clueMap = new Map<string, { clue: string; id: number }>();
    try {
      if (nonCustomAnswers.length > 0) {
        clueMap = await findCluesForAnswers(
          nonCustomAnswers,
          params.language as Language,
          params.difficulty as Difficulty
        );
      }
    } catch {
      // DB clues not available; keep placeholder clues
    }

    // Assign DB clues where available
    const wordsWithClues = result.words.map((w) => {
      if (w.isCustom) {
        return { ...w, clueId: null as number | null };
      }
      const dbClue = clueMap.get(w.answer);
      return {
        ...w,
        clue: dbClue?.clue ?? w.clue,
        clueId: dbClue?.id ?? null,
      };
    });

    // Personalize non-custom clues if theme or notes provided
    if (params.theme || params.personalizationNotes) {
      try {
        const toPersonalize = wordsWithClues
          .filter((w) => !w.isCustom)
          .map((w) => ({ answer: w.answer, originalClue: w.clue }));

        if (toPersonalize.length > 0) {
          const personalized = await personalizeClues(toPersonalize, {
            vibe: params.vibe as Vibe,
            difficulty: params.difficulty as Difficulty,
            language: params.language as Language,
            theme: params.theme,
            personalizationNotes: params.personalizationNotes,
          });

          const personalizedMap = new Map(
            personalized.map((c) => [c.answer.toUpperCase(), c.clue])
          );
          for (const w of wordsWithClues) {
            if (!w.isCustom) {
              const pc = personalizedMap.get(w.answer);
              if (pc) w.clue = pc;
            }
          }
        }
      } catch {
        // Personalization failed; keep original clues
      }
    }

    // Save to database
    const code = generateCrosswordCode();
    const gridFlat = result.grid.join("");

    const [crossword] = await db
      .insert(crosswords)
      .values({
        code,
        title: params.theme ?? "My Crossword",
        language: params.language,
        width: result.width,
        height: result.height,
        gridPattern: gridFlat,
        gridSolution: gridFlat,
        status: "ready",
        difficulty: params.difficulty,
        theme: params.theme,
        vibe: params.vibe,
        personalizationNotes: params.personalizationNotes,
      })
      .returning();

    // Save placed words
    const wordRows = wordsWithClues.map((w) => ({
      crosswordId: crossword.id,
      answer: w.answer,
      direction: w.direction,
      number: w.number,
      startRow: w.startRow,
      startCol: w.startCol,
      length: w.length,
      originalClueId: w.clueId,
      clueText: w.clue,
      isCustom: w.isCustom,
    }));

    if (wordRows.length > 0) {
      await db.insert(placedWords).values(wordRows);
    }

    return NextResponse.json({
      code: crossword.code,
      id: crossword.id,
      grid: result.grid,
      width: result.width,
      height: result.height,
      words: wordsWithClues.map((w) => ({
        answer: w.answer,
        clue: w.clue,
        direction: w.direction,
        number: w.number,
        startRow: w.startRow,
        startCol: w.startCol,
        length: w.length,
        isCustom: w.isCustom,
      })),
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate crossword" },
      { status: 500 }
    );
  }
}
