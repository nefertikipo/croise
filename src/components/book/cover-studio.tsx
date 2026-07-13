"use client";

import { useRef, useState } from "react";
import { CoverPreview } from "@/components/book/cover-preview";
import { PhotoCropDialog } from "@/components/book/photo-crop-dialog";
import { COVER_COLORS, COVER_FONTS, coverPhotoAspect } from "@/lib/book-pdf/cover-templates";
import { cn } from "@/lib/utils";
import type { CoverConfig, PageDesign } from "@/types/book";

interface CoverStudioProps {
  title: string;
  cover: CoverConfig;
  onTitleChange: (title: string) => void;
  onCoverChange: (patch: Partial<CoverConfig>) => void;
}

const label = "text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground";

/** Cheerz-style focused cover editor: one large centred preview, controls in a
 * bottom bar. */
export function CoverStudio({ title, cover, onTitleChange, onCoverChange }: CoverStudioProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ photoRef: string; preview: string } | null>(null);

  const design = cover.design ?? {};
  const coverColor = cover.coverColor ?? "bleu";
  const titleFont = cover.titleFont ?? "serif";
  const titleBold = cover.titleBold ?? false;
  const aspect = coverPhotoAspect(cover.coverTemplate);

  function setDesign(patch: Partial<PageDesign>) {
    onCoverChange({ design: { ...design, ...patch } });
  }

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
      setPending({ photoRef: data.photoRef, preview: data.preview });
    } catch (err) {
      console.error("Image upload failed:", err);
      setError("Echec de l'import de la photo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex h-[82vh] flex-col gap-4">
      {/* Big centred preview */}
      <div className="flex flex-1 items-center justify-center rounded-md bg-muted p-6">
        <div className="aspect-[148/210] h-full overflow-hidden border-2 border-black shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]">
          <CoverPreview
            coverColor={coverColor}
            title={title}
            imageUrl={design.imageUrl}
            titleFont={titleFont}
            titleBold={titleBold}
          />
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-2 border-black bg-card p-4">
        {/* Photo */}
        <div className="space-y-1">
          <span className={label}>Photo</span>
          <div className="flex items-center gap-2">
            {design.imageUrl && (
              <div
                className="h-11 w-11 border-2 border-black bg-cover bg-center"
                style={{ backgroundImage: `url(${design.imageUrl})` }}
              />
            )}
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-black px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {uploading ? "Import..." : design.photoRef ? "Changer" : "Importer une photo"}
            </button>
          </div>
          {error && <p className="max-w-48 text-xs text-destructive">{error}</p>}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className={label}>Titre</span>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Mon livre"
            className="block w-52 border-2 border-black px-2 py-1.5 text-sm"
          />
        </div>

        {/* Colour */}
        <div className="space-y-1">
          <span className={label}>Couleur</span>
          <div className="flex gap-1.5">
            {Object.entries(COVER_COLORS).map(([key, c]) => (
              <button
                key={key}
                type="button"
                onClick={() => onCoverChange({ coverColor: key })}
                title={c.label}
                className={cn("h-8 w-8 border-2 border-black", coverColor === key && "ring-2 ring-black ring-offset-1")}
                style={{ backgroundColor: c.bg }}
              />
            ))}
          </div>
        </div>

        {/* Font */}
        <div className="space-y-1">
          <span className={label}>Police</span>
          <div className="flex gap-2">
            {Object.entries(COVER_FONTS).map(([key, f]) => (
              <button
                key={key}
                type="button"
                onClick={() => onCoverChange({ titleFont: key })}
                className={cn(
                  "border-2 border-black px-3 py-1.5 text-base uppercase leading-none",
                  titleFont === key && "ring-2 ring-black ring-offset-1",
                )}
                style={{ fontFamily: `var(${f.cssVar})` }}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onCoverChange({ titleBold: !titleBold })}
              title="Gras"
              className={cn(
                "border-2 border-black px-3 py-1.5 text-base font-bold leading-none",
                titleBold ? "bg-black text-white" : "hover:bg-muted",
              )}
            >
              B
            </button>
          </div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {pending && (
        <PhotoCropDialog
          image={pending.preview}
          aspect={aspect}
          onCancel={() => {
            setDesign({ photoRef: pending.photoRef, imageUrl: pending.preview, crop: undefined });
            setPending(null);
          }}
          onConfirm={(crop, croppedPreview) => {
            setDesign({ photoRef: pending.photoRef, imageUrl: croppedPreview, crop });
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
