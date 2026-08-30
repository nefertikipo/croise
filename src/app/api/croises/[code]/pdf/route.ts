import { eq } from "drizzle-orm";
import { db } from "@/db";
import { americanCrosswords } from "@/db/schema/american-crosswords";
import {
  generateCrosswordPdf,
  type CrosswordPdfMode,
} from "@/lib/crossword-pdf/draw-crossword";

/** PDF composition can exceed the default duration under load. */
export const maxDuration = 60;

/**
 * GET the print-ready crossword PDF. `?mode=puzzle` (grid + clues, no answers),
 * `?mode=solution` (filled grid), default `both` (puzzle page + solution page).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const [row] = await db
      .select()
      .from(americanCrosswords)
      .where(eq(americanCrosswords.code, code))
      .limit(1);

    if (!row) {
      return Response.json({ error: "Grille introuvable" }, { status: 404 });
    }

    const modeParam = new URL(req.url).searchParams.get("mode");
    const mode: CrosswordPdfMode =
      modeParam === "puzzle" || modeParam === "solution" ? modeParam : "both";

    const pdf = await generateCrosswordPdf(row.puzzle, {
      title: row.title ?? "Mots croisés",
      code: row.code,
      mode,
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="mots-croises-${code}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Crossword PDF generation failed:", err);
    return Response.json({ error: "Échec de la génération du PDF." }, { status: 500 });
  }
}
