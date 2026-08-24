import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as frenchCorpus from "@/db/schema/clue-entries";
import * as crosswords from "@/db/schema/crosswords";
import * as placedWords from "@/db/schema/placed-words";
import * as books from "@/db/schema/books";
import * as postcards from "@/db/schema/postcards";
import * as calendars from "@/db/schema/calendars";
import * as auth from "@/db/schema/auth";
import * as leads from "@/db/schema/leads";
import * as gridCompletions from "@/db/schema/grid-completions";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, {
  schema: {
    ...frenchCorpus,
    ...crosswords,
    ...placedWords,
    ...books,
    ...postcards,
    ...calendars,
    ...auth,
    ...leads,
    ...gridCompletions,
  },
});
