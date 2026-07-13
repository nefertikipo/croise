import { cn } from "@/lib/utils";
import { seeded, scramble } from "@/lib/design/shuffle-grid";

/**
 * Slices an image into a grid of tiles and "shuffles" them slide-puzzle style.
 * `intensity` controls how scrambled it gets (0 = intact, 1 = fully shuffled).
 * Deterministic (seeded) so SSR and client render identically. Shares its
 * scramble logic with the print engine (see lib/design/shuffle-grid.ts).
 *
 * Preview for the future book/photo feature — see memory: shuffled-photo-book-idea.
 */

export function ShuffledImage({
  src,
  cols = 6,
  rows = 5,
  intensity = 0.35,
  seed = 7,
  gap = 1.5,
  jitter = true,
  square = true,
  background,
  className,
}: {
  src: string;
  cols?: number;
  rows?: number;
  intensity?: number;
  seed?: number;
  gap?: number;
  /** Tiny per-tile vertical offset for a hand-shuffled feel. Off for clean grids. */
  jitter?: boolean;
  /** Force square tiles (self-sizing). Off = tiles fill their grid cell, so the
   * gaps show in both directions when the container has a fixed height. */
  square?: boolean;
  /** Colour shown in the gaps between tiles (defaults to paper cream). */
  background?: string;
  className?: string;
}) {
  const perm = scramble(cols, rows, intensity, seed);
  const rand = seeded(seed * 31 + 1);

  return (
    <div
      className={cn("grid bg-paper", className)}
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap,
        backgroundColor: background,
      }}
    >
      {perm.map((source, pos) => {
        const sr = Math.floor(source / cols);
        const sc = source % cols;
        // tiny extra offset for the hand-shuffled feel (site only)
        const offset = jitter ? (rand() - 0.5) * intensity * 5 : 0;
        return (
          <div
            key={pos}
            className="relative overflow-hidden bg-cover"
            style={{
              ...(square ? { aspectRatio: "1 / 1" } : null),
              backgroundImage: `url(${src})`,
              backgroundSize: `${cols * 100}% ${rows * 100}%`,
              backgroundPosition: `${(sc / (cols - 1)) * 100}% ${(sr / (rows - 1)) * 100}%`,
              transform: `translateY(${offset.toFixed(2)}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
