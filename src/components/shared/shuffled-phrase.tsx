import { cn } from "@/lib/utils";

/**
 * A phrase spelled out letter-by-letter in crossword cells, each cell
 * slightly "shuffled" — rotated / offset / recolored — for a playful,
 * hand-assembled puzzle feel. Inspired by the Abramović "There is love
 * within us all" grid poster and shuffled slide-puzzle photos.
 *
 * Deterministic jitter (seeded by position) so SSR and client match.
 */

const TONES = [
  "bg-paper text-ink",
  "bg-brand text-brand-foreground",
  "bg-turquoise text-ink",
  "bg-sun text-ink",
  "bg-pink text-ink",
  "bg-ink text-paper",
];

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 928.31 + salt * 13.7) * 10000;
  return x - Math.floor(x);
}

export function ShuffledPhrase({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const words = text.toUpperCase().split(" ");
  let idx = 0;

  return (
    <div className={cn("flex flex-wrap items-start justify-center gap-y-3", className)}>
      {words.map((word, w) => (
        <div key={w} className="flex mr-4 last:mr-0">
          {word.split("").map((ch) => {
            const i = idx++;
            const tone = TONES[Math.floor(seeded(i, 1) * TONES.length)];
            const rot = (seeded(i, 2) - 0.5) * 12;
            const dy = (seeded(i, 3) - 0.5) * 8;
            return (
              <span
                key={i}
                className={cn(
                  "flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-[3px] border-2 border-ink font-display text-xl sm:text-2xl shadow-[2px_2px_0_0] shadow-ink/70",
                  tone,
                )}
                style={{
                  transform: `rotate(${rot.toFixed(2)}deg) translateY(${dy.toFixed(1)}px)`,
                  marginLeft: -2,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
