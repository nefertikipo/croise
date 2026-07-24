"use client";

import { cn } from "@/lib/utils";
import type { GridDifficulty } from "@/types/book";

const OPTIONS: { value: GridDifficulty; label: string }[] = [
  { value: "facile", label: "Facile" },
  { value: "balanced", label: "Équilibré" },
  { value: "moyen", label: "Moyen" },
  { value: "difficile", label: "Difficile" },
];

interface DifficultyPickerProps {
  value: GridDifficulty;
  onChange: (value: GridDifficulty) => void;
}

export function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
        Difficulté
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "border-2 border-black px-3 py-1 text-sm",
              value === o.value ? "bg-primary text-primary-foreground" : "bg-background",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
