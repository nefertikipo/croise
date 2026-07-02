"use client";

import { useRef } from "react";
import { MOTIFS, FRAMES } from "@/lib/design/patterns";
import { cn } from "@/lib/utils";
import type { PageDesign } from "@/types/book";

interface DesignPickerProps {
  design: PageDesign;
  onChange: (design: PageDesign) => void;
}

/** Downscale an uploaded image and return it as a JPEG data URL. */
async function fileToDataUrl(file: File, maxDim = 1400): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

const swatchClass = "relative h-14 w-11 border-2 border-black bg-card overflow-hidden";

export function DesignPicker({ design, onChange }: DesignPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imageUrl = await fileToDataUrl(file);
      onChange({ ...design, imageUrl });
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
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
            onClick={() => fileRef.current?.click()}
            className="border-2 border-black px-3 py-1 text-sm hover:bg-muted"
          >
            {design.imageUrl ? "Changer l'image" : "Importer une image"}
          </button>
          {design.imageUrl && (
            <button
              type="button"
              onClick={() => onChange({ ...design, imageUrl: undefined })}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Retirer
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
    </div>
  );
}
