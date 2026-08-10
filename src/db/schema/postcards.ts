import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { crosswords } from "@/db/schema/crosswords";
import { user } from "@/db/schema/auth";

/**
 * A "carte" — a single personalized mots fléchés grid printed on a flat A6
 * postcard and mailed as a gift. The lightweight sibling of the book: one grid
 * (the front) + a personal message (the back), fulfilled through Gelato's card
 * catalog (see src/lib/gelato/product.ts) rather than Lulu (book-only).
 *
 * The grid itself lives in `crosswords` (generated + scored by the same fléchés
 * pipeline as /fleche and the book). A postcard just points at one crossword and
 * carries the card-specific personalization: recipient, message, accent colour.
 */
export const postcards = pgTable("postcards", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  // Owner when created while signed in; null for anonymous cards.
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  // The grid printed on the front. set null (not cascade): serialization treats
  // a null crosswordId as "not ready", so a deleted crossword degrades to a
  // draft rather than erroring — matches the book_pages policy.
  crosswordId: uuid("crossword_id").references(() => crosswords.id, {
    onDelete: "set null",
  }),
  // Front title band, e.g. "Joyeux anniversaire". Falls back to a default.
  title: text("title"),
  // Who the card is for — printed on the back with the message.
  recipientName: text("recipient_name"),
  // The personal note printed on the back.
  message: text("message"),
  // Maker's chosen typeface for the message (a DedicationFontKey, shared with
  // the book dedication). Null falls back to the default at render time.
  messageFont: text("message_font"),
  // Accent colour for the grid's clue cells (hex). Null = default blueprint.
  gridColor: text("grid_color"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // "my cards" listing filters on owner
  index("postcards_owner_id_idx").on(table.ownerId),
]);
