"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedDataUrl } from "@/lib/crop-image";

interface PhotoCropDialogProps {
  /** Preview image (data URL) to frame. */
  image: string;
  /** Width/height ratio the crop is locked to. */
  aspect: number;
  onCancel: () => void;
  /** Chosen crop as fractions (0..1) of the original, plus a cropped preview. */
  onConfirm: (crop: { x: number; y: number; w: number; h: number }, croppedPreview: string) => void;
}

/** Cheerz-style crop popup: pan + zoom a photo into a fixed aspect box. Stores
 * the crop as fractions so the print engine can apply it to the full-res original. */
export function PhotoCropDialog({ image, aspect, onCancel, onConfirm }: PhotoCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [pixels, setPixels] = useState<Area | null>(null);

  // react-easy-crop passes (croppedArea in %, croppedAreaPixels in px).
  const onCropComplete = useCallback((pct: Area, px: Area) => {
    setArea({ x: pct.x / 100, y: pct.y / 100, w: pct.width / 100, h: pct.height / 100 });
    setPixels(px);
  }, []);

  async function confirm() {
    if (!area || !pixels) return;
    const preview = await getCroppedDataUrl(image, pixels);
    onConfirm(area, preview);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 p-4">
      <p className="pb-3 text-center text-sm font-bold uppercase tracking-[0.15em] text-white">
        Cadrez votre photo
      </p>
      <div className="relative flex-1">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div className="flex items-center gap-4 pt-4">
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
          aria-label="Zoom"
        />
        <button
          type="button"
          onClick={onCancel}
          className="border-2 border-white px-4 py-1 text-sm font-bold uppercase text-white hover:bg-white/10"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={confirm}
          className="border-2 border-white bg-white px-4 py-1 text-sm font-bold uppercase hover:bg-white/90"
        >
          Valider
        </button>
      </div>
    </div>
  );
}
