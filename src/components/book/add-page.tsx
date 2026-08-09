"use client";

import { Button } from "@/components/ui/button";
import type { ContentLayout } from "@/types/book";

interface AddPageProps {
  busy: boolean;
  /** Open the full-screen grid creator (owned by the book editor). */
  onCreateGrid: () => void;
  onAddContent: (layout: ContentLayout) => void;
}

export function AddPage({ busy, onCreateGrid, onAddContent }: AddPageProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Grille
        </p>
        <Button className="w-full" disabled={busy} onClick={onCreateGrid}>
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
    </div>
  );
}
