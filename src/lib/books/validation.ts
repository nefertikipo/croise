import { z } from "zod";
import { DEDICATION_FONTS } from "@/lib/books/dedication-fonts";

/**
 * Shared field validators for book payloads, used by both `POST /api/books`
 * and `PATCH /api/books/[code]` so the two routes can't drift apart. Every
 * field is bounded so a book row can't be inflated arbitrarily.
 */

export const bookTitleSchema = z.string().min(1).max(120);

export const bookDedicationSchema = z.string().max(2000);

export const bookDedicationSignatureSchema = z.string().max(200);

export const bookDedicationSignoffSchema = z.string().max(200);

export const bookDedicationFontSchema = z.enum(
  DEDICATION_FONTS.map((f) => f.key) as [string, ...string[]],
);

/** One clue-idea notepad entry (see `ClueIdea` in src/types/book.ts). */
export const clueIdeaSchema = z.object({
  id: z.string().min(1).max(64),
  answer: z.string().max(120),
  clue: z.string().max(500),
  category: z.string().max(80).optional(),
  author: z.string().max(80).optional(),
});

export const bookClueIdeasSchema = z.array(clueIdeaSchema).max(200);

/** Total clue-idea notepad cap (mirrors `bookClueIdeasSchema.max`). */
export const BOOK_CLUE_IDEAS_MAX = 200;

/**
 * One public contribution to a book's clue pool (the /participer/[code] form).
 * The answer is normalized + length-checked server-side; author is the
 * contributor's name, surfaced as `ClueIdea.author` and credited in the
 * dedication.
 */
export const bookContributionSchema = z.object({
  answer: z.string().min(1).max(120),
  clue: z.string().max(500),
  author: z.string().max(80).optional(),
});
