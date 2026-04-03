import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const crosswords = pgTable("crosswords", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title"),
  language: text("language").notNull().default("en"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  gridPattern: text("grid_pattern").notNull(),
  gridSolution: text("grid_solution").notNull(),
  status: text("status").notNull().default("generating"),
  difficulty: integer("difficulty"),
  theme: text("theme"),
  vibe: text("vibe"),
  personalizationNotes: text("personalization_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});
