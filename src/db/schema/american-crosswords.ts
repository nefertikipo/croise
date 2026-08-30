import { pgTable, uuid, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import type { AmPuzzle } from "@/lib/crossword/american/types";

/**
 * American-style crosswords ("mots croisés"). Deliberately separate from the
 * fléchés `crosswords` table, whose grid encoding (`#` = in-grid blue clue cell)
 * is arrow-word-specific. Here the whole puzzle — cells (letters + numbers),
 * black blocks, and the two numbered clue lists — is stored as one JSONB blob,
 * so the solve page can rehydrate an `AmPuzzle` directly with no reconstruction.
 */
export const americanCrosswords = pgTable(
  "american_crosswords",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    // null = anonymous (generated without signing in)
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    title: text("title"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** Generation difficulty mode: facile | moyen | difficile | balanced. */
    difficulty: text("difficulty"),
    /** The full puzzle: { width, height, cells, across, down }. */
    puzzle: jsonb("puzzle").$type<AmPuzzle>().notNull(),
    status: text("status").notNull().default("ready"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("american_crosswords_owner_id_idx").on(t.ownerId)],
);

export type AmericanCrossword = typeof americanCrosswords.$inferSelect;
