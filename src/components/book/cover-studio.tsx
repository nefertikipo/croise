"use client";

import { useRef, useState } from "react";
import { CoverPreview } from "@/components/book/cover-preview";
import { BackCoverPreview } from "@/components/book/back-cover-preview";
import { PhotoCropDialog } from "@/components/book/photo-crop-dialog";
import { uploadBookPhoto } from "@/components/book/upload-photo";
import { COVER_COLORS, COVER_FONTS, coverPhotoAspect } from "@/lib/book-pdf/cover-templates";
import { POD_TRIM } from "@/lib/books/constants";
import { cn } from "@/lib/utils";
import type { CoverConfig, PageDesign } from "@/types/book";

interface CoverStudioProps {
  title: string;
  cover: CoverConfig;
  /** Contributors auto-credited on the back cover when no names are typed. */
  authors: string[];
  onTitleChange: (title: string) => void;
  onCoverChange: (patch: Partial<CoverConfig>) => void;
}

const label = "text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground";

/** Cheerz-style focused cover editor: one large centred preview, controls in a
 * bottom bar. A Recto/Dos toggle flips between the front and back panels; the
 * colour, font and title are shared across both, so only the side-specific
 * controls swap. */
export function CoverStudio({ title, cover, authors, onTitleChange, onCoverChange }: CoverStudioProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ photoRef: string; preview: string } | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");

  const design = cover.design ?? {};
  const coverColor = cover.coverColor ?? "bleu";
  const titleFont = cover.titleFont ?? "serif";
  const titleBold = cover.titleBold ?? false;
  const backNames = cover.backCoverNames ?? "";
  const backMessage = cover.backCoverMessage ?? "";
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
    <div className="flex h-[82vh] flex-col gap-4">
      {/* Recto / Dos toggle */}
      <div className="flex justify-center">
        <div className="inline-flex border-2 border-black" role="tablist">
          {(
            [
              { key: "front", label: "Recto" },
              { key: "back", label: "Dos" },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={side === s.key}
              onClick={() => setSide(s.key)}
              className={cn(
                "px-5 py-1 font-display text-xs uppercase tracking-[0.2em] transition-colors",
                side === s.key ? "bg-black text-white" : "bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Big centred preview */}
      <div className="flex flex-1 items-center justify-center rounded-md bg-muted p-6">
        <div
          className="h-full overflow-hidden border-2 border-black shadow-[6px_6px_0_0_rgba(0,0,0,0.15)]"
          style={{ aspectRatio: `${POD_TRIM.w} / ${POD_TRIM.h}` }}
        >
          {side === "front" ? (
            <CoverPreview
              coverColor={coverColor}
              title={title}
              imageUrl={design.imageUrl}
              titleFont={titleFont}
              titleBold={titleBold}
            />
          ) : (
            <BackCoverPreview
              coverColor={coverColor}
              title={title}
              titleFont={titleFont}
              names={backNames}
              message={backMessage}
              authors={authors}
            />
          )}
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-2 border-black bg-card p-4">
        {/* Photo (front only) */}
        {side === "front" && (
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
        )}

        {/* Back-cover names + message (dos only) */}
        {side === "back" && (
          <>
            <div className="space-y-1">
              <span className={label}>Noms</span>
              <input
                value={backNames}
                onChange={(e) => onCoverChange({ backCoverNames: e.target.value })}
                placeholder={authors.length > 0 ? authors.join(", ") : "Louise, Théo et Max"}
                maxLength={200}
                className="block w-64 border-2 border-black px-2 py-1.5 text-sm"
              />
              <span className="block max-w-64 text-[11px] text-muted-foreground">
                {authors.length > 0
                  ? "Par défaut, les prénoms du Carnet d'idées. Modifiez-les ici."
                  : "Crédite les personnes sous « Imaginé avec amour par »."}
              </span>
            </div>

            <div className="space-y-1">
              <span className={label}>Message</span>
              <textarea
                value={backMessage}
                onChange={(e) => onCoverChange({ backCoverMessage: e.target.value })}
                placeholder="Un petit mot au dos (facultatif)"
                maxLength={240}
                rows={2}
                className="block w-72 resize-y border-2 border-black px-2 py-1.5 text-sm"
              />
            </div>
          </>
        )}

        {/* Title */}
        <div className="space-y-1">
          <span className={label}>Titre</span>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Mon carnet"
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
