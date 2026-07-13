import { ingestPhoto, PhotoTooSmallError } from "@/lib/book-pdf/photo-ingest";

/** POST a photo (multipart `file`) → { photoRef, preview, width, height }. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
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
