"use client";

import { Field, TextField, ColorPicker } from "@/components/book/field";
import { DesignPicker } from "@/components/book/design-picker";
import type { CoverConfig } from "@/types/book";

interface CoverEditorProps {
  title: string;
  cover: CoverConfig;
  onTitleChange: (title: string) => void;
  onCoverChange: (patch: Partial<CoverConfig>) => void;
}

export function CoverEditor({ title, cover, onTitleChange, onCoverChange }: CoverEditorProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl uppercase">Couverture</h3>

      <Field label="Titre">
        <TextField value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Mon livre" />
      </Field>

      <Field label="Sous-titre">
        <TextField
          value={cover.subtitle ?? ""}
          onChange={(e) => onCoverChange({ subtitle: e.target.value })}
          placeholder="Une collection de grilles"
        />
      </Field>

      <Field label="Pour (destinataire)">
        <TextField
          value={cover.recipientName ?? ""}
          onChange={(e) => onCoverChange({ recipientName: e.target.value })}
          placeholder="Mamie"
        />
      </Field>

      <Field label="Occasion">
        <TextField
          value={cover.occasion ?? ""}
          onChange={(e) => onCoverChange({ occasion: e.target.value })}
          placeholder="Joyeux anniversaire"
        />
      </Field>

      <Field label="Couleur">
        <ColorPicker
          value={cover.themeColor}
          allowNone={false}
          onChange={(c) => onCoverChange({ themeColor: c })}
        />
      </Field>

      <div className="border-t-2 border-black/10 pt-4">
        <DesignPicker
          design={cover.design ?? {}}
          onChange={(design) => onCoverChange({ design })}
        />
      </div>
    </div>
  );
}
