import { pgTable, serial, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { crosswords } from "@/db/schema/crosswords";

export const books = pgTable("books", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  language: text("language").notNull().default("en"),
  dedicationText: text("dedication_text"),
  coverConfig: jsonb("cover_config"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
