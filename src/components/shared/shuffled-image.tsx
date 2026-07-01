import { cn } from "@/lib/utils";

/**
 * Slices an image into a grid of tiles and "shuffles" them slide-puzzle style.
 * `intensity` controls how scrambled it gets (0 = intact, 1 = fully shuffled).
 * Deterministic (seeded) so SSR and client render identically.
 *
 * Preview for the future book/photo feature — see memory: shuffled-photo-book-idea.
 */

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Neighbour-swap scramble: recognisable but visibly displaced. */
function scramble(cols: number, rows: number, intensity: number, seed: number) {
  const n = cols * rows;
  const perm = Array.from({ length: n }, (_, i) => i);
  const rand = seeded(seed);
  for (let i = 0; i < n; i++) {
    if (rand() > intensity) continue;
    const r = Math.floor(i / cols);
    const c = i % cols;
    // pick a neighbour (right/left/down/up) and swap
    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    const [dr, dc] = dirs[Math.floor(rand() * 4)];
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    const j = nr * cols + nc;
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
}

export function ShuffledImage({
  src,
  cols = 6,
  rows = 5,
  intensity = 0.35,
  seed = 7,
  gap = 1.5,
  className,
}: {
  src: string;
  cols?: number;
  rows?: number;
  intensity?: number;
  seed?: number;
  gap?: number;
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
      }}
    >
      {perm.map((source, pos) => {
        const sr = Math.floor(source / cols);
        const sc = source % cols;
        // tiny extra jitter for the hand-shuffled feel
        const jitter = (rand() - 0.5) * intensity * 5;
        return (
          <div
            key={pos}
            className="relative overflow-hidden bg-cover"
            style={{
              aspectRatio: "1 / 1",
              backgroundImage: `url(${src})`,
              backgroundSize: `${cols * 100}% ${rows * 100}%`,
              backgroundPosition: `${(sc / (cols - 1)) * 100}% ${(sr / (rows - 1)) * 100}%`,
              transform: `translateY(${jitter.toFixed(2)}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
