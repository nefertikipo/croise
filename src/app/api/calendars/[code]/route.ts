import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { calendars } from "@/db/schema/calendars";
import { eq } from "drizzle-orm";
import { loadCalendar } from "@/lib/calendars/serialize";
import { authorizeCalendarEdit } from "@/lib/calendars/authorize";

/** GET the full calendar payload (12 month grids + meta). Public by code. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const calendar = await loadCalendar(code);
    if (!calendar) return NextResponse.json({ error: "Calendrier introuvable" }, { status: 404 });
    return NextResponse.json(calendar);
  } catch (error) {
    console.error("Calendar load error:", error);
    return NextResponse.json({ error: "Failed to load calendar" }, { status: 500 });
  }
}

const patchSchema = z.object({
  title: z.string().max(60).nullable().optional(),
  gridColor: z.string().max(20).nullable().optional(),
  year: z.number().int().min(2024).max(2100).optional(),
});

/** PATCH the calendar's meta (title, colour, year). */
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const authResult = await authorizeCalendarEdit(req, code);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    await db
      .update(calendars)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(calendars.id, authResult.calendar.id));
    return NextResponse.json(await loadCalendar(code));
  } catch (error) {
    console.error("Calendar update error:", error);
    return NextResponse.json({ error: "Failed to update calendar" }, { status: 500 });
  }
}

/** DELETE the calendar (month rows cascade; generated grids are left intact). */
export async function DELETE(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const authResult = await authorizeCalendarEdit(req, code);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    await db.delete(calendars).where(eq(calendars.id, authResult.calendar.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Calendar delete error:", error);
    return NextResponse.json({ error: "Failed to delete calendar" }, { status: 500 });
  }
}
