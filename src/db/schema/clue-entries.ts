import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * ⚠️ TWO SEPARATE CORPORA LIVE IN THIS FILE — SPLIT BY LANGUAGE, NOT BY "OLD vs NEW".
 *
 * `words` + `clues` = the FRENCH pipeline (the /fleche mots fléchés generator).
 *   Normalized, scored (familiarity + quality), ~83K words / ~476K clues. All `fr`.
 *
 * `clue_entries` = the ENGLISH pipeline (the /create mots croisés generator).
 *   Flat, unscored, ~341K English rows (+ a ~30K leftover French chunk). Mostly `en`.
 *
 * These are NOT two copies of the same data. `words` is French; `clue_entries` is
 * mostly English; they overlap by only ~36K strings, mostly by coincidence. Do NOT
 * "migrate clue_entries into words/clues and drop it" — that deletes the English corpus.
 * See docs/db-corpora.md for the full picture.
 */

/**
 * Words table: one row per unique answer word per language.
 * The FRENCH "dictionary" of crossword-valid words (currently 100% `fr`).
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
    /** Rough familiarity/commonness signal (0-1). */
    familiarity: real("familiarity"),
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
    /**
     * Flagged as a bad clue (describes a different word, or garbled) by the
     * scorer. Flag-not-delete: the row is kept but excluded from generation, so
     * a false-positive flag is reversible. See scripts/score-clues.ts.
     */
    badClue: boolean("bad_clue").notNull().default(false),
  },
  (table) => [
    index("clues_word_id_idx").on(table.wordId),
    index("clues_language_idx").on(table.language),
    index("clues_difficulty_idx").on(table.difficulty),
    index("clues_vibe_idx").on(table.vibe),
  ]
);

/**
 * ENGLISH corpus — the live data source for the /create mots croisés generator.
 *
 * NOT a legacy version of `words`/`clues` (those are French). This flat table holds
 * ~341K English clues (+ ~30K leftover French) and is unscored (no difficulty/vibe).
 * It stays until/unless the English pipeline is normalized into words/clues the way
 * French already is. Dropping it deletes the entire English corpus. See docs/db-corpora.md.
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
