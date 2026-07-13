"use client";

import { useRef, useState } from "react";
import { MOTIFS, FRAMES } from "@/lib/design/patterns";
import { PhotoCropDialog } from "@/components/book/photo-crop-dialog";
import { cn } from "@/lib/utils";
import type { PageDesign } from "@/types/book";

interface DesignPickerProps {
  design: PageDesign;
  onChange: (design: PageDesign) => void;
  /** When set, an upload opens a crop dialog locked to this width/height ratio. */
  cropAspect?: number;
}

const swatchClass = "relative h-14 w-11 border-2 border-black bg-card overflow-hidden";

export function DesignPicker({ design, onChange, cropAspect }: DesignPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ photoRef: string; preview: string } | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
      // Full-res original lives in storage (photoRef); imageUrl is a preview only.
      if (cropAspect) {
        setPending({ photoRef: data.photoRef, preview: data.preview });
      } else {
        onChange({ ...design, photoRef: data.photoRef, imageUrl: data.preview, crop: undefined });
      }
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
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Motif
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...design, motif: undefined })}
            className={cn(
              swatchClass,
              "flex items-center justify-center text-xs",
              !design.motif && "ring-2 ring-primary ring-offset-1",
            )}
            title="Aucun"
          >
            ✕
          </button>
          {MOTIFS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ ...design, motif: m.id })}
              className={cn(swatchClass, design.motif === m.id && "ring-2 ring-primary ring-offset-1")}
              title={m.label}
            >
              <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.5 }}>
                <defs>
                  <pattern
                    id={`pick-${m.id}`}
                    width={m.tileSize}
                    height={m.tileSize}
                    patternUnits="userSpaceOnUse"
                  >
                    {m.tile("var(--color-foreground)")}
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#pick-${m.id})`} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Cadre
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...design, frame: undefined })}
            className={cn(
              swatchClass,
              "flex items-center justify-center text-xs",
              !design.frame && "ring-2 ring-primary ring-offset-1",
            )}
            title="Aucun"
          >
            ✕
          </button>
          {FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange({ ...design, frame: f.id })}
              className={cn(swatchClass, design.frame === f.id && "ring-2 ring-primary ring-offset-1")}
              title={f.label}
            >
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 141" preserveAspectRatio="none">
                {f.render("var(--color-foreground)")}
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Image de fond
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-black px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            {uploading ? "Import..." : design.imageUrl ? "Changer l'image" : "Importer une image"}
          </button>
          {design.imageUrl && !uploading && (
            <button
              type="button"
              onClick={() => onChange({ ...design, imageUrl: undefined, photoRef: undefined, crop: undefined })}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Retirer
            </button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {pending && cropAspect && (
        <PhotoCropDialog
          image={pending.preview}
          aspect={cropAspect}
          onCancel={() => {
            onChange({ ...design, photoRef: pending.photoRef, imageUrl: pending.preview, crop: undefined });
            setPending(null);
          }}
          onConfirm={(crop, croppedPreview) => {
            onChange({ ...design, photoRef: pending.photoRef, imageUrl: croppedPreview, crop });
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
