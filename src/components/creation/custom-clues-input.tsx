"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomClue {
  answer: string;
  clue: string;
}

interface CustomCluesInputProps {
  clues: CustomClue[];
  onChange: (clues: CustomClue[]) => void;
}

export function CustomCluesInput({ clues, onChange }: CustomCluesInputProps) {
  function addRow() {
    onChange([...clues, { answer: "", clue: "" }]);
  }

  function removeRow(index: number) {
    onChange(clues.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: "answer" | "clue", value: string) {
    const updated = clues.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        Custom words & clues (optional)
      </Label>
      <p className="text-xs text-muted-foreground">
        Add your own words and personalized clues. These will be placed into the
        grid first.
      </p>

      {clues.map((clue, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Answer (e.g. SARAH)"
            value={clue.answer}
            onChange={(e) => updateRow(i, "answer", e.target.value)}
            className="w-36 uppercase font-mono"
          />
          <Input
            placeholder="Clue (e.g. The birthday girl!)"
            value={clue.clue}
            onChange={(e) => updateRow(i, "clue", e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeRow(i)}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            Remove
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        + Add custom word
      </Button>
    </div>
  );
}
