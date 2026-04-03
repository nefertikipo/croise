import { pgTable, serial, text, integer, index } from "drizzle-orm/pg-core";

export const clueEntries = pgTable(
  "clue_entries",
  {
    id: serial("id").primaryKey(),
    answer: text("answer").notNull(),
    answerLength: integer("answer_length").notNull(),
    clue: text("clue").notNull(),
    language: text("language").notNull().default("en"),
    source: text("source"),
    difficulty: integer("difficulty"),
    year: integer("year"),
    tags: text("tags").array(),
  },
  (table) => [
    index("clue_answer_idx").on(table.answer),
    index("clue_length_idx").on(table.answerLength),
    index("clue_language_idx").on(table.language),
  ]
);
