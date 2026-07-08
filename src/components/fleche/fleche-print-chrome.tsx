// Print-only decorations for a single fléché grid: a big "Les Flèches"
// wordmark + title at the top of the sheet, and a numbered answer strip for
// the mot caché at the bottom. These render only on print (`hidden print:*`),
// so they never touch the on-screen layout — the page keeps its own header and
// mot-caché UI for the screen.

const CELL = 70; // matches CELL_SIZE in fleche-grid.tsx

// A4 printable area at 96dpi with the 10mm @page margin (globals.css):
// 190mm wide × 277mm tall.
const A4_CONTENT_W = 718;
const A4_CONTENT_H = 1047;

// Reserved vertical space for the printed chrome (unscaled px), used so the
// grid + header + mot-caché strip fit on a single sheet.
const HEADER_BLOCK = 150;
const MOTCACHE_BLOCK = 110;

/**
 * Largest scale (≤ 1) at which the header, an `width`×`height` grid, and the
 * optional mot-caché strip still fit one A4 sheet. Computed from known cell
 * geometry — no DOM measurement — so it can be applied as a print-only CSS
 * variable without waiting on layout.
 */
export function computeFlechePrintScale(
  width: number,
  height: number,
  hasHidden: boolean,
): number {
  const gridW = width * CELL;
  const contentH =
    HEADER_BLOCK + height * CELL + (hasHidden ? MOTCACHE_BLOCK : 0);
  return Math.min(A4_CONTENT_W / gridW, A4_CONTENT_H / contentH, 1);
}

export function FlechePrintHeader({ title }: { title: string }) {
  return (
    <header className="hidden print:flex flex-col items-center gap-2 pt-1 pb-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-[6px] border-[3px] border-ink bg-brand text-brand-foreground text-2xl font-bold">
          ►
        </span>
        <span
          className="text-5xl leading-none text-ink"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Les Flèches
        </span>
      </div>
      {title && (
        <h1 className="font-display uppercase tracking-[0.12em] text-lg text-ink text-center">
          {title}
        </h1>
      )}
    </header>
  );
}

export function FlechePrintMotCache({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="hidden print:flex flex-col items-center gap-2 pt-6">
      <span className="font-display uppercase tracking-[0.15em] text-sm text-ink">
        Mot caché
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="flex h-9 w-9 items-center justify-center rounded-[3px] border-2 border-ink text-[10px] text-muted-foreground"
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
