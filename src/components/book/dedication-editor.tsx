"use client";

import { Field, TextAreaField } from "@/components/book/field";
import {
  DEDICATION_FONTS,
  DEFAULT_DEDICATION_FONT,
  type DedicationFontKey,
} from "@/lib/books/dedication-fonts";

interface DedicationEditorProps {
  text: string;
  font: string | null;
  onChange: (text: string) => void;
  onFontChange: (font: DedicationFontKey) => void;
}

export function DedicationEditor({ text, font, onChange, onFontChange }: DedicationEditorProps) {
  const active = (font as DedicationFontKey) ?? DEFAULT_DEDICATION_FONT;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl uppercase">Dédicace</h3>
      <p className="text-sm text-muted-foreground">
        Un mot personnel, imprimé au début du livre. Laissez vide pour ne pas l&apos;afficher.
      </p>
      <Field label="Message">
        <TextAreaField
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Pour toi qui adores les mots fléchés…"
          rows={6}
        />
      </Field>
      <Field label="Police">
        <div className="grid grid-cols-2 gap-2">
          {DEDICATION_FONTS.map((f) => {
            const selected = f.key === active;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => onFontChange(f.key)}
                aria-pressed={selected}
                className={`flex flex-col items-start gap-1 border-2 px-3 py-2 text-left transition-colors ${
                  selected
                    ? "border-ink bg-ink/5"
                    : "border-ink/20 hover:border-ink/50"
                }`}
              >
                <span className={`${f.className} text-xl leading-none text-foreground`}>
                  Pour toi
                </span>
                <span className="text-xs text-muted-foreground">{f.hint}</span>
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}
