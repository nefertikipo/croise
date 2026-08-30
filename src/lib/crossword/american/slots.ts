// =============================================================================
// american/slots.ts — numbering + slot / crossing extraction from a block grid
// =============================================================================
// Given a validated block pattern, this computes:
//   - standard crossword cell numbers (sequential, on word-start cells)
//   - the Across and Down slots (each a run of >= 3 white cells)
//   - the crossings between them (every white cell is one across × one down)
// All grid-model, no dictionary — the solver consumes the output.
// =============================================================================

import type { AmSlot, AmCrossing } from "./types";

export interface GridStructure {
  width: number;
  height: number;
  /** Clue number per cell, or null (block or non-word-start). Row-major [y][x]. */
  numbers: (number | null)[][];
  slots: AmSlot[];
  crossings: AmCrossing[];
}

/**
 * Compute numbering, slots and crossings for a block pattern.
 * `blocks[y][x]` = true means a black square.
 */
export function analyzeGrid(blocks: boolean[][]): GridStructure {
  const height = blocks.length;
  const width = blocks[0]?.length ?? 0;
  const white = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && !blocks[y][x];

  const startsAcross = (x: number, y: number) =>
    white(x, y) && !white(x - 1, y) && white(x + 1, y);
  const startsDown = (x: number, y: number) =>
    white(x, y) && !white(x, y - 1) && white(x, y + 1);

  // --- Numbering: row-major, a number on any across-start or down-start cell.
  const numbers: (number | null)[][] = Array.from({ length: height }, () =>
    Array<number | null>(width).fill(null),
  );
  let n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (startsAcross(x, y) || startsDown(x, y)) {
        n++;
        numbers[y][x] = n;
      }
    }
  }

  // --- Slots.
  const slots: AmSlot[] = [];
  let slotId = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (startsAcross(x, y)) {
        const cells: { x: number; y: number }[] = [];
        for (let cx = x; white(cx, y); cx++) cells.push({ x: cx, y });
        slots.push({
          id: slotId++,
          number: numbers[y][x]!,
          direction: "across",
          cells,
          length: cells.length,
        });
      }
      if (startsDown(x, y)) {
        const cells: { x: number; y: number }[] = [];
        for (let cy = y; white(x, cy); cy++) cells.push({ x, y: cy });
        slots.push({
          id: slotId++,
          number: numbers[y][x]!,
          direction: "down",
          cells,
          length: cells.length,
        });
      }
    }
  }

  // --- Crossings. Index each cell → (acrossSlot, pos) and (downSlot, pos);
  // every white cell yields exactly one across×down crossing.
  const acrossAt = new Map<string, { slot: number; pos: number }>();
  const downAt = new Map<string, { slot: number; pos: number }>();
  for (const slot of slots) {
    const table = slot.direction === "across" ? acrossAt : downAt;
    slot.cells.forEach((c, pos) => table.set(`${c.x},${c.y}`, { slot: slot.id, pos }));
  }
  const crossings: AmCrossing[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!white(x, y)) continue;
      const a = acrossAt.get(`${x},${y}`);
      const d = downAt.get(`${x},${y}`);
      if (a && d) crossings.push({ a: a.slot, b: d.slot, ai: a.pos, bi: d.pos });
    }
  }

  return { width, height, numbers, slots, crossings };
}
