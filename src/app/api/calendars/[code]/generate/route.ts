import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { calendars, calendarMonths } from "@/db/schema/calendars";
import { crosswords } from "@/db/schema/crosswords";
import { eq, and, count } from "drizzle-orm";
import { generateAndSaveGrid } from "@/lib/books/generate-grid";
import { authorizeCalendarEdit } from "@/lib/calendars/authorize";
import { loadCalendar } from "@/lib/calendars/serialize";
import { CALENDAR_GRID_WIDTH, CALENDAR_GRID_HEIGHT, MONTHS_FR } from "@/lib/calendar-pdf/geometry";

// A 15×11 grid with custom words can take a while; give it the full budget.
export const maxDuration = 300;

const requestSchema = z.object({
  month: z.number().int().min(1).max(12),
  customClues: z
    .array(z.object({ answer: z.string().min(1).max(20), clue: z.string().max(120) }))
    .max(8)
    .default([]),
  difficulty: z.enum(["facile", "moyen", "difficile", "balanced"]).optional(),
});

/** Generate (or regenerate) one month's grid and attach it to the calendar. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const authResult = await authorizeCalendarEdit(req, code);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    const { month, customClues, difficulty } = parsed.data;
    const calendarId = authResult.calendar.id;

    const result = await generateAndSaveGrid({
      width: CALENDAR_GRID_WIDTH,
      height: CALENDAR_GRID_HEIGHT,
      title: `${MONTHS_FR[month - 1]}${authResult.calendar.title ? ` — ${authResult.calendar.title}` : ""}`,
      customClues,
      usedClues: new Set(),
      usedWords: new Set(),
      difficulty,
    });
    if (!result) {
      return NextResponse.json(
        { error: "Impossible de générer la grille. Essayez avec moins de mots personnalisés." },
        { status: 500 },
      );
    }

    // Replace this month's grid (upsert on calendar+month), dropping the old one.
    const [existing] = await db
      .select({ crosswordId: calendarMonths.crosswordId })
      .from(calendarMonths)
      .where(and(eq(calendarMonths.calendarId, calendarId), eq(calendarMonths.month, month)))
      .limit(1);

    await db
      .insert(calendarMonths)
      .values({ calendarId, month, crosswordId: result.crosswordId })
      .onConflictDoUpdate({
        target: [calendarMonths.calendarId, calendarMonths.month],
        set: { crosswordId: result.crosswordId },
      });

    if (existing?.crosswordId && existing.crosswordId !== result.crosswordId) {
      await db.delete(crosswords).where(eq(crosswords.id, existing.crosswordId));
    }

    // Mark ready once all 12 months are generated.
    const [{ n }] = await db
      .select({ n: count() })
      .from(calendarMonths)
      .where(eq(calendarMonths.calendarId, calendarId));
    await db
      .update(calendars)
      .set({ status: Number(n) >= 12 ? "ready" : "draft", updatedAt: new Date() })
      .where(eq(calendars.id, calendarId));

    return NextResponse.json(await loadCalendar(code));
  } catch (error) {
    console.error("Calendar grid generation error:", error);
    return NextResponse.json({ error: "Failed to generate calendar grid" }, { status: 500 });
  }
}
