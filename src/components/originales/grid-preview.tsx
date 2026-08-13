/**
 * Tiny static thumbnail of a fléchés grid, rendered server-side from the stored
 * `gridPattern` string ("#" clue cell, "." letter cell, "*" photo). No letters,
 * no interactivity — just the recognizable mots-fléchés silhouette for a gallery
 * card. Clue cells take the clue-blue, letter cells the cream paper.
 */
export function GridPreview({
  width,
  height,
  pattern,
  className = "",
}: {
  width: number;
  height: number;
  pattern: string;
  className?: string;
}) {
  const cells = pattern.split("");
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${width}, 1fr)`,
        aspectRatio: `${width} / ${height}`,
        gap: "1px",
        background: "var(--ink)",
        border: "1px solid var(--ink)",
      }}
      aria-hidden
    >
      {cells.slice(0, width * height).map((c, i) => (
        <div
          key={i}
          style={{
            background:
              c === "#"
                ? "var(--blueprint)"
                : c === "*"
                  ? "var(--sun)"
                  : "var(--paper)",
          }}
        />
      ))}
    </div>
  );
}
