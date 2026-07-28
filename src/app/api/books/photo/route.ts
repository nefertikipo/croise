import { getOriginal, MissingPhotoError } from "@/lib/book-pdf/photo-store";

/**
 * Serve a stored book photo by its `ref` (see photo-store.ts), same-origin so
 * the editor can canvas-crop it for previews without CORS taint. Only the
 * editor's on-screen preview needs this; print resolves refs server-side.
 *
 * We NEVER persist the (large, base64) preview data URL in a book's config —
 * that would blow past the coverConfig size limit — so the editor rehydrates
 * previews from this endpoint on load.
 */

/** Guard against SSRF: only serve our own local refs or Vercel Blob URLs. */
function isAllowedRef(ref: string): boolean {
  if (ref.startsWith("local:")) {
    // A UUID filename with a safe extension — no path traversal.
    return /^local:[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/.test(ref);
  }
  try {
    const url = new URL(ref);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref");
  if (!ref || !isAllowedRef(ref)) {
    return Response.json({ error: "Référence de photo invalide." }, { status: 400 });
  }
  try {
    const bytes = await getOriginal(ref);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        // Immutable content (refs are content-addressed); cache privately.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    if (err instanceof MissingPhotoError) {
      return Response.json({ error: "Photo introuvable." }, { status: 404 });
    }
    console.error("Photo serve failed:", err);
    return Response.json({ error: "Echec du chargement de la photo." }, { status: 500 });
  }
}
