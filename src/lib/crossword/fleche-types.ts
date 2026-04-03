/**
 * Types for mots fléchés (arrow crossword) generation.
 *
 * In mots fléchés, each cell is one of:
 * - LETTER: contains a letter (part of an answer)
 * - CLUE: contains a definition + arrow direction (points to answer start)
 * - EMPTY: unused cell
 *
 * A clue cell can contain up to 2 definitions:
 * one pointing right (→) and one pointing down (↓).
 */

export type ArrowDirection = "right" | "down";

export interface ClueInCell {
  text: string;
  direction: ArrowDirection;
  answerLength: number;
  answer: string;
}

export interface FlecheCell {
  type: "letter" | "clue" | "empty";
  letter?: string;
  clues?: ClueInCell[]; // 1-2 clues per clue cell
}

export interface FlecheWord {
  answer: string;
  clue: string;
  direction: ArrowDirection;
  /** Row of the clue cell */
  clueRow: number;
  /** Col of the clue cell */
  clueCol: number;
  /** Row where the answer starts (cell after the clue cell) */
  startRow: number;
  /** Col where the answer starts */
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
