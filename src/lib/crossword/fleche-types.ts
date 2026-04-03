export type ArrowDirection = "right" | "down";

export interface ClueInCell {
  text: string;
  direction: ArrowDirection;
  /** Row where the answer starts */
  answerRow: number;
  /** Col where the answer starts */
  answerCol: number;
  answerLength: number;
  answer: string;
}

export interface FlecheCell {
  type: "letter" | "clue" | "empty";
  letter?: string;
  /** 0-2 clues per cell. Can be:
   * - Single: one → or one ↓
   * - Dual cross: one → and one ↓
   * - Dual same: two → (top for this row, bottom for next row)
   *              or two ↓ (top for this col, bottom for next col)
   */
  clues?: ClueInCell[];
}

export interface FlecheWord {
  answer: string;
  clue: string;
  direction: ArrowDirection;
  clueRow: number;
  clueCol: number;
  startRow: number;
  startCol: number;
  length: number;
  isCustom: boolean;
}

export interface FlecheGrid {
  width: number;
  height: number;
  cells: FlecheCell[][];
  words: FlecheWord[];
}

export interface FlecheGenerationParams {
  width: number;
  height: number;
  customClues?: { answer: string; clue: string }[];
}
