"use client";

import { Field, TextField, TextAreaField, ColorPicker } from "@/components/book/field";
import { DesignPicker } from "@/components/book/design-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContentLayout, ContentPageConfig } from "@/types/book";

interface ContentPageEditorProps {
  config: ContentPageConfig;
  onChange: (patch: Partial<ContentPageConfig>) => void;
  onDelete: () => void;
}

const LAYOUTS: { value: ContentLayout; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "quote", label: "Citation" },
];

export function ContentPageEditor({ config, onChange, onDelete }: ContentPageEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl uppercase">Page libre</h3>
        <button onClick={onDelete} className="text-sm text-muted-foreground hover:text-destructive">
          Supprimer
        </button>
      </div>

      <Field label="Type">
        <div className="flex gap-2">
          {LAYOUTS.map((l) => (
            <button
              key={l.value}
              onClick={() => onChange({ layout: l.value })}
              className={cn(
                "border-2 border-black px-3 py-1 text-sm",
                config.layout === l.value ? "bg-primary text-primary-foreground" : "bg-background",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Field>

      {config.layout === "quote" ? (
        <>
          <Field label="Citation">
            <TextAreaField
              value={config.quote ?? ""}
              onChange={(e) => onChange({ quote: e.target.value })}
              placeholder="Une jolie citation…"
              rows={4}
            />
          </Field>
          <Field label="Auteur (optionnel)">
            <TextField
              value={config.title ?? ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Victor Hugo"
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="Titre">
            <TextField
              value={config.title ?? ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Souvenirs"
            />
          </Field>
          <Field label="Texte">
            <TextAreaField
              value={config.body ?? ""}
              onChange={(e) => onChange({ body: e.target.value })}
              placeholder="Écrivez ici…"
              rows={7}
            />
          </Field>
        </>
      )}

      <Field label="Couleur de fond">
        <ColorPicker
          value={config.backgroundColor}
          onChange={(c) => onChange({ backgroundColor: c })}
        />
      </Field>

      <div className="border-t-2 border-black/10 pt-4">
        <DesignPicker
          design={config.design ?? {}}
          onChange={(design) => onChange({ design })}
        />
      </div>

      <Button variant="outline" onClick={onDelete} className="w-full">
        Supprimer cette page
      </Button>
    </div>
  );
}
