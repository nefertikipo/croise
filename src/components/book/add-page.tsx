"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GridCreator, type CreateGridOptions } from "@/components/book/grid-creator";
import type { ContentLayout } from "@/types/book";

interface AddPageProps {
  busy: boolean;
  onAddGrids: (opts: CreateGridOptions) => Promise<string | null> | void;
  onAddContent: (layout: ContentLayout) => void;
}

export function AddPage({ busy, onAddGrids, onAddContent }: AddPageProps) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl uppercase">Ajouter une page</h3>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Grille
        </p>
        <Button className="w-full" disabled={busy} onClick={() => setCreating(true)}>
          + Créer une grille
        </Button>
        <p className="text-xs text-muted-foreground">
          Ajoutez vos mots personnalisés (prénoms, dates, clins d&apos;œil) pendant la
          création.
        </p>
      </div>

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

      {creating && (
        <GridCreator
          busy={busy}
          onCreate={onAddGrids}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
