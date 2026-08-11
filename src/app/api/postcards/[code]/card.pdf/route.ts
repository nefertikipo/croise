import { loadPostcard } from "@/lib/postcards/serialize";
import { generatePostcardPdf, EmptyPostcardError } from "@/lib/postcard-pdf/generate-postcard";

/** PDF composition can exceed the default duration under load. */
export const maxDuration = 60;

/**
 * GET the print-ready card PDF (front grid + back). Gelato fetches this.
 * `?mode=self` prints a blank ruled back for a handwritten note; `?mode=direct`
 * (default) prints the typed message.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const card = await loadPostcard(code);
    if (!card) {
      return Response.json({ error: "Carte introuvable" }, { status: 404 });
    }

    const delivery = new URL(req.url).searchParams.get("mode") === "self" ? "self" : "direct";
    const pdf = await generatePostcardPdf(card, { delivery });
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
