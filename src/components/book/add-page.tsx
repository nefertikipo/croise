"use client";

import { Button } from "@/components/ui/button";
import type { ContentLayout } from "@/types/book";

interface AddPageProps {
  busy: boolean;
  /** Live interior page count, and the printable window it must stay inside. */
  interiorPages: number;
  maxPages: number;
  minPages: number;
  /** Open the full-screen grid creator (owned by the book editor). */
  onCreateGrid: () => void;
  onAddContent: (layout: ContentLayout) => void;
}

export function AddPage({
  busy,
  interiorPages,
  maxPages,
  minPages,
  onCreateGrid,
  onAddContent,
}: AddPageProps) {
  // The printer binds a fixed page window; block adds once the book is full.
  const atCapacity = interiorPages >= maxPages;
  const belowMin = interiorPages < minPages;
  const addDisabled = busy || atCapacity;

  return (
    <div className="space-y-4">
      <div
        className={`border-2 px-3 py-2 text-xs ${
          atCapacity ? "border-destructive text-destructive" : "border-black/10 text-muted-foreground"
        }`}
      >
        <p className="font-bold uppercase tracking-[0.12em]">
          {interiorPages} / {maxPages} pages
        </p>
        {atCapacity ? (
          <p className="mt-1">
            Votre carnet a atteint la taille maximale imprimable ({maxPages} pages).
            Supprimez une page pour en ajouter une autre.
          </p>
        ) : belowMin ? (
          <p className="mt-1">
            Un carnet imprimé compte au moins {minPages} pages : continuez d&apos;ajouter
            des grilles.
          </p>
        ) : (
          <p className="mt-1">Espace imprimable : {maxPages - interiorPages} pages restantes.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Grille
        </p>
        <Button className="w-full" disabled={addDisabled} onClick={onCreateGrid}>
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
          <Button variant="outline" className="flex-1" disabled={addDisabled} onClick={() => onAddContent("note")}>
            + Note
          </Button>
          <Button variant="outline" className="flex-1" disabled={addDisabled} onClick={() => onAddContent("quote")}>
            + Citation
          </Button>
        </div>
        <Button variant="outline" className="w-full" disabled={addDisabled} onClick={() => onAddContent("photo")}>
          + Photos
        </Button>
      </div>
    </div>
  );
}
