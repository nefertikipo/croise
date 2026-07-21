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
 * FRENCH crossword corpus — the data behind the /fleche mots fléchés generator.
 *
 * `words` = one row per unique French answer, scored (familiarity, quality,
 *   known_score). `clues` = multiple clues per word, each with difficulty/vibe.
 *
 * (The old English `clue_entries` corpus and the /create mots croisés generator
 * were removed — the app is French-only. See docs/db-corpora.md for history.)
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
    /** Rough familiarity/commonness signal (0-1). Corpus-frequency based. */
    familiarity: real("familiarity"),
    /**
     * Recognizability 1-5: does an average French adult KNOW this word?
     * Judges recognition (Napoleon = 5 even though rare in text), NOT corpus
     * frequency. Populated by scripts/score-known.ts. 5 = everyone knows it,
     * 1 = obscure/specialist. See the LLM/AI Rules note in CLAUDE.md.
     */
    knownScore: integer("known_score"),
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
