import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { calendars, calendarMonths } from "@/db/schema/calendars";
import { generateCalendarCode, retryOnUniqueViolation } from "@/lib/code";
import { auth } from "@/lib/auth";
import { eq, desc, count } from "drizzle-orm";

const requestSchema = z.object({
  title: z.string().max(60).optional(),
  year: z.number().int().min(2024).max(2100),
  gridColor: z.string().max(20).optional(),
});

/** List the signed-in user's calendars (with how many months are generated). */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const ownerId = session?.user.id ?? null;
    if (!ownerId) return NextResponse.json({ calendars: [] });

    const rows = await db
      .select({ id: calendars.id, code: calendars.code, title: calendars.title, year: calendars.year, status: calendars.status })
      .from(calendars)
      .where(eq(calendars.ownerId, ownerId))
      .orderBy(desc(calendars.createdAt));

    const withCounts = await Promise.all(
      rows.map(async (r) => {
        const [{ n }] = await db
          .select({ n: count() })
          .from(calendarMonths)
          .where(eq(calendarMonths.calendarId, r.id));
        return { code: r.code, title: r.title, year: r.year, status: r.status, monthCount: Number(n) };
      }),
    );

    return NextResponse.json({ calendars: withCounts });
  } catch (error) {
    console.error("Calendar list error:", error);
    return NextResponse.json({ error: "Failed to list calendars" }, { status: 500 });
  }
}

/** Create a draft calendar. Anonymous is allowed (editable by code). */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const ownerId = session?.user.id ?? null;

    const body = await request.json().catch(() => ({}));
    const result = requestSchema.safeParse(body ?? {});
    if (!result.success) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    const parsed = result.data;

    const id = crypto.randomUUID();
    const code = await retryOnUniqueViolation(async () => {
      const freshCode = generateCalendarCode();
      await db.insert(calendars).values({
        id,
        code: freshCode,
        ownerId,
        title: parsed.title,
        year: parsed.year,
        gridColor: parsed.gridColor,
        status: "draft",
      });
      return freshCode;
    });

    return NextResponse.json({ id, code });
  } catch (error) {
    console.error("Calendar creation error:", error);
    return NextResponse.json({ error: "Failed to create calendar" }, { status: 500 });
  }
}
