"use client";

import { useRef, useState } from "react";
import { CoverPreview } from "@/components/book/cover-preview";
import { PhotoCropDialog } from "@/components/book/photo-crop-dialog";
import { COVER_COLORS, COVER_FONTS, coverPhotoAspect } from "@/lib/book-pdf/cover-templates";
import { cn } from "@/lib/utils";
import type { CoverConfig, PageDesign } from "@/types/book";

interface CoverEditorProps {
  title: string;
  cover: CoverConfig;
  onTitleChange: (title: string) => void;
  onCoverChange: (patch: Partial<CoverConfig>) => void;
}

const label = "text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground";

export function CoverEditor({ title, cover, onTitleChange, onCoverChange }: CoverEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ photoRef: string; preview: string } | null>(null);

  const design = cover.design ?? {};
  const coverColor = cover.coverColor ?? "bleu";
  const titleFont = cover.titleFont ?? "serif";
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
    <div className="space-y-4">
      <h3 className="font-heading text-xl uppercase">Couverture</h3>

      <div className="aspect-[148/210] w-full overflow-hidden border-2 border-black shadow-md">
        <CoverPreview coverColor={coverColor} title={title} imageUrl={design.imageUrl} titleFont={titleFont} />
      </div>

      <div className="space-y-1">
        <span className={label}>Titre</span>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Mon livre"
          className="w-full border-2 border-black px-2 py-1 text-sm"
        />
      </div>

      <div className="space-y-1">
        <span className={label}>Couleur</span>
        <div className="flex gap-2">
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

      <div className="space-y-1">
        <span className={label}>Police</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(COVER_FONTS).map(([key, f]) => (
            <button
              key={key}
              type="button"
              onClick={() => onCoverChange({ titleFont: key })}
              className={cn(
                "border-2 border-black px-3 py-1 text-base uppercase",
                titleFont === key && "ring-2 ring-black ring-offset-1",
              )}
              style={{ fontFamily: `var(${f.cssVar})` }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className={label}>Photo</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-black px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            {uploading ? "Import..." : design.photoRef ? "Changer la photo" : "Importer une photo"}
          </button>
          {design.photoRef && !uploading && (
            <button
              type="button"
              onClick={() => setDesign({ photoRef: undefined, imageUrl: undefined, crop: undefined })}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Retirer
            </button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

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
