/**
 * Decorative crossword grid background.
 * Thin red/blue lines forming a grid, with handwritten letters in cells.
 */

const WORDS = [
  "FLECHES", "INDICE", "GRILLE", "CADEAU",
  "LETTRE", "JEU", "LIVRE", "ENIGME",
  "SOLEIL", "AMOUR", "SECRET", "MOT",
  "PARIS", "REVE", "PLUME", "JOIE",
];

const CELL = 56;

export function GridBackground({ children }: { children?: React.ReactNode }) {
  // Deterministic pseudo-random
  let seed = 42;
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  }

  const letters: {
    char: string;
    row: number;
    col: number;
    color: "red" | "blue";
  }[] = [];

  for (const word of WORDS) {
    const row = Math.floor(rand() * 20);
    const col = Math.floor(rand() * 18);
    const vertical = rand() > 0.5;
    const color = rand() > 0.5 ? ("red" as const) : ("blue" as const);

    for (let i = 0; i < word.length; i++) {
      const r = vertical ? row + i : row;
      const c = vertical ? col : col + i;
      if (r < 24 && c < 22) {
        letters.push({
          char: word[i],
          row: r,
          col: c,
          color,
        });
      }
    }
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(220, 38, 38, 0.10) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(37, 99, 235, 0.10) 1px, transparent 1px)
          `,
          backgroundSize: `${CELL}px ${CELL}px`,
        }}
      />

      {/* Handwritten letters in cells */}
      <div className="absolute inset-0 pointer-events-none">
        {letters.map((l, i) => (
          <div
            key={i}
            className="absolute select-none uppercase text-center"
            style={{
              top: l.row * CELL,
              left: l.col * CELL,
              width: CELL,
              height: CELL,
              lineHeight: `${CELL}px`,
              fontSize: "32px",
              fontFamily: "var(--font-handwritten)",
              color:
                l.color === "red"
                  ? "rgba(220, 38, 38, 0.10)"
                  : "rgba(37, 99, 235, 0.10)",
            }}
          >
            {l.char}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
