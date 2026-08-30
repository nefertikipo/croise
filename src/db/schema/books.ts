import { pgTable, serial, text, integer, timestamp, uuid, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { crosswords } from "@/db/schema/crosswords";
import { user } from "@/db/schema/auth";

export const books = pgTable("books", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  // Owner when created while signed in; null for anonymous books.
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  language: text("language").notNull().default("en"),
  dedicationText: text("dedication_text"),
  // Maker's chosen typeface for the dedication message (a DedicationFontKey).
  // Null falls back to the default (Fraunces) at render time.
  dedicationFont: text("dedication_font"),
  // Free-text signature for the opening page ("Avec tout notre amour, …").
  // Null/empty falls back to the contributor names from the clue-idea notepad.
  dedicationSignature: text("dedication_signature"),
  // Free-text sign-off line above the signature ("Avec tout notre amour,").
  // Null/empty falls back to a default keyed on the number of contributors.
  dedicationSignoff: text("dedication_signoff"),
  coverConfig: jsonb("cover_config"),
  // Design-time notepad: brainstormed clue ideas (answer + clue) the maker can
  // drop into any grid. Not a printed section — a workspace. Typed as `ClueIdea[]`.
  clueIdeas: jsonb("clue_ideas"),
  // When true, anyone holding the share code may append clue ideas via the
  // public /participer/[code] page (credited as ClueIdea.author). The owner
  // opts in explicitly from the editor; defaults off so a code alone never lets
  // strangers write into an owned book.
  contributionsEnabled: boolean("contributions_enabled").notNull().default(false),
  status: text("status").notNull().default("draft"),
  // When we last emailed the owner a "finish your book" reminder (null = never).
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // "my books" listing filters on owner
  index("books_owner_id_idx").on(table.ownerId),
]);

/**
 * The ordered spine of a book: grid pages and content pages interleaved.
 * Replaces the old grids-only `book_crosswords` table.
 * - kind "grid": `crosswordId` is set, `config` holds per-book grid styling.
 * - kind "content": `crosswordId` is null, `config` holds the page content.
 * Cover, dedication, word index and solutions are derived sections, not rows.
 */
export const bookPages = pgTable("book_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookId: uuid("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  kind: text("kind").notNull(),
  // set null (not restrict/cascade): serialization already treats a null
  // crosswordId as "nothing to render" and drops the page, so a crossword
  // deleted out from under a page degrades gracefully instead of erroring.
  crosswordId: uuid("crossword_id").references(() => crosswords.id, {
    onDelete: "set null",
  }),
  config: jsonb("config"),
}, (table) => [
  // every spine read/update filters on the owning book
  index("book_pages_book_id_idx").on(table.bookId),
]);

/**
 * @deprecated Legacy grids-only ordering. Superseded by `bookPages`.
 * Kept as a table definition only so old data can be migrated if needed.
 */
export const bookCrosswords = pgTable("book_crosswords", {
  id: serial("id").primaryKey(),
  bookId: uuid("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  crosswordId: uuid("crossword_id")
    .notNull()
    .references(() => crosswords.id),
  position: integer("position").notNull(),
});
