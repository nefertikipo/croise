"use client";

import { useRef, useState } from "react";
import { PhotoCropDialog } from "@/components/book/photo-crop-dialog";
import { PhotoPagePreview } from "@/components/book/photo-page-preview";
import { getPhotoLayout } from "@/lib/book-pdf/photo-layouts";
import { cn } from "@/lib/utils";
import type { ContentPageConfig, PageDesign } from "@/types/book";

interface PhotoPageEditorProps {
  config: ContentPageConfig;
  onChange: (patch: Partial<ContentPageConfig>) => void;
  onDelete: () => void;
}

const label = "text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground";
// Curated set offered in the picker.
const PICKABLE = ["hero", "sunleak", "field", "big-two", "two-v", "grille-16"];

export function PhotoPageEditor({ config, onChange, onDelete }: PhotoPageEditorProps) {
  const layoutId = config.photoLayout ?? "hero";
  const layout = getPhotoLayout(layoutId);
  const photos = config.photos ?? [];
  // Aspect ratio of each PHOTO slot, in order.
  const photoAspects = layout.slots.filter((s) => s.kind !== "graphic").map((s) => (s.rect.w * 148) / (s.rect.h * 210));

  const fileRef = useRef<HTMLInputElement>(null);
  const [activeK, setActiveK] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ k: number; photoRef: string; preview: string; aspect: number } | null>(null);

  function setPhoto(k: number, design: PageDesign) {
    const next = [...photos];
    next[k] = design;
    onChange({ photoLayout: layoutId, photos: next });
  }

  function pickSlot(k: number) {
    setActiveK(k);
    fileRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const k = activeK;
    if (!file || k === null) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/books/upload-photo", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Echec de l'import.");
        return;
      }
      setPending({ k, photoRef: data.photoRef, preview: data.preview, aspect: photoAspects[k] });
    } catch (err) {
      console.error("Image upload failed:", err);
      setError("Echec de l'import de la photo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl uppercase">Photos</h3>
        <button onClick={onDelete} className="text-sm text-muted-foreground hover:text-destructive">
          Supprimer
        </button>
      </div>

      <div className="space-y-1">
        <span className={label}>Disposition</span>
        <div className="grid grid-cols-3 gap-2">
          {PICKABLE.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ photoLayout: id })}
              className={cn(
                "aspect-[148/210] overflow-hidden border-2",
                layoutId === id ? "border-primary ring-2 ring-primary ring-offset-1" : "border-black",
              )}
            >
              <PhotoPagePreview layoutId={id} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className={label}>Vos photos ({photoAspects.length})</span>
        <div className="grid grid-cols-4 gap-2">
          {photoAspects.map((_, k) => {
            const img = photos[k]?.imageUrl;
            return (
              <button
                key={k}
                type="button"
                onClick={() => pickSlot(k)}
                className="flex aspect-square items-center justify-center overflow-hidden border-2 border-black bg-muted bg-cover bg-center text-sm text-muted-foreground"
                style={img ? { backgroundImage: `url(${img})` } : undefined}
              >
                {img ? "" : uploading && activeK === k ? "…" : "+"}
              </button>
            );
          })}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {pending && (
        <PhotoCropDialog
          image={pending.preview}
          aspect={pending.aspect}
          onCancel={() => {
            setPhoto(pending.k, { photoRef: pending.photoRef, imageUrl: pending.preview });
            setPending(null);
          }}
          onConfirm={(crop, croppedPreview) => {
            setPhoto(pending.k, { photoRef: pending.photoRef, imageUrl: croppedPreview, crop });
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
