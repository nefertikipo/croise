import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Words table: one row per unique answer word per language.
 * This is the "dictionary" of crossword-valid words.
 */
export const words = pgTable(
  "words",
  {
    id: serial("id").primaryKey(),
    word: text("word").notNull(),
    length: integer("length").notNull(),
    language: text("language").notNull(), // "en" | "fr"
    /** Quality score 0-100. Higher = more crossword-worthy. */
    qualityScore: integer("quality_score").notNull().default(50),
    /** How often this word appears across all clue sources. */
    frequency: integer("frequency").notNull().default(1),
    /** Whether this word is valid for grid generation. */
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("words_word_lang_idx").on(table.word, table.language),
    index("words_length_idx").on(table.length),
    index("words_language_idx").on(table.language),
    index("words_quality_idx").on(table.qualityScore),
  ]
);

/**
 * Clues table: multiple clues per word, each with its own character.
 * The same word can have easy, hard, funny, classic clues.
 */
export const clues = pgTable(
  "clues",
  {
    id: serial("id").primaryKey(),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    /** The clue text itself. */
    clue: text("clue").notNull(),
    /** Language the clue is written in (usually matches word language). */
    language: text("language").notNull(),
    /**
     * Difficulty 1-5.
     * 1 = direct definition, obvious
     * 2 = straightforward but requires some knowledge
     * 3 = medium, some wordplay or cultural reference
     * 4 = tricky, misdirection or double meaning
     * 5 = cryptic, advanced wordplay
     */
    difficulty: integer("difficulty"),
    /**
     * Vibe/style of the clue.
     * classic = traditional crossword style
     * fun = witty, playful, modern
     * literary = references to books, art, philosophy
     * pop-culture = movies, TV, music, internet
     * geographic = places, countries, cities
     * science = science, tech, nature
     * wordplay = puns, anagrams, double meanings
     */
    vibe: text("vibe"),
    /**
     * Category/topic tags for filtering.
     * e.g. ["food", "french-cuisine"] or ["history", "wwii"]
     */
    tags: text("tags").array(),
    /** Where this clue came from. */
    source: text("source"),
    /** Year of publication (if from a published crossword). */
    year: integer("year"),
    /** Is this a user-contributed or AI-generated clue? */
    origin: text("origin").notNull().default("scraped"), // "scraped" | "user" | "ai"
    /** Quality flag: has this clue been validated? */
    verified: boolean("verified").notNull().default(false),
  },
  (table) => [
    index("clues_word_id_idx").on(table.wordId),
    index("clues_language_idx").on(table.language),
    index("clues_difficulty_idx").on(table.difficulty),
    index("clues_vibe_idx").on(table.vibe),
  ]
);

/**
 * Legacy compatibility: keep the flat view for the current generator.
 * We'll migrate the generator to use the new schema later.
 */
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
