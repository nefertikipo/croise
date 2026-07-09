import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Email leads — currently the monthly-gift launch waitlist (/offrir). `source`
 * records where the email came from (e.g. "offrir-waitlist") for segmentation.
 * Note: the free printable grids are NOT gated; they advertise the site on the
 * sheet instead of collecting emails.
 */
export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
