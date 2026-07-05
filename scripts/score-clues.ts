/**
 * Score French clue difficulty + flag genuinely-bad clues, via the Vercel AI
 * Gateway (Sonnet). Bills the AI_GATEWAY_API_KEY, NOT a Claude subscription.
 *
 * Design decisions (see the scoring-data-state memory):
 *  - FLAG, don't delete. Sets clues.difficulty and clues.bad_clue. Nothing is
 *    destroyed, so a false-positive flag is reversible and costs nothing.
 *  - Corrected badClue definition: only flag a clue that clearly describes a
 *    DIFFERENT word or is garbled. Wordplay, puns, antonym clues, and clues that
 *    fit an accented/homograph form (mots fléchés strips accents: LUXE = luxé)
 *    are VALID and must NOT be flagged.
 *  - Prompt caching on the instructions+examples prefix (stable across batches).
 *  - Most-recognizable words first (familiarity DESC). Resumable: it only pulls
 *    rows where difficulty IS NULL, so re-running continues where it stopped.
 *
 * Usage:
 *   pnpm tsx scripts/score-clues.ts --limit 300      # small validation run
 *   pnpm tsx scripts/score-clues.ts                  # full remainder
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { generateText, Output } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const MODEL = "anthropic/claude-sonnet-4.6";
const BATCH_SIZE = 40; // clues per API call
const CONCURRENCY = 5; // parallel API calls
const FETCH_SIZE = 2000;

const clueSchema = z.object({
  clueId: z.number(),
  difficulty: z.number().min(1).max(3),
  badClue: z.boolean(),
});
type Score = z.infer<typeof clueSchema>;

const SYSTEM_PROMPT = `Tu es un expert en mots fléchés français. Pour chaque paire mot→indice, donne difficulty (1/2/3) et badClue (true/false).

difficulty — EN CAS DE DOUTE, SCORE PLUS HAUT. Combine la rareté du MOT et le caractère détourné de l'INDICE :
- 1 = facile : mot courant + indice direct (définition/synonyme évident, ou référence très populaire). Ex : ANE→"animal têtu", REINE→"épouse de roi", NON→"refus".
- 2 = moyen : demande un peu de réflexion, un jeu de mots simple, ou de la culture générale. Ex : ROULOTTE→"home libre", MEMBRE→"il a la carte du parti".
- 3 = difficile : jeu de mots complexe, référence spécifique, mot rare/technique, ou indice très détourné. Ex : AUDIENCE→"trafic", TOMBE→"place d'orchestre", ETNA→"grande et chaude gueule".

badClue = true UNIQUEMENT si l'indice décrit clairement un AUTRE mot que la réponse, ou s'il est incompréhensible/incohérent. Exemples de VRAIS badClue : EAUX→"nœud coulant" (c'est LACS), SERVEUR→"jeune mâle", LEGAL→"enregistrement de données" (c'est SAISIE), CHACUNE→"toute personne en personne parmi les personnes" (charabia).

badClue = false (NE PAS flaguer) dans TOUS ces cas — ce sont des indices VALIDES :
- Indice difficile, obscur, ou très détourné mais correct → difficulty 3, badClue false.
- Jeu de mots ou calembour. Ex : MARIN→"ouvrier du bâtiment" (bâtiment = navire) = VALIDE.
- Indice par antonyme : "point accessoire" pour ESSENTIEL, "point arbitraire" pour LEGAL = VALIDE.
- L'indice correspond à une forme ACCENTUÉE/homographe de la réponse. Les mots fléchés SUPPRIMENT les accents : LUXE peut être LUXÉ. Donc "démis"/"déplacé"/"foulé" pour LUXE = VALIDE. Considère toujours les formes accentuées avant de flaguer.
- Référence culturelle/philosophique correcte. Ex : "ce n'est pas un accident" pour ESSENTIEL (essence vs accident) = VALIDE.

En cas de doute sur badClue, mets false (on garde l'indice).`;

async function loadExamples(): Promise<string> {
  const rows = await sql`
    SELECT w.word, c.clue, c.difficulty
    FROM clues c JOIN words w ON c.word_id = w.id
    WHERE c.difficulty IS NOT NULL AND c.verified = true AND c.language = 'fr'
    ORDER BY c.id LIMIT 120`;
  const lines = rows.map((r) => {
    const d = ["", "facile", "moyen", "difficile"][r.difficulty as number];
    return `${r.word} → "${r.clue}" → ${d}`;
  });
  return `Exemples calibrés par un humain (difficulté) :\n${lines.join("\n")}`;
}

async function scoreBatch(
  cachedPrefix: string,
  pairs: { id: number; word: string; clue: string }[],
): Promise<Score[]> {
  const userPrompt = `Classifie ces ${pairs.length} paires. Retourne un tableau JSON {clueId, difficulty, badClue} :\n${pairs
    .map((p) => `[id:${p.id}] ${p.word} → "${p.clue}"`)
    .join("\n")}`;

  const { output } = await generateText({
    model: gateway(MODEL),
    output: Output.array({ element: clueSchema }),
    maxRetries: 3,
    messages: [
      {
        role: "system",
        content: cachedPrefix,
        // Cache the stable instructions+examples prefix across all batches.
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
      { role: "user", content: userPrompt },
    ],
  });
  return output ?? [];
}

async function saveScores(scores: Score[]): Promise<number> {
  if (scores.length === 0) return 0;
  const ids = scores.map((s) => s.clueId);
  const diffs = scores.map((s) => s.difficulty);
  const bad = scores.map((s) => s.badClue);
  await sql`
    UPDATE clues c SET difficulty = v.diff, bad_clue = v.bad
    FROM (SELECT UNNEST(${ids}::int[]) AS id, UNNEST(${diffs}::int[]) AS diff, UNNEST(${bad}::bool[]) AS bad) v
    WHERE c.id = v.id`;
  return scores.length;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  const [{ n: total }] = await sql`
    SELECT COUNT(*)::int n FROM clues WHERE language='fr' AND difficulty IS NULL`;
  console.log(`Unlabeled fr clues: ${total}. Target this run: ${limit === Infinity ? "all" : limit}`);

  const cachedPrefix = `${SYSTEM_PROMPT}\n\n${await loadExamples()}`;
  let scored = 0,
    flagged = 0;

  while (scored < limit) {
    const rows = await sql`
      SELECT c.id, w.word, c.clue
      FROM clues c JOIN words w ON c.word_id = w.id
      WHERE c.difficulty IS NULL AND c.language = 'fr'
      ORDER BY w.familiarity DESC, w.frequency DESC, c.id
      LIMIT ${FETCH_SIZE}`;
    if (rows.length === 0) break;

    const batches: { id: number; word: string; clue: string }[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(
        rows.slice(i, i + BATCH_SIZE).map((r) => ({
          id: r.id as number,
          word: r.word as string,
          clue: r.clue as string,
        })),
      );
    }

    for (let i = 0; i < batches.length && scored < limit; i += CONCURRENCY) {
      const group = batches.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        group.map((b) => scoreBatch(cachedPrefix, b)),
      );
      for (const r of results) {
        if (r.status === "rejected") {
          console.error("\nBatch error (skipped):", r.reason?.message ?? r.reason);
          continue;
        }
        const valid = r.value.filter((s) => [1, 2, 3].includes(s.difficulty));
        const saved = await saveScores(valid);
        scored += saved;
        flagged += valid.filter((s) => s.badClue).length;
      }
      process.stdout.write(`\r  ${scored} scored, ${flagged} flagged bad...`);
    }
  }

  console.log(`\nDone. Scored ${scored}, flagged ${flagged} as bad (kept, not deleted).`);
  const dist = await sql`SELECT difficulty, COUNT(*)::int n FROM clues WHERE language='fr' AND difficulty IS NOT NULL GROUP BY difficulty ORDER BY difficulty`;
  console.log("DB difficulty distribution:", JSON.stringify(dist));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
