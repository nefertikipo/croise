import { db } from "@/db";
import { calendars, calendarMonths } from "@/db/schema/calendars";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq, inArray, asc } from "drizzle-orm";
import { reconstructCells } from "@/lib/crossword/reconstruct-cells";
import type { CalendarData, CalendarMonthGrid } from "@/types/calendar";

/** Full calendar payload for GET /api/calendars/[code]. Null if not found. */
export async function loadCalendar(code: string): Promise<CalendarData | null> {
  const [cal] = await db.select().from(calendars).where(eq(calendars.code, code)).limit(1);
  if (!cal) return null;

  const monthRows = await db
    .select()
    .from(calendarMonths)
    .where(eq(calendarMonths.calendarId, cal.id))
    .orderBy(asc(calendarMonths.month));

  const crosswordIds = monthRows
    .map((m) => m.crosswordId)
    .filter((id): id is string => id !== null);

  // Batch-load the month grids + their words (two queries, not two per month).
  const gridById = new Map<string, typeof crosswords.$inferSelect>();
  const wordsById = new Map<string, (typeof placedWords.$inferSelect)[]>();
  if (crosswordIds.length > 0) {
    const grids = await db.select().from(crosswords).where(inArray(crosswords.id, crosswordIds));
    for (const g of grids) gridById.set(g.id, g);
    const words = await db
      .select()
      .from(placedWords)
      .where(inArray(placedWords.crosswordId, crosswordIds));
    for (const w of words) {
      const list = wordsById.get(w.crosswordId) ?? [];
      list.push(w);
      wordsById.set(w.crosswordId, list);
    }
  }

  const months: CalendarMonthGrid[] = [];
  for (const m of monthRows) {
    if (!m.crosswordId) continue;
    const grid = gridById.get(m.crosswordId);
    if (!grid) continue;
    months.push({
      month: m.month,
      code: grid.code,
      width: grid.width,
      height: grid.height,
      cells: reconstructCells(grid, wordsById.get(grid.id) ?? []),
    });
  }

  return {
    code: cal.code,
    title: cal.title,
    year: cal.year,
    gridColor: cal.gridColor,
    months,
  };
}
