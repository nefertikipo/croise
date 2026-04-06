import { describe, it, expect } from "vitest";
import {
  createSkeletonGrid,
  validateGrid,
  letterPosition,
  maxWordLength,
  wordPositions,
  isValidSeedPosition,
  isInteriorPlacementValid,
  coordKey,
  STRAIGHT_RIGHT,
  STRAIGHT_DOWN,
  OFFSET_RIGHT,
  OFFSET_DOWN,
} from "./fleche-math";

describe("fleche-math", () => {
  describe("letter position formula: P(i) = (xc + Δx + i·dx, yc + Δy + i·dy)", () => {
    it("straight right from (3,5)", () => {
      const p = letterPosition({ x: 3, y: 5 }, STRAIGHT_RIGHT, 0);
      expect(p).toEqual({ x: 4, y: 5 });
      const p2 = letterPosition({ x: 3, y: 5 }, STRAIGHT_RIGHT, 3);
      expect(p2).toEqual({ x: 7, y: 5 });
    });

    it("straight down from (3,5)", () => {
      const p = letterPosition({ x: 3, y: 5 }, STRAIGHT_DOWN, 0);
      expect(p).toEqual({ x: 3, y: 6 });
      const p2 = letterPosition({ x: 3, y: 5 }, STRAIGHT_DOWN, 4);
      expect(p2).toEqual({ x: 3, y: 10 });
    });

    it("offset right (bent arrow) from (2,0)", () => {
      // Target (1,1), flow (1,0) — starts at (3,1), flows right
      const p0 = letterPosition({ x: 2, y: 0 }, OFFSET_RIGHT, 0);
      expect(p0).toEqual({ x: 3, y: 1 });
      const p3 = letterPosition({ x: 2, y: 0 }, OFFSET_RIGHT, 3);
      expect(p3).toEqual({ x: 6, y: 1 });
    });

    it("offset down (bent arrow) from (2,0)", () => {
      // Target (1,1), flow (0,1) — starts at (3,1), flows down
      const p0 = letterPosition({ x: 2, y: 0 }, OFFSET_DOWN, 0);
      expect(p0).toEqual({ x: 3, y: 1 });
      const p3 = letterPosition({ x: 2, y: 0 }, OFFSET_DOWN, 3);
      expect(p3).toEqual({ x: 3, y: 4 });
    });
  });

  describe("wordPositions", () => {
    it("returns all letter coords for a 4-letter word going right", () => {
      const positions = wordPositions({ x: 0, y: 2 }, STRAIGHT_RIGHT, 4);
      expect(positions).toEqual([
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
      ]);
    });
  });

  describe("maxWordLength", () => {
    it("computes max length before hitting grid edge", () => {
      // From (8,0) straight down in 11x17 grid
      expect(maxWordLength({ x: 8, y: 0 }, STRAIGHT_DOWN, 11, 17)).toBe(16);
      // From (0,0) straight right in 11x17 grid
      expect(maxWordLength({ x: 0, y: 0 }, STRAIGHT_RIGHT, 11, 17)).toBe(10);
      // From (8,0) offset right: starts at (9,1), flows right — only 2 cells (9,10)
      expect(maxWordLength({ x: 8, y: 0 }, OFFSET_RIGHT, 11, 17)).toBe(2);
    });
  });

  describe("skeleton grid 11x17", () => {
    const grid = createSkeletonGrid(11, 17);

    it("has correct dimensions", () => {
      expect(grid.width).toBe(11);
      expect(grid.height).toBe(17);
      expect(grid.cells.length).toBe(17);
      expect(grid.cells[0].length).toBe(11);
    });

    it("potence at (0,0) is blue with 2 clues", () => {
      const cell = grid.cells[0][0];
      expect(cell.kind).toBe("blue");
      if (cell.kind === "blue") {
        expect(cell.clues.length).toBe(2);
        expect(cell.clues[0].placement).toEqual(STRAIGHT_RIGHT);
        expect(cell.clues[1].placement).toEqual(STRAIGHT_DOWN);
      }
    });

    it("top comb: blue at even x, white at odd x in row 0", () => {
      for (let x = 0; x < 11; x++) {
        const cell = grid.cells[0][x];
        if (x % 2 === 0) {
          expect(cell.kind).toBe("blue");
        } else {
          expect(cell.kind).toBe("white");
        }
      }
    });

    it("top comb blue cells have correct clue vectors", () => {
      // x=2: two clues (straight down + offset down)
      const cell2 = grid.cells[0][2];
      if (cell2.kind === "blue") {
        expect(cell2.clues.length).toBe(2);
        expect(cell2.clues[0].placement).toEqual(STRAIGHT_DOWN);
        expect(cell2.clues[1].placement).toEqual(OFFSET_DOWN);
      }
      // x=10 (last column, width-1=10 which is even): only 1 clue
      const cell10 = grid.cells[0][10];
      if (cell10.kind === "blue") {
        expect(cell10.clues.length).toBe(1);
        expect(cell10.clues[0].placement).toEqual(STRAIGHT_DOWN);
      }
    });

    it("left comb: blue at even y, white at odd y in col 0", () => {
      for (let y = 0; y < 17; y++) {
        const cell = grid.cells[y][0];
        if (y % 2 === 0) {
          expect(cell.kind).toBe("blue");
        } else {
          expect(cell.kind).toBe("white");
        }
      }
    });

    it("left comb blue cells have correct clue vectors", () => {
      // y=2: two clues (straight right + offset right)
      const cell2 = grid.cells[2][0];
      if (cell2.kind === "blue") {
        expect(cell2.clues.length).toBe(2);
        expect(cell2.clues[0].placement).toEqual(STRAIGHT_RIGHT);
        expect(cell2.clues[1].placement).toEqual(OFFSET_RIGHT);
      }
      // y=16 (last row, height-1=16 which is even): only 1 clue
      const cell16 = grid.cells[16][0];
      if (cell16.kind === "blue") {
        expect(cell16.clues.length).toBe(1);
        expect(cell16.clues[0].placement).toEqual(STRAIGHT_RIGHT);
      }
    });

    it("interior cells (x>0, y>0) are all white initially", () => {
      for (let y = 1; y < 17; y++) {
        for (let x = 1; x < 11; x++) {
          expect(grid.cells[y][x].kind).toBe("white");
        }
      }
    });

    it("passes validation with no violations", () => {
      const result = validateGrid(grid);
      expect(result.valid).toBe(true);
      expect(result.violations).toEqual([]);
    });
  });

  describe("interior non-adjacency constraint", () => {
    it("rejects adjacent interior blue boxes", () => {
      const existing = new Set(["5,5"]);
      expect(isInteriorPlacementValid({ x: 5, y: 6 }, existing)).toBe(false); // below
      expect(isInteriorPlacementValid({ x: 6, y: 5 }, existing)).toBe(false); // right
      expect(isInteriorPlacementValid({ x: 4, y: 5 }, existing)).toBe(false); // left
      expect(isInteriorPlacementValid({ x: 5, y: 4 }, existing)).toBe(false); // above
    });

    it("allows diagonal interior blue boxes (manhattan=2)", () => {
      const existing = new Set(["5,5"]);
      expect(isInteriorPlacementValid({ x: 6, y: 6 }, existing)).toBe(true);
      expect(isInteriorPlacementValid({ x: 4, y: 4 }, existing)).toBe(true);
    });

    it("comb cells are exempt from adjacency check", () => {
      const existing = new Set(["1,5"]);
      // (0,5) is on the left edge — exempt
      expect(isInteriorPlacementValid({ x: 0, y: 5 }, existing)).toBe(true);
    });
  });

  describe("seed position constraints (custom words)", () => {
    it("horizontal word cannot start in row 0", () => {
      expect(isValidSeedPosition({ x: 3, y: 0 }, { x: 1, y: 0 })).toBe(false);
    });

    it("horizontal word on left edge must be odd row", () => {
      expect(isValidSeedPosition({ x: 0, y: 2 }, { x: 1, y: 0 })).toBe(false); // even
      expect(isValidSeedPosition({ x: 0, y: 3 }, { x: 1, y: 0 })).toBe(true);  // odd
    });

    it("vertical word cannot start in col 0", () => {
      expect(isValidSeedPosition({ x: 0, y: 3 }, { x: 0, y: 1 })).toBe(false);
    });

    it("vertical word on top edge must be odd column", () => {
      expect(isValidSeedPosition({ x: 2, y: 0 }, { x: 0, y: 1 })).toBe(false); // even
      expect(isValidSeedPosition({ x: 3, y: 0 }, { x: 0, y: 1 })).toBe(true);  // odd
    });
  });
});
