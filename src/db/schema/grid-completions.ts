import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schema/auth";
import { crosswords } from "@/db/schema/crosswords";

/**
 * Leaderboard rows: one best completion time per (grid, user). We upsert on the
 * unique (crossword_id, user_id) index, keeping the fastest clean solve.
 *
 * `revealed` marks a solve where the player revealed a word or the whole puzzle
 * — not a pure solve, so it's excluded from the ranked board. `autocheck` marks
 * a solve completed with live error-checking on (kept, but flagged).
 */
export const gridCompletions = pgTable(
  "grid_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    crosswordId: uuid("crossword_id")
      .notNull()
      .references(() => crosswords.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    timeMs: integer("time_ms").notNull(),
    revealed: boolean("revealed").notNull().default(false),
    autocheck: boolean("autocheck").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("grid_completions_user_grid").on(t.crosswordId, t.userId)],
);
