import { pgTable, serial, text, integer, boolean, uuid } from "drizzle-orm/pg-core";
import { crosswords } from "@/db/schema/crosswords";
import { clueEntries } from "@/db/schema/clue-entries";

export const placedWords = pgTable("placed_words", {
  id: serial("id").primaryKey(),
  crosswordId: uuid("crossword_id")
    .notNull()
    .references(() => crosswords.id, { onDelete: "cascade" }),
  answer: text("answer").notNull(),
  direction: text("direction").notNull(),
  number: integer("number").notNull(),
  startRow: integer("start_row").notNull(),
  startCol: integer("start_col").notNull(),
  length: integer("length").notNull(),
  originalClueId: integer("original_clue_id").references(() => clueEntries.id),
  clueText: text("clue_text").notNull(),
  isCustom: boolean("is_custom").notNull().default(false),
});
