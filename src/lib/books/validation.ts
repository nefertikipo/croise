import { z } from "zod";

/**
 * Shared field validators for book payloads, used by both `POST /api/books`
 * and `PATCH /api/books/[code]` so the two routes can't drift apart. Every
 * field is bounded so a book row can't be inflated arbitrarily.
 */

export const bookTitleSchema = z.string().min(1).max(120);

export const bookDedicationSchema = z.string().max(2000);

/** One clue-idea notepad entry (see `ClueIdea` in src/types/book.ts). */
export const clueIdeaSchema = z.object({
  id: z.string().min(1).max(64),
  answer: z.string().max(120),
  clue: z.string().max(500),
  category: z.string().max(80).optional(),
  author: z.string().max(80).optional(),
});

export const bookClueIdeasSchema = z.array(clueIdeaSchema).max(200);
