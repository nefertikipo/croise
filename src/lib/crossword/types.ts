export interface Slot {
  id: number;
  row: number;
  col: number;
  direction: "across" | "down";
  length: number;
  crossings: Crossing[];
}

export interface Crossing {
  slotId: number;
  thisPos: number;
  otherPos: number;
}

export interface PlacedEntry {
  slot: Slot;
  word: string;
  clue?: string;
  isCustom: boolean;
}

export interface WordEntry {
  word: string;
  score: number;
}

export interface GeneratorResult {
  success: boolean;
  grid: string[];
  placed: PlacedEntry[];
  error?: string;
}
