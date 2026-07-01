import { cn } from "@/lib/utils";

/**
 * Editorial "magazine cover" crossword grid — big letters living inside cells,
 * scattered black squares, corner numbers, and hand-inked answers.
 * Purely decorative. Inspired by the "Which?" 1971 cover + Martin Parr beach crosswords.
 */

type LetterColor = "red" | "ink" | "turquoise" | "pink";

type PCell =
  | { k: "black" }
  | { k: "empty"; n?: number }
  | { k: "letter"; ch: string; color: LetterColor; hand?: boolean; n?: number };

const B: PCell = { k: "black" };
const E = (n?: number): PCell => ({ k: "empty", n });
const L = (
  ch: string,
  color: LetterColor = "ink",
  opts: { hand?: boolean; n?: number } = {},
): PCell => ({ k: "letter", ch, color, ...opts });

// FLÈCHES across (red), CADEAU down (ink), MOTS + JEU hand-inked
const GRID: PCell[][] = [
  [B, E(1), B, L("M", "turquoise", { hand: true }), L("O", "turquoise", { hand: true }), L("T", "turquoise", { hand: true }), L("S", "turquoise", { hand: true }), B],
  [E(), E(), E(), E(), E(), B, E(), E(2)],
  [L("F", "red"), L("L", "red"), L("E", "red"), L("C", "red", { n: 3 }), L("H", "red"), L("E", "red"), L("S", "red"), B],
  [E(), B, E(), L("A", "ink"), E(), E(), B, E()],
  [L("J", "pink", { hand: true }), L("E", "pink", { hand: true }), L("U", "pink", { hand: true }), L("D", "ink"), E(), E(4), E(), E()],
  [E(), E(), B, L("E", "ink"), B, E(), E(), E()],
  [E(5), E(), E(), L("A", "ink"), E(), E(), B, E()],
  [E(), B, E(), L("U", "ink"), E(), E(), E(), B],
];

const COLOR: Record<string, string> = {
  red: "text-brand",
  ink: "text-ink",
  turquoise: "text-turquoise",
  pink: "text-pink",
};

export function PosterGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-8 border-2 border-ink bg-paper shadow-[6px_6px_0_0] shadow-ink/80",
        className,
      )}
    >
      {GRID.flatMap((row, r) =>
        row.map((cell, c) => {
          const base =
            "relative aspect-square border border-ink/70 flex items-center justify-center select-none";
          if (cell.k === "black") {
            return <div key={`${r}-${c}`} className={cn(base, "bg-ink")} />;
          }
          if (cell.k === "empty") {
            return (
              <div key={`${r}-${c}`} className={cn(base, "bg-paper")}>
                {cell.n && (
                  <span className="absolute top-0.5 left-1 text-[9px] sm:text-[11px] font-bold text-ink/60">
                    {cell.n}
                  </span>
                )}
              </div>
            );
          }
          return (
            <div key={`${r}-${c}`} className={cn(base, "bg-paper")}>
              {cell.n && (
                <span className="absolute top-0.5 left-1 text-[9px] sm:text-[11px] font-bold text-ink/60 z-10">
                  {cell.n}
                </span>
              )}
              <span
                className={cn(
                  "leading-none",
                  COLOR[cell.color ?? "ink"],
                  cell.hand
                    ? "text-2xl sm:text-4xl -rotate-6"
                    : "font-display text-2xl sm:text-4xl",
                )}
                style={
                  cell.hand
                    ? { fontFamily: "var(--font-handwritten)" }
                    : undefined
                }
              >
                {cell.ch}
              </span>
            </div>
          );
        }),
      )}
    </div>
  );
}
