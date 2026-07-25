/**
 * Client-side helper for the book photo upload endpoint, shared by the cover
 * studio, the design picker and the photo-page editor. Throws an `Error` whose
 * message is the server's French error (or a generic fallback) so callers can
 * surface it directly.
 */

export interface UploadedPhoto {
  /** Storage ref of the full-resolution original, used by the print engine. */
  photoRef: string;
  /** Small preview data URL for the editor. */
  preview: string;
}

export async function uploadBookPhoto(file: File): Promise<UploadedPhoto> {
  const body = new FormData();
  body.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/books/upload-photo", { method: "POST", body });
  } catch {
    throw new Error("Echec de l'import de la photo.");
  }

  const data = (await res.json().catch(() => null)) as {
    photoRef?: string;
    preview?: string;
    error?: string;
  } | null;

  if (!res.ok || !data?.photoRef || !data?.preview) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Echec de l'import de la photo.",
    );
  }
  return { photoRef: data.photoRef, preview: data.preview };
}
