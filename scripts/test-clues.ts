import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { clueEntries } from "../src/db/schema/clue-entries";
import { eq, sql } from "drizzle-orm";
import "dotenv/config";

async function main() {
  const db = drizzle(neon(process.env.DATABASE_URL!));

  const testWords = ["OREO", "AREA", "ERIE", "ALOE", "EDEN", "ELATE", "ATONE", "IMOUT", "ADDED", "CELLS", "NAMED"];
  for (const word of testWords) {
    const result = await db.select().from(clueEntries).where(eq(clueEntries.answer, word)).limit(1);
    console.log(word + ":", result.length > 0 ? result[0].clue : "NOT FOUND");
  }

  const [count] = await db.select({ count: sql`count(*)` }).from(clueEntries);
  console.log("\nTotal clues:", count.count);
}

main();
