import { ingestPhoto, PhotoTooSmallError } from "@/lib/book-pdf/photo-ingest";

/** Anonymous-accessible on purpose: anonymous book creation is supported. */
const MAX_PHOTO_BYTES = 20 * 1024 * 1024; // 20 Mo
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/** Cheap magic-byte sniff for the accepted formats. */
function looksLikeAllowedImage(bytes: Buffer): boolean {
  if (bytes.length < 12) return false;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return true;
  }
  // WebP: RIFF....WEBP
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return true;
  }
  // HEIC/HEIF (ISO BMFF): "ftyp" box at offset 4
  if (bytes.toString("ascii", 4, 8) === "ftyp") return true;
  return false;
}

/** POST a photo (multipart `file`) → { photoRef, preview, width, height }. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return Response.json(
        { error: "La photo dépasse 20 Mo. Choisissez un fichier plus léger." },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: "Format non pris en charge. Utilisez une photo JPEG, PNG, WebP ou HEIC." },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > MAX_PHOTO_BYTES || !looksLikeAllowedImage(bytes)) {
      return Response.json(
        { error: "Ce fichier n'est pas une photo valide (JPEG, PNG, WebP ou HEIC)." },
        { status: 400 },
      );
    }
    const result = await ingestPhoto(bytes);
    return Response.json(result);
  } catch (err) {
    if (err instanceof PhotoTooSmallError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    console.error("Photo upload failed:", err);
    return Response.json({ error: "Echec de l'import de la photo." }, { status: 500 });
  }
}
