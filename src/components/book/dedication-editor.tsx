"use client";

import { Field, TextAreaField, TextField } from "@/components/book/field";
import {
  DEDICATION_FONTS,
  DEFAULT_DEDICATION_FONT,
  type DedicationFontKey,
} from "@/lib/books/dedication-fonts";

interface DedicationEditorProps {
  text: string;
  font: string | null;
  /** Free-text signature; empty falls back to the Carnet contributors. */
  signature: string;
  /** Carnet contributors, shown as the signature placeholder (the default). */
  authors: string[];
  onChange: (text: string) => void;
  onFontChange: (font: DedicationFontKey) => void;
  onSignatureChange: (signature: string) => void;
}

export function DedicationEditor({
  text,
  font,
  signature,
  authors,
  onChange,
  onFontChange,
  onSignatureChange,
}: DedicationEditorProps) {
  const active = (font as DedicationFontKey) ?? DEFAULT_DEDICATION_FONT;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl uppercase">Dédicace</h3>
      <p className="text-sm text-muted-foreground">
        Un mot personnel, imprimé au début du livre. Laissez vide pour ne pas l&apos;afficher.
        Le titre du livre est ajouté en surtitre au-dessus de votre message.
      </p>
      <Field label="Message">
        <TextAreaField
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Pour toi qui adores les mots fléchés…"
          rows={6}
        />
      </Field>
      <Field label="Signature">
        <TextField
          value={signature}
          onChange={(e) => onSignatureChange(e.target.value)}
          placeholder={authors.length > 0 ? authors.join(", ") : "Louise, Théo et Max"}
          maxLength={200}
        />
        <span className="mt-1 block text-[11px] text-muted-foreground">
          {authors.length > 0
            ? "Par défaut, les prénoms du Carnet d'idées. Modifiez-les ici."
            : "Signe le mot après « Avec tout notre amour, »."}
        </span>
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
