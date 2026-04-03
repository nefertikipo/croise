import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { generateWithFallback } from "@/lib/crossword/generator";
import { getSlotNumber } from "@/lib/crossword/generator";
import { WordList } from "@/lib/crossword/word-list";
import { DEFAULT_WORDS } from "@/lib/crossword/default-words";
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

    // Build word list: try DB first, fall back to built-in list
    let wordList: WordList;
    try {
      const frequencies = await getWordFrequencies(params.language as Language);
      if (frequencies.length > 1000) {
        wordList = buildWordListFromClues(frequencies);
      } else {
        throw new Error("Not enough words in DB");
      }
    } catch {
      wordList = new WordList();
      for (const word of DEFAULT_WORDS) {
        wordList.addWord(word, 50);
      }
    }

    // Generate the grid
    const result = generateWithFallback(
      params.size,
      wordList,
      params.customClues as CustomClue[]
    );

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to generate crossword. Try a smaller grid or fewer custom words." },
        { status: 422 }
      );
    }

    // Find clues from DB for non-custom words
    const nonCustomWords = result.placed
      .filter((p) => !p.isCustom)
      .map((p) => p.word);

    let clueMap = new Map<string, { clue: string; id: number }>();
    try {
      clueMap = await findCluesForAnswers(
        nonCustomWords,
        params.language as Language,
        params.difficulty as Difficulty
      );
    } catch {
      // DB not available; generate placeholder clues
    }

    // Assign clues to placed words
    const wordsWithClues = result.placed.map((p) => {
      if (p.isCustom && p.clue) {
        return { ...p, assignedClue: p.clue, clueId: null };
      }
      const dbClue = clueMap.get(p.word);
      return {
        ...p,
        assignedClue: dbClue?.clue ?? `Clue for ${p.word}`,
        clueId: dbClue?.id ?? null,
      };
    });

    // Personalize non-custom clues if theme or notes provided
    let personalizedClues: { answer: string; clue: string }[] | null = null;
    if (params.theme || params.personalizationNotes) {
      try {
        const toPersonalize = wordsWithClues
          .filter((w) => !w.isCustom)
          .map((w) => ({ answer: w.word, originalClue: w.assignedClue }));

        if (toPersonalize.length > 0) {
          personalizedClues = await personalizeClues(toPersonalize, {
            vibe: params.vibe as Vibe,
            difficulty: params.difficulty as Difficulty,
            language: params.language as Language,
            theme: params.theme,
            personalizationNotes: params.personalizationNotes,
          });
        }
      } catch {
        // Personalization failed; use original clues
      }
    }

    // Apply personalized clues
    if (personalizedClues) {
      const personalizedMap = new Map(
        personalizedClues.map((c) => [c.answer.toUpperCase(), c.clue])
      );
      for (const w of wordsWithClues) {
        if (!w.isCustom) {
          const personalized = personalizedMap.get(w.word);
          if (personalized) {
            w.assignedClue = personalized;
          }
        }
      }
    }

    // Save to database
    const code = generateCrosswordCode();
    const pattern = result.grid.join("");
    const solution = result.grid.join("");

    const [crossword] = await db
      .insert(crosswords)
      .values({
        code,
        title: params.theme ?? "My Crossword",
        language: params.language,
        width: params.size,
        height: params.size,
        gridPattern: pattern,
        gridSolution: solution,
        status: "ready",
        difficulty: params.difficulty,
        theme: params.theme,
        vibe: params.vibe,
        personalizationNotes: params.personalizationNotes,
      })
      .returning();

    // Save placed words
    const allSlots = result.placed.map((p) => p.slot);
    const wordRows = wordsWithClues.map((w) => ({
      crosswordId: crossword.id,
      answer: w.word,
      direction: w.slot.direction,
      number: getSlotNumber(w.slot, allSlots),
      startRow: w.slot.row,
      startCol: w.slot.col,
      length: w.slot.length,
      originalClueId: w.clueId,
      clueText: w.assignedClue,
      isCustom: w.isCustom,
    }));

    if (wordRows.length > 0) {
      await db.insert(placedWords).values(wordRows);
    }

    return NextResponse.json({
      code: crossword.code,
      id: crossword.id,
      grid: result.grid,
      words: wordsWithClues.map((w) => ({
        answer: w.word,
        clue: w.assignedClue,
        direction: w.slot.direction,
        number: getSlotNumber(w.slot, allSlots),
        startRow: w.slot.row,
        startCol: w.slot.col,
        length: w.slot.length,
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
