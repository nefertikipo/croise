/**
 * One-off: append Jeanne's + Gabby's clue ideas to "Elise's 25th" (BOOK-81KFPU).
 * Skips ideas already present (matched on answer AND clue), so re-running is
 * safe. A same-answer row with a *different* clue is treated as a new
 * alternative idea and appended (the notepad already holds several such
 * duplicates: GTT, Annecy, Step, Milkshake).
 *
 * Dry-run by default. Pass --apply to write.
 *   set -a; source .env.local; set +a
 *   pnpm tsx scripts/import-elise-jeanne-gabby.mts          # preview
 *   pnpm tsx scripts/import-elise-jeanne-gabby.mts --apply  # write
 */
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const CODE = "BOOK-81KFPU";
const APPLY = process.argv.includes("--apply");

function normAns(s: string): string {
  return s
    .replace(/œ/g, "oe").replace(/Œ/g, "OE")
    .replace(/æ/g, "ae").replace(/Æ/g, "AE")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z]/g, "");
}

// First 16 alphanumerics of a clue, accent-folded, for same-clue matching.
function clueFp(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
}

// [answer, clue, category, author]. Blank = "". Accents/capitalization lightly
// cleaned for print; wording kept as contributed.
const ROWS: [string, string, string, string][] = [
  ["Tournette", "Sommet d’Annecy", "Général", "Jeanne"],
  ["Heated Rivalry", "hot hot & gay", "Général", "Jeanne"],
  ["Madeleine", "Gâteau ou l’enfer à vélo ?", "Général", "Jeanne"],
  ["Carnivore", "Une phase alimentaire mystique de Mr Greg", "Général", "Jeanne"],
  ["Batterie", "Morte gelée lors du fameux ski trip de 2021", "LSE", "Jeanne"],
  ["NFT", "Un mémoire LSE sur les quoi ??", "LSE", "Jeanne"],
  ["Ampoules", "Elise en rando les nommerait comme son nemesis", "Général", "Jeanne"],
  ["Lyon", "Ville étape, ville de bugnes", "Général", "Jeanne"],
  ["Fatal Bazooka", "Chanteur préféré direct de la Savoie", "Fasny", "Gabby"],
  ["Bayonne", "Rouge et blanc", "Fasny", "Gabby"],
  ["Banane", "Le fruit où tu as tout appris", "Fasny", "Gabby"],
  ["Pouce", "Ton geste iconique qui dit que tu t’en fous", "Fasny", "Gabby"],
  ["Kaïra", "Il y a une fausse ___ parmi nous…", "Fasny", "Gabby"],
  ["Français", "L’accent que tu prends en anglais avec des inconnus", "Fasny", "Gabby"],
  ["Levrette", "Alors raclette ou _____ ?", "Fasny", "Gabby"],
  ["Experience", "Ton choix à la place d’une engagement ring", "Fasny", "Gabby"],
  ["Babouches", "Elles ne brillent qu’à Paris", "", ""],
  // Included for completeness; already in the notepad, so they'll be skipped.
  ["Potentiel", "Futur licorne partie trop tôt", "", ""],
  ["Ciment", "Repas du triathlète", "", ""],
];

type Idea = { id: string; answer: string; clue: string; category?: string; author?: string };

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const [book] = await sql`SELECT id, clue_ideas FROM books WHERE code = ${CODE}`;
  if (!book) throw new Error(`Book ${CODE} not found`);

  const existing: Idea[] = (book.clue_ideas ?? []).map((i: Idea) => ({ ...i }));

  const newIdeas: Idea[] = [];
  const skipped: string[] = [];

  for (const [answer, clue, rawCat, rawAuthor] of ROWS) {
    const key = normAns(answer);
    const fp = clueFp(clue);
    const dupe = existing.find((e) => normAns(e.answer) === key && clueFp(e.clue) === fp);
    if (dupe) {
      skipped.push(`${answer} — "${clue}" (already in notepad)`);
      continue;
    }
    const idea: Idea = { id: randomUUID(), answer, clue };
    const category = rawCat.trim();
    const author = rawAuthor.trim();
    if (category) idea.category = category;
    if (author) idea.author = author;
    existing.push(idea);
    newIdeas.push(idea);
  }

  console.log(`Existing ideas: ${(book.clue_ideas ?? []).length}`);
  console.log(`\nNEW (${newIdeas.length}):`);
  for (const i of newIdeas)
    console.log(`  + [${i.category ?? "—"}/${i.author ?? "—"}] ${i.answer} — ${i.clue}`);
  console.log(`\nSKIPPED (${skipped.length}):`);
  for (const s of skipped) console.log(`  = ${s}`);
  console.log(`\nFinal total: ${existing.length}`);

  if (!APPLY) {
    console.log("\n(dry-run — pass --apply to write)");
    return;
  }
  await sql`UPDATE books SET clue_ideas = ${JSON.stringify(existing)}::jsonb, updated_at = now() WHERE id = ${book.id}`;
  console.log("\n✓ Written.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
