/**
 * The "shuffled crossword grid" photo effect, shared by the on-screen preview
 * (components/shared/shuffled-image.tsx) and the print engine
 * (lib/book-pdf/compose-cover.ts) so screen and print match exactly.
 *
 * Slices a grid into cols x rows tiles and neighbour-swaps them slide-puzzle
 * style. Deterministic (seeded) so every render is identical.
 */

export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Neighbour-swap scramble: recognisable but visibly displaced. Returns a
 * permutation where perm[destination] = source tile index.
 */
export function scramble(cols: number, rows: number, intensity: number, seed: number): number[] {
  const n = cols * rows;
  const perm = Array.from({ length: n }, (_, i) => i);
  const rand = seeded(seed);
  for (let i = 0; i < n; i++) {
    if (rand() > intensity) continue;
    const r = Math.floor(i / cols);
    const c = i % cols;
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
