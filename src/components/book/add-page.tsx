"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DifficultyPicker } from "@/components/book/difficulty-picker";
import { GenerationProgress } from "@/components/shared/generation-progress";
import { estimateGenerationMs } from "@/lib/crossword/estimate-generation";
import { cn } from "@/lib/utils";
import type { ContentLayout, GridDifficulty, GridPage } from "@/types/book";

const PRESETS = [
  { w: 11, h: 17, label: "11×17" },
  { w: 11, h: 15, label: "11×15" },
  { w: 9, h: 13, label: "9×13" },
  { w: 8, h: 11, label: "8×11" },
];

/** Words/clues an incoming standalone grid shares with the book already. */
export interface AttachGridConflict {
  words: string[];
  clues: string[];
}

export type AttachGridResult =
  | { page: GridPage }
  | { conflict: AttachGridConflict };

/** Reduce a pasted grid code or full URL to just the code. */
function extractCode(input: string): string {
  const trimmed = input.trim();
  const lastSegment = trimmed.split(/[/?#]/).filter(Boolean).pop() ?? trimmed;
  return lastSegment.toUpperCase();
}

interface AddPageProps {
  busy: boolean;
  /** Per-grid progress while a batch add is running; null when idle. */
  genBatch: { current: number; total: number } | null;
  onAddGrids: (opts: {
    width: number;
    height: number;
    count: number;
    difficulty: GridDifficulty;
  }) => void;
  onAddContent: (layout: ContentLayout) => void;
  onAttachGrid: (
    crosswordCode: string,
    opts?: { regenerateToFit?: boolean; force?: boolean },
  ) => Promise<AttachGridResult | null>;
}

export function AddPage({ busy, genBatch, onAddGrids, onAddContent, onAttachGrid }: AddPageProps) {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [count, setCount] = useState(1);
  const [difficulty, setDifficulty] = useState<GridDifficulty>("balanced");
  const [attachCode, setAttachCode] = useState("");
  const [conflict, setConflict] = useState<AttachGridConflict | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  // Only the regenerate-to-fit path re-solves a grid (slow); a plain attach is
  // a quick DB copy, so we show the progress bar only for the former.
  const [regenerating, setRegenerating] = useState(false);

  // Per-grid estimate for the batch progress bar (batch add has no custom words).
  const gridEstimateMs = estimateGenerationMs({
    width: preset.w,
    height: preset.h,
    customCount: 0,
  });

  async function submitAttach(opts?: { regenerateToFit?: boolean; force?: boolean }) {
    const code = extractCode(attachCode);
    if (!code) return;
    setAttachError(null);
    setRegenerating(opts?.regenerateToFit ?? false);
    const result = await onAttachGrid(code, opts);
    setRegenerating(false);
    if (!result) {
      setAttachError("Grille introuvable ou impossible à ajouter.");
      return;
    }
    if ("conflict" in result) {
      setConflict(result.conflict);
      return;
    }
    // Attached successfully — reset the panel.
    setAttachCode("");
    setConflict(null);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl uppercase">Ajouter une page</h3>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Format</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPreset(p)}
              className={cn(
                "border-2 border-black px-3 py-1 text-sm",
                preset.label === p.label ? "bg-primary text-primary-foreground" : "bg-background",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Nombre
        </span>
        <div className="flex items-center border-2 border-black">
          <button className="px-2 py-1 hover:bg-muted" onClick={() => setCount((c) => Math.max(1, c - 1))}>
            −
          </button>
          <span className="w-8 text-center text-sm">{count}</span>
          <button className="px-2 py-1 hover:bg-muted" onClick={() => setCount((c) => Math.min(10, c + 1))}>
            +
          </button>
        </div>
      </div>

      <DifficultyPicker value={difficulty} onChange={setDifficulty} />

      {genBatch ? (
        <div className="space-y-2">
          {genBatch.total > 1 && (
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Grille {genBatch.current} sur {genBatch.total}
            </p>
          )}
          {/* Remount per grid so the bar restarts its timeline each time. */}
          <GenerationProgress key={genBatch.current} estimatedMs={gridEstimateMs} />
        </div>
      ) : (
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => onAddGrids({ width: preset.w, height: preset.h, count, difficulty })}
        >
          {count > 1 ? `+ ${count} grilles` : "+ Une grille"}
        </Button>
      )}

      <div className="border-t-2 border-black/10 pt-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Page libre
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => onAddContent("note")}>
            + Note
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => onAddContent("quote")}>
            + Citation
          </Button>
        </div>
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => onAddContent("photo")}>
          + Photos
        </Button>
      </div>

      <div className="border-t-2 border-black/10 pt-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Grille existante
        </p>
        <p className="text-xs text-muted-foreground">
          Collez le code d&apos;une grille déjà créée pour l&apos;ajouter à ce livre.
        </p>
        <div className="flex gap-2">
          <input
            placeholder="Code de la grille"
            value={attachCode}
            onChange={(e) => {
              setAttachCode(e.target.value);
              setConflict(null);
              setAttachError(null);
            }}
            className="flex-1 border-2 border-black px-2 py-1 text-sm uppercase font-mono"
          />
          <Button
            variant="outline"
            disabled={busy || attachCode.trim().length === 0}
            onClick={() => submitAttach()}
          >
            Ajouter
          </Button>
        </div>
        {attachError && <p className="text-xs text-destructive">{attachError}</p>}

        {conflict && (
          <div className="border-2 border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-destructive">
              Doublons détectés
            </p>
            <p className="text-xs text-muted-foreground">
              Cette grille réutilise déjà{" "}
              {conflict.words.length > 0 && (
                <>
                  {conflict.words.length} mot{conflict.words.length > 1 ? "s" : ""} (
                  {conflict.words.join(", ")})
                </>
              )}
              {conflict.words.length > 0 && conflict.clues.length > 0 && " et "}
              {conflict.clues.length > 0 && (
                <>
                  {conflict.clues.length} indice{conflict.clues.length > 1 ? "s" : ""}
                </>
              )}{" "}
              présent{conflict.words.length + conflict.clues.length > 1 ? "s" : ""} dans le livre.
            </p>
            {regenerating ? (
              <GenerationProgress
                estimatedMs={estimateGenerationMs({
                  width: 11,
                  height: 17,
                  customCount: 1,
                })}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() => submitAttach({ regenerateToFit: true })}
                >
                  Régénérer pour ce livre
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => submitAttach({ force: true })}
                >
                  Ajouter quand même
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
