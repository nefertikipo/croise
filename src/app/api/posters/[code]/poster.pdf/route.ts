import { loadPoster } from "@/lib/posters/serialize";
import { generatePosterPdf, EmptyPosterError } from "@/lib/poster-pdf/generate-poster";

/** Large-format PDF composition can exceed the default duration. */
export const maxDuration = 60;

/** GET the print-ready poster PDF for a crossword. Gelato fetches this. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const poster = await loadPoster(code);
    if (!poster) {
      return Response.json({ error: "Grille introuvable" }, { status: 404 });
    }
    const pdf = await generatePosterPdf(poster);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="poster-${code}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof EmptyPosterError) {
      return Response.json({ error: "Cette grille est vide." }, { status: 400 });
    }
    console.error("Poster PDF generation failed:", err);
    return Response.json({ error: "Échec de la génération du poster." }, { status: 500 });
  }
}
