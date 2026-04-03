declare module "crossword-layout-generator" {
  interface InputWord {
    answer: string;
    clue: string;
  }

  interface LayoutWord {
    answer: string;
    clue: string;
    orientation: "across" | "down" | "none";
    startx: number;
    starty: number;
    position: number;
  }

  interface Layout {
    table: (string | null)[][];
    rows: number;
    cols: number;
    result: LayoutWord[];
  }

  function generateLayout(words: InputWord[]): Layout;

  export default { generateLayout };
}
