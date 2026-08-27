"use client";

import { useState } from "react";
import { Field, TextAreaField, TextField } from "@/components/book/field";
import { defaultDedicationSignoff, formatAuthorList } from "@/lib/books/authors";
import {
  DEDICATION_FONTS,
  DEFAULT_DEDICATION_FONT,
  type DedicationFontKey,
} from "@/lib/books/dedication-fonts";

interface DedicationEditorProps {
  text: string;
  font: string | null;
  /** Sign-off line above the signature; empty falls back to the default. */
  signoff: string;
  /** Free-text signature; empty falls back to the Carnet contributors. */
  signature: string;
  /** Carnet contributors, used to pre-fill the signature (the default). */
  authors: string[];
  onChange: (text: string) => void;
  onFontChange: (font: DedicationFontKey) => void;
  onSignatureChange: (signature: string) => void;
  onSignoffChange: (signoff: string) => void;
}

export function DedicationEditor({
  text,
  font,
  signoff,
  signature,
  authors,
  onChange,
  onFontChange,
  onSignatureChange,
  onSignoffChange,
}: DedicationEditorProps) {
  const active = (font as DedicationFontKey) ?? DEFAULT_DEDICATION_FONT;

  // Pre-fill the sign-off and names so the maker tweaks them instead of typing
  // from scratch. Seeded once from the saved value, or from the printed default
  // when nothing's saved yet — leaving the field untouched keeps that default,
  // since an empty saved value falls back to it downstream anyway.
  const [signoffDraft, setSignoffDraft] = useState(
    () => signoff || defaultDedicationSignoff(authors.length),
  );
  const [signatureDraft, setSignatureDraft] = useState(
    () => signature || formatAuthorList(authors),
  );

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl uppercase">Dédicace</h3>
      <p className="text-sm text-muted-foreground">
        Un mot personnel, imprimé au début du carnet. Laissez vide pour ne pas l&apos;afficher.
        Le titre du carnet est ajouté en surtitre au-dessus de votre message.
      </p>
      <Field label="Message">
        <TextAreaField
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Pour toi qui adores les mots fléchés…"
          rows={6}
        />
      </Field>
      <Field label="Formule">
        <TextField
          value={signoffDraft}
          onChange={(e) => {
            setSignoffDraft(e.target.value);
            onSignoffChange(e.target.value);
          }}
          placeholder={defaultDedicationSignoff(authors.length)}
          maxLength={200}
        />
        <span className="mt-1 block text-[11px] text-muted-foreground">
          La formule imprimée au-dessus des prénoms. Modifiez-la à votre guise.
        </span>
      </Field>
      <Field label="Signature">
        <TextField
          value={signatureDraft}
          onChange={(e) => {
            setSignatureDraft(e.target.value);
            onSignatureChange(e.target.value);
          }}
          placeholder={authors.length > 0 ? formatAuthorList(authors) : "Louise, Théo et Max"}
          maxLength={200}
        />
        <span className="mt-1 block text-[11px] text-muted-foreground">
          {authors.length > 0
            ? "Pré-rempli avec les prénoms du Carnet d'idées. Modifiez-les ici."
            : "Signe le mot après la formule ci-dessus."}
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
