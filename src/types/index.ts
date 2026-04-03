export type Direction = "across" | "down";
export type Language = "en" | "fr";
export type GridSize = 5 | 11 | 13 | 15;
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type Vibe =
  | "classic"
  | "easy-monday"
  | "hard-saturday"
  | "millennial"
  | "pop-culture"
  | "literary";

export interface CustomClue {
  answer: string;
  clue: string;
}

export interface PlacedWord {
  answer: string;
  direction: Direction;
  number: number;
  startRow: number;
  startCol: number;
  length: number;
  clue: string;
  isCustom: boolean;
}

export interface CrosswordGrid {
  width: number;
  height: number;
  pattern: string;
  solution: string;
  words: PlacedWord[];
}

export interface GenerationParams {
  language: Language;
  width: number;
  height: number;
  difficulty: Difficulty;
  vibe: Vibe;
  customClues: CustomClue[];
  theme?: string;
  personalizationNotes?: string;
}
