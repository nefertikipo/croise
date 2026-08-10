import { loadCalendar } from "@/lib/calendars/serialize";
import { generateCalendarPdf, EmptyCalendarError } from "@/lib/calendar-pdf/generate-calendar";

/** A 13-page A3 composition can exceed the default duration. */
export const maxDuration = 120;

/** GET the print-ready calendar PDF (cover + month pages). Gelato fetches this. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const calendar = await loadCalendar(code);
    if (!calendar) {
      return Response.json({ error: "Calendrier introuvable" }, { status: 404 });
    }
    const pdf = await generateCalendarPdf(calendar);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="calendrier-${code}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof EmptyCalendarError) {
      return Response.json({ error: "Générez au moins une grille de mois." }, { status: 400 });
    }
    console.error("Calendar PDF generation failed:", err);
    return Response.json({ error: "Échec de la génération du calendrier." }, { status: 500 });
  }
}
