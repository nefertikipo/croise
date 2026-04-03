import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as clueEntries from "@/db/schema/clue-entries";
import * as crosswords from "@/db/schema/crosswords";
import * as placedWords from "@/db/schema/placed-words";
import * as books from "@/db/schema/books";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, {
  schema: {
    ...clueEntries,
    ...crosswords,
    ...placedWords,
    ...books,
  },
});
