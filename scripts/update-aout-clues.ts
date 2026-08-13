/**
 * Apply user-rewritten filler clues to an existing grid, matched by answer.
 *   set -a; source .env.local; set +a
 *   CODE=XWRD-TJCJEPAD pnpm tsx scripts/update-aout-clues.ts
 */
import "dotenv/config";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { and, eq } from "drizzle-orm";
import { normalizeClueText } from "@/lib/crossword/normalize";

const CODE = process.env.CODE || "XWRD-TJCJEPAD";

// answer → new clue (user-authored). Blank fillers keep their existing clue.
const NEW_CLUES: Record<string, string> = {
  ALLAI: "Me rendai (j')",
  ALLO: "Stupeur de Nabilla",
  BALLANTE: "Elle oscille",
  BAT: "Man de Gotham",
  BATACLAN: "Tragique salle de spectacle parisienne",
  BIO: "C'est tout naturel",
  BOB: "Goodies du Tour de France",
  CALOGERO: "Il est en apesanteur",
  CARICATURAL: "Abusé",
  ESSAIS: "Points au rugby",
  GAGAS: "Comme des grands-parents",
  GEL: "Fixation béton",
  GIT: "Il versionne pour les développeurs",
  ISRAEL: "Adversaire de la Palestine",
  LAC: "L'ane y a bu l'eau",
  LEAR: "Royal personnage",
  LEO: "C'est un signe !",
  LOOFA: "Eponge naturelle",
  MELUN: "Elle produit du brie",
  MOU: "Le ventre peut l'être",
  NUE: "Au naturel",
  OU: "Présente une option",
  SEL: "La baleine en vend",
  SERRA: "Comprima",
  SPA: "Lieu de massage",
  TAU: "Dix-neuvième grecque",
  TOI: "+ moi + tous ceux qui le veulent",
  TUT: "Bruit d'un klaxon",
  UNO: "Jeu édité par Mattel",
  UT: "Note ancienne",
  VIF: "Il est d'or chez les sorciers",
};

async function main() {
  const [c] = await db.select().from(crosswords).where(eq(crosswords.code, CODE));
  if (!c) throw new Error(`No crossword with code ${CODE}`);

  let updated = 0;
  const notFound: string[] = [];
  for (const [answer, clue] of Object.entries(NEW_CLUES)) {
    const res = await db
      .update(placedWords)
      .set({ clueText: normalizeClueText(clue) })
      .where(and(eq(placedWords.crosswordId, c.id), eq(placedWords.answer, answer)))
      .returning({ id: placedWords.id });
    if (res.length === 0) notFound.push(answer);
    else updated += res.length;
  }

  console.log(`Updated ${updated} clue(s) on ${CODE}.`);
  if (notFound.length) console.log(`NOT FOUND (skipped): ${notFound.join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
