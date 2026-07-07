import { pgTable, serial, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { crosswords } from "@/db/schema/crosswords";

export const books = pgTable("books", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  ownerId: uuid("owner_id"),
  title: text("title").notNull(),
  description: text("description"),
  language: text("language").notNull().default("en"),
  dedicationText: text("dedication_text"),
  coverConfig: jsonb("cover_config"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  crosswordId: uuid("crossword_id").references(() => crosswords.id),
  config: jsonb("config"),
});

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
