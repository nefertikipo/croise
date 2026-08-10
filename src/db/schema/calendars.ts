import { pgTable, text, integer, timestamp, uuid, index, unique } from "drizzle-orm/pg-core";
import { crosswords } from "@/db/schema/crosswords";
import { user } from "@/db/schema/auth";

/**
 * A "calendrier" — 12 monthly mots fléchés grids bound as an A3 wall calendar,
 * fulfilled through Gelato (see src/lib/gelato/product.ts). The heavyweight
 * sibling of the card: like the book it owns many grids, but keyed by month +
 * paired with each month's date grid at print time.
 */
export const calendars = pgTable("calendars", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  title: text("title"),
  /** The year the date grids are computed for. */
  year: integer("year").notNull(),
  /** Accent colour for the grids' clue cells (hex). Null = default blueprint. */
  gridColor: text("grid_color"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("calendars_owner_id_idx").on(table.ownerId),
]);

/**
 * One month slot of a calendar → the grid printed on that month's page. A month
 * has at most one grid (unique per calendar+month); regenerating replaces it.
 * set null on crossword delete so a missing grid degrades to "not generated".
 */
export const calendarMonths = pgTable("calendar_months", {
  id: uuid("id").defaultRandom().primaryKey(),
  calendarId: uuid("calendar_id")
    .notNull()
    .references(() => calendars.id, { onDelete: "cascade" }),
  /** 1 = January … 12 = December. */
  month: integer("month").notNull(),
  crosswordId: uuid("crossword_id").references(() => crosswords.id, {
    onDelete: "set null",
  }),
}, (table) => [
  index("calendar_months_calendar_id_idx").on(table.calendarId),
  unique("calendar_months_calendar_month_uq").on(table.calendarId, table.month),
]);
