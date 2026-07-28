/**
 * Editor-only preview handling for book photos.
 *
 * A book's config stores only `photoRef` (+ `crop`) for each photo — the
 * source of truth the print engine uses. The large base64 `imageUrl` preview
 * is editor-only and MUST NOT be persisted: it would inflate the row and, for
 * the cover, blow past the coverConfig size limit (so any later cover edit —
 * even a colour change — would fail to save). These helpers strip the preview
 * before saving and rebuild it from `photoRef` on load.
 */

import { getCroppedDataUrl } from "@/lib/crop-image";
import type { PageDesign } from "@/types/book";

/** Same-origin URL that streams the stored original for a ref (see the photo
 * serve route). Same-origin keeps the returned image canvas-clean for cropping. */
export function photoServeUrl(ref: string): string {
  return `/api/books/photo?ref=${encodeURIComponent(ref)}`;
}

/** Drop the (large, base64) editor-only preview so it is never persisted. */
export function stripDesignPreview<T extends PageDesign | undefined>(design: T): T {
  if (!design) return design;
  // Keep photoRef + crop (the print source of truth); omit the preview only.
  const rest = { ...design };
  delete rest.imageUrl;
  return rest as T;
}

/**
 * Rebuild the on-screen `imageUrl` preview from a design's `photoRef` (+ crop),
 * so a reloaded book still shows its photo without having stored a data URL.
 * Returns the design unchanged when it already has a preview or has no ref.
 */
export async function rehydrateDesignPreview(design: PageDesign): Promise<PageDesign> {
  if (design.imageUrl || !design.photoRef) return design;
  const src = photoServeUrl(design.photoRef);
  if (!design.crop) return { ...design, imageUrl: src };
  try {
    const dims = await imageSize(src);
    const { x, y, w, h } = design.crop;
    const imageUrl = await getCroppedDataUrl(src, {
      x: x * dims.width,
      y: y * dims.height,
      width: w * dims.width,
      height: h * dims.height,
    });
    return { ...design, imageUrl };
  } catch {
    // Cropping failed (missing photo, decode error) — fall back to the raw
    // original so the editor still shows something rather than a placeholder.
    return { ...design, imageUrl: src };
  }
}

function imageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}
