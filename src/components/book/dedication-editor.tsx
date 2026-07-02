"use client";

import { Field, TextAreaField } from "@/components/book/field";

interface DedicationEditorProps {
  text: string;
  onChange: (text: string) => void;
}

export function DedicationEditor({ text, onChange }: DedicationEditorProps) {
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
    </div>
  );
}
