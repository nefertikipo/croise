import { getFrenchWordList, getFrenchClueDb } from "@/lib/crossword/load-french-clues";
import { generateFlecheVector } from "@/lib/crossword/fleche-vector-gen";
import { validateGrid } from "@/lib/crossword/fleche-math";

console.log("Loading dictionary...");
const wordList = getFrenchWordList();
const clueDb = getFrenchClueDb();

const RUNS = 10;

console.log(`\n=== Stress test: ${RUNS} runs of 11x17, no custom words ===`);
const stats11x17: ReturnType<typeof analyzeResult>[] = [];
for (let i = 0; i < RUNS; i++) {
  const r = generateFlecheVector({ width: 11, height: 17 }, wordList, clueDb);
  stats11x17.push(analyzeResult(r));
}
printStats("11x17 no custom", stats11x17);

console.log(`\n=== Stress test: ${RUNS} runs of 11x17, with custom words ===`);
const stats11x17custom: ReturnType<typeof analyzeResult>[] = [];
for (let i = 0; i < RUNS; i++) {
  const r = generateFlecheVector(
    {
      width: 11,
      height: 17,
      customClues: [
        { answer: "SOLEIL", clue: "Astre du jour" },
        { answer: "AMOUR", clue: "Sentiment fort" },
        { answer: "PARIS", clue: "Ville lumiere" },
      ],
    },
    wordList,
    clueDb,
  );
  stats11x17custom.push(analyzeResult(r));
}
printStats("11x17 with custom", stats11x17custom);

console.log(`\n=== Stress test: ${RUNS} runs of 9x13 ===`);
const stats9x13: ReturnType<typeof analyzeResult>[] = [];
for (let i = 0; i < RUNS; i++) {
  const r = generateFlecheVector({ width: 9, height: 13 }, wordList, clueDb);
  stats9x13.push(analyzeResult(r));
}
printStats("9x13", stats9x13);

// Print one detailed example
console.log("\n=== Detailed example: 11x17 ===");
const example = generateFlecheVector({ width: 11, height: 17 }, wordList, clueDb);
printResult(example);

function analyzeResult(result: ReturnType<typeof generateFlecheVector>) {
  const { grid, words, success, attempts } = result;

  // Unfilled white cells
  let unfilledCount = 0;
  let totalWhite = 0;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      if (cell.kind === "white") {
        totalWhite++;
        if (!cell.letter) unfilledCount++;
      }
    }
  }

  // Word quality
  let withRealClue = 0;
  let withQuestionMark = 0;
  let twoLetterWords = 0;
  let longWords = 0; // 7+
  const wordLengths: number[] = [];

  for (const w of words) {
    wordLengths.push(w.word.length);
    if (w.clueText === "?") withQuestionMark++;
    else withRealClue++;
    if (w.word.length <= 2) twoLetterWords++;
    if (w.word.length >= 7) longWords++;
  }

  // Validate structural constraints
  const validation = validateGrid(grid);

  // Custom word placement
  const customPlaced = words.filter((w) => w.isCustom).length;

  const avgLen = wordLengths.length > 0
    ? wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length
    : 0;

  return {
    success,
    attempts,
    totalWords: words.length,
    totalWhite,
    unfilledCount,
    withRealClue,
    withQuestionMark,
    clueRate: words.length > 0 ? withRealClue / words.length : 0,
    twoLetterWords,
    longWords,
    avgLen,
    minLen: Math.min(...wordLengths),
    maxLen: Math.max(...wordLengths),
    valid: validation.valid,
    violations: validation.violations.length,
    customPlaced,
  };
}

function printStats(label: string, stats: ReturnType<typeof analyzeResult>[]) {
  const successRate = stats.filter((s) => s.success).length / stats.length;
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  console.log(`  Success rate: ${(successRate * 100).toFixed(0)}%`);
  console.log(`  Avg attempts: ${avg(stats.map((s) => s.attempts)).toFixed(1)}`);
  console.log(`  Avg words: ${avg(stats.map((s) => s.totalWords)).toFixed(1)}`);
  console.log(`  Avg word length: ${avg(stats.map((s) => s.avgLen)).toFixed(1)}`);
  console.log(`  Avg clue rate (has real clue): ${(avg(stats.map((s) => s.clueRate)) * 100).toFixed(1)}%`);
  console.log(`  Avg "?" clues: ${avg(stats.map((s) => s.withQuestionMark)).toFixed(1)}`);
  console.log(`  Avg 2-letter words: ${avg(stats.map((s) => s.twoLetterWords)).toFixed(1)}`);
  console.log(`  Avg 7+ letter words: ${avg(stats.map((s) => s.longWords)).toFixed(1)}`);
  console.log(`  Max word length seen: ${Math.max(...stats.map((s) => s.maxLen))}`);
  console.log(`  Avg unfilled cells: ${avg(stats.map((s) => s.unfilledCount)).toFixed(1)}`);
  console.log(`  All structurally valid: ${stats.every((s) => s.valid)}`);
  if (stats[0].customPlaced !== undefined) {
    console.log(`  Avg custom words placed: ${avg(stats.map((s) => s.customPlaced)).toFixed(1)}`);
  }
}

function printResult(result: ReturnType<typeof generateFlecheVector>) {
  console.log(`Success: ${result.success}`);
  console.log(`Attempts: ${result.attempts}`);
  console.log(`Slots: ${result.slots.length}`);
  console.log(`Words: ${result.words.length}`);

  if (!result.success) {
    console.log("FAILED to generate grid");
    return;
  }

  // Print grid
  const { grid } = result;
  console.log(`\nGrid ${grid.width}x${grid.height}:`);
  for (let y = 0; y < grid.height; y++) {
    let row = "";
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      if (cell.kind === "blue") {
        row += "# ";
      } else {
        row += (cell.letter || ".") + " ";
      }
    }
    console.log(row);
  }

  // Print words
  console.log("\nWords placed:");
  for (const w of result.words) {
    const custom = w.isCustom ? " [CUSTOM]" : "";
    console.log(
      `  ${w.word} (${w.slot.direction}, ${w.slot.length} letters) — "${w.clueText}"${custom}`,
    );
  }

  // Check for unfilled white cells
  let unfilled = 0;
  const unfilledCoords: string[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      if (cell.kind === "white" && !cell.letter) {
        unfilled++;
        unfilledCoords.push(`(${x},${y})`);
      }
    }
  }
  if (unfilled > 0) {
    console.log(`\n⚠ ${unfilled} unfilled white cells: ${unfilledCoords.join(", ")}`);
  } else {
    console.log(`\n✓ All white cells filled`);
  }
}
