/**
 * Shared types for the postcard ("carte") flow: a single personalized mots
 * fléchés grid on a flat A6 card. Reuses the fléchés cell/word types from the
 * book so the on-screen grid component and the print engine render identically.
 */

import type { BookWord, FlecheCell } from "@/types/book";

/**
 * How a card reaches its recipient:
 * - "self": we print the front (title + grid) and leave the back blank (guide
 *   lines) for a handwritten note; the card ships to the buyer, who posts it.
 * - "direct": we print the typed message on the back and ship straight to the
 *   recipient.
 */
export type PostcardDelivery = "self" | "direct";

/** The grid printed on the front of a card, ready to render. Null until a grid
 * has been generated (a fresh draft has no crossword yet). */
export interface PostcardGrid {
  code: string;
  width: number;
  height: number;
  cells: FlecheCell[][];
  words: BookWord[];
}

/** Full postcard payload from `GET /api/postcards/[code]`. */
export interface PostcardData {
  id: string;
  code: string;
  title: string | null;
  recipientName: string | null;
  message: string | null;
  /** Maker's chosen message typeface (a DedicationFontKey); null = default. */
  messageFont: string | null;
  /** Accent colour for the grid's clue cells (hex); null = default blueprint. */
  gridColor: string | null;
  status: string;
  /** The front grid, or null while the card is still a blank draft. */
  grid: PostcardGrid | null;
}
