import { db } from "@/db";
import { calendars } from "@/db/schema/calendars";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export type CalendarRecord = typeof calendars.$inferSelect;

export type CalendarAuthResult =
  | { ok: true; calendar: CalendarRecord }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Load a calendar by share code and decide whether this request may MUTATE it.
 * Same rule as books/cards: anonymous (ownerId null) is editable by anyone with
 * the code; owned only by its owner's session. GET stays public.
 */
export async function authorizeCalendarEdit(
  request: Request,
  code: string,
): Promise<CalendarAuthResult> {
  const [calendar] = await db.select().from(calendars).where(eq(calendars.code, code)).limit(1);
  if (!calendar) {
    return { ok: false, status: 404, error: "Calendrier introuvable" };
  }
  if (calendar.ownerId === null) {
    return { ok: true, calendar };
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return { ok: false, status: 401, error: "Non authentifié" };
  }
  if (session.user.id !== calendar.ownerId) {
    return { ok: false, status: 403, error: "Accès refusé" };
  }
  return { ok: true, calendar };
}
