import { pgTable, serial, text, integer, boolean, uuid, index } from "drizzle-orm/pg-core";
import { crosswords } from "@/db/schema/crosswords";

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
  clueText: text("clue_text").notNull(),
  isCustom: boolean("is_custom").notNull().default(false),
  /** JSON array of letter offsets where a multi-word answer breaks (e.g. [3]). */
  breaks: text("breaks"),
  /**
   * Chosen clue's difficulty at generation time: 1 = facile, 2 = moyen, 3 =
   * difficile. Null for custom/unscored clues, and null on rows generated before
   * this column existed (they show "—" until the grid is regenerated).
   */
  difficulty: integer("difficulty"),
}, (table) => [
  // every grid read fetches its words by crossword
  index("placed_words_crossword_id_idx").on(table.crosswordId),
]);
