"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DifficultyPicker } from "@/components/book/difficulty-picker";
import { cn } from "@/lib/utils";
import type { ContentLayout, GridDifficulty } from "@/types/book";

const PRESETS = [
  { w: 11, h: 17, label: "11×17" },
  { w: 11, h: 15, label: "11×15" },
  { w: 9, h: 13, label: "9×13" },
  { w: 8, h: 11, label: "8×11" },
];

interface AddPageProps {
  busy: boolean;
  onAddGrids: (opts: {
    width: number;
    height: number;
    count: number;
    difficulty: GridDifficulty;
  }) => void;
  onAddContent: (layout: ContentLayout) => void;
}

export function AddPage({ busy, onAddGrids, onAddContent }: AddPageProps) {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [count, setCount] = useState(1);
  const [difficulty, setDifficulty] = useState<GridDifficulty>("balanced");

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

      <Button
        className="w-full"
        disabled={busy}
        onClick={() => onAddGrids({ width: preset.w, height: preset.h, count, difficulty })}
      >
        {busy ? "Génération…" : count > 1 ? `+ ${count} grilles` : "+ Une grille"}
      </Button>

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
    </div>
  );
}
