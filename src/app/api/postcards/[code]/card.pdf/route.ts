import { loadPostcard } from "@/lib/postcards/serialize";
import { generatePostcardPdf, EmptyPostcardError } from "@/lib/postcard-pdf/generate-postcard";

/** PDF composition can exceed the default duration under load. */
export const maxDuration = 60;

/** GET the print-ready card PDF (front grid + back message). Gelato fetches this. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const card = await loadPostcard(code);
    if (!card) {
      return Response.json({ error: "Carte introuvable" }, { status: 404 });
    }

    const pdf = await generatePostcardPdf(card);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="carte-${code}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof EmptyPostcardError) {
      return Response.json({ error: "Générez d'abord la grille de la carte." }, { status: 400 });
    }
    console.error("Postcard PDF generation failed:", err);
    return Response.json({ error: "Échec de la génération de la carte." }, { status: 500 });
  }
}
