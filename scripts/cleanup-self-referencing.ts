/**
 * Delete clues that contain their own answer word.
 * e.g. "LUTTER CONTRE" for LUTTER, "BENEFICIE D'UNE PENSION" for BENEFICIE
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  // Count
  const count = await sql`
    SELECT COUNT(*) as count
    FROM clues c
    JOIN words w ON c.word_id = w.id
    WHERE UPPER(c.clue) LIKE '%' || w.word || '%'
  `;
  console.log("Self-referencing clues found:", count[0].count);

  // Sample
  const samples = await sql`
    SELECT w.word, c.clue
    FROM clues c
    JOIN words w ON c.word_id = w.id
    WHERE UPPER(c.clue) LIKE '%' || w.word || '%'
    ORDER BY RANDOM()
    LIMIT 15
  `;
  console.log("\nSamples:");
  for (const s of samples) {
    console.log(`  ${s.word} → "${s.clue}"`);
  }

  // Delete
  const deleted = await sql`
    DELETE FROM clues
    WHERE id IN (
      SELECT c.id
      FROM clues c
      JOIN words w ON c.word_id = w.id
      WHERE UPPER(c.clue) LIKE '%' || w.word || '%'
    )
  `;
  console.log("\nDeleted:", count[0].count, "self-referencing clues");
}

main().catch(console.error);
