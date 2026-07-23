"use client";

import { useEffect, useState } from "react";

// The generator is a single blocking request (CPU-bound constraint solving), so
// we can't stream true progress. Instead we pace an honest estimate: phases and
// a bar advance on the typical timeline, then we reassure the user if it runs
// long rather than pretending it stalled.
const PHASES = [
  "Analyse de la capacité",
  "Construction de la trame",
  "Placement des mots croisés",
  "Choix des définitions",
  "Finalisation",
];
// Fraction of the estimated budget at which each phase begins. Word placement
// (the constraint solver) is by far the longest, so it owns the widest band.
const PHASE_STARTS = [0, 0.06, 0.2, 0.78, 0.94];

export function GenerationProgress({ estimatedMs }: { estimatedMs: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed(performance.now() - start);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  const frac = elapsed / estimatedMs;
  // Never let the bar claim 100% — it only fills on real completion.
  const pct = Math.min(95, frac * 100);
  const seconds = Math.floor(elapsed / 1000);

  let phaseIdx = 0;
  for (let i = 0; i < PHASE_STARTS.length; i++) {
    if (frac >= PHASE_STARTS[i]) phaseIdx = i;
  }

  const overtime = frac > 1.1;
  const wayOver = frac > 1.8;

  return (
    <div className="space-y-4 rounded-2xl border-2 border-ink bg-card p-6 shadow-[4px_4px_0_0] shadow-ink/80">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-medium text-ink">
          {PHASES[phaseIdx]}
          <span className="animate-pulse">…</span>
        </p>
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {seconds}s
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="space-y-1">
        {PHASES.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-2 text-sm ${
              i < phaseIdx
                ? "text-muted-foreground"
                : i === phaseIdx
                  ? "font-medium text-ink"
                  : "text-muted-foreground/40"
            }`}
          >
            <span className="w-4 text-center">
              {i < phaseIdx ? "✓" : i === phaseIdx ? "→" : "○"}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {overtime && !wayOver && (
        <p className="text-sm text-muted-foreground">
          Cette grille est dense — encore quelques instants…
        </p>
      )}
      {wayOver && (
        <p className="text-sm text-muted-foreground">
          Toujours en cours. Les grilles avec beaucoup de mots personnalisés
          peuvent prendre jusqu&apos;à ~2 min.
        </p>
      )}
    </div>
  );
}
