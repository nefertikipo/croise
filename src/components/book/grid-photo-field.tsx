"use client";

import { useRef, useState } from "react";
import { PhotoCropDialog } from "@/components/book/photo-crop-dialog";
import { uploadBookPhoto } from "@/components/book/upload-photo";
import { Button } from "@/components/ui/button";
import {
  PHOTO_PRESETS,
  DEFAULT_PHOTO_PRESET,
  presetAspect,
} from "@/lib/crossword/photo-presets";
import { cn } from "@/lib/utils";
import type { GridPhoto } from "@/types/book";

interface GridPhotoFieldProps {
  photo: GridPhoto | undefined;
  width: number;
  height: number;
  onChange: (photo: GridPhoto | undefined) => void;
}

const label = "text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground";

/**
 * Editor control for the photo-in-grid feature: pick a preset position, upload +
 * crop a picture, and preview it. The reserved block only takes effect on the
 * next regeneration, so we say so.
 */
export function GridPhotoField({ photo, width, height, onChange }: GridPhotoFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ photoRef: string; preview: string } | null>(null);

  const preset = photo?.preset ?? DEFAULT_PHOTO_PRESET;
  const aspect = presetAspect(preset, width, height);
  const previewSrc =
    photo?.imageUrl ??
    (photo?.photoRef ? `/api/books/photo?ref=${encodeURIComponent(photo.photoRef)}` : null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { photoRef, preview } = await uploadBookPhoto(file);
      setPending({ photoRef, preview });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Echec de l'import de la photo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3 border-t-2 border-black/10 pt-4">
      <div className="flex items-center justify-between">
        <span className={label}>Photo dans la grille</span>
        {photo && (
          <button
            type="button"
            className="text-xs text-destructive underline"
            onClick={() => onChange(undefined)}
          >
            Retirer
          </button>
        )}
      </div>

      {!photo ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onChange({ preset: DEFAULT_PHOTO_PRESET })}
        >
          Ajouter une photo
        </Button>
      ) : (
        <>
          {PHOTO_PRESETS.length > 1 && (
            <div className="space-y-1">
              <span className={label}>Position</span>
              <div className="grid grid-cols-3 gap-2">
                {PHOTO_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onChange({ ...photo, preset: p.id })}
                    className={cn(
                      "border-2 px-2 py-1.5 text-xs",
                      preset === p.id ? "border-primary ring-2 ring-primary ring-offset-1" : "border-black",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-square w-28 items-center justify-center overflow-hidden border-2 border-black bg-muted bg-cover bg-center text-2xl text-muted-foreground"
            style={previewSrc ? { backgroundImage: `url(${previewSrc})` } : undefined}
          >
            {previewSrc ? "" : uploading ? "…" : "+"}
          </button>

          {previewSrc && (
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              Changer la photo
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Régénérez la grille pour intégrer la photo à la disposition.
          </p>
        </>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {pending && (
        <PhotoCropDialog
          image={pending.preview}
          aspect={aspect}
          onCancel={() => {
            onChange({ preset, photoRef: pending.photoRef, imageUrl: pending.preview });
            setPending(null);
          }}
          onConfirm={(crop, croppedPreview) => {
            onChange({ preset, photoRef: pending.photoRef, imageUrl: croppedPreview, crop });
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
