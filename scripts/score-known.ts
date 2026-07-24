/**
 * Score French word RECOGNIZABILITY (words.known_score, 1-5) via the Anthropic
 * SDK DIRECTLY (bills ANTHROPIC_API_KEY, NOT the AI Gateway — see the LLM/AI
 * Rules note in CLAUDE.md: data-pipeline scripts may bypass the gateway).
 *
 * The question is "does an average French adult KNOW this word?", NOT how often
 * it appears in a subtitle/text corpus. Napoleon is rare in text but everyone
 * knows it (5); an obscure technical word can have decent corpus frequency yet
 * nobody recognizes it (1-2). This is the signal `familiarity` (corpus-based)
 * does NOT capture.
 *
 * Design:
 *  - Additive + non-destructive: writes a NEW column (known_score), leaves
 *    familiarity untouched so the two signals can be A/B'd.
 *  - Idempotent column create (ALTER ... IF NOT EXISTS) — no drizzle-kit push,
 *    which risks dropping other tables on the shared Neon branch.
 *  - Resumable: only scores rows where known_score IS NULL. Re-run to continue.
 *  - Recognizable-first (familiarity DESC) so a partial run covers the words
 *    the generator actually leans on.
 *  - Prompt caching on the stable instruction prefix across batches.
 *
 * Usage:
 *   pnpm tsx scripts/score-known.ts --limit 200   # cheap sample to eyeball
 *   pnpm tsx scripts/score-known.ts               # full remainder
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY
const MODEL = "claude-sonnet-5"; // sonnet-tier for judgment; cheap for bulk
const BATCH_SIZE = 100; // words per API call
const CONCURRENCY = 5; // parallel API calls
const FETCH_SIZE = 2000;

const scoreSchema = z.object({
  id: z.number(),
  score: z.number().int().min(1).max(5),
});
type Known = z.infer<typeof scoreSchema>;

const SYSTEM_PROMPT = `Tu es un juge de la NOTORIÉTÉ des mots français pour des mots fléchés grand public.

Pour chaque mot, donne un score de RECONNAISSABILITÉ de 1 à 5 : est-ce qu'un adulte français moyen CONNAÎT ce mot ?

RÈGLE CENTRALE : juge si les gens connaissent le mot, PAS sa fréquence dans les textes/sous-titres. Un nom propre très célèbre (NAPOLEON, ZIDANE, EVEREST) est un 5 même s'il est rare à l'écrit. Un mot technique/savant obscur est un 1-2 même s'il apparaît dans des corpus.

Barème :
- 5 = tout le monde connaît. Mots ultra-courants + célébrités/lieux hyper-connus. Ex : CHAT, MANGER, MAISON, PARIS, NAPOLEON, SOLEIL.
- 4 = connu de la grande majorité des adultes. Ex : HORIZON, VOLCAN, MELANCOLIE, GUITARE.
- 3 = culture générale moyenne ; beaucoup le connaissent, certains non. Ex : PROBITE, ESCARPE, DILIGENCE.
- 2 = rare, littéraire, technique ou régional ; la plupart des gens ne le connaissent pas. Ex : THURIFERAIRE, ZYGOMA.
- 1 = obscur, archaïque ou de spécialiste ; quasi personne ne le connaît.

EN CAS DE DOUTE, score plus BAS (on préfère les mots que les gens connaissent vraiment). Réponds uniquement avec le JSON demandé.`;

async function ensureColumn(): Promise<void> {
  await sql`ALTER TABLE words ADD COLUMN IF NOT EXISTS known_score integer`;
}

async function scoreBatch(pairs: { id: number; word: string }[]): Promise<Known[]> {
  const userPrompt = `Note ces ${pairs.length} mots. Retourne UNIQUEMENT un tableau JSON d'objets {"id":number,"score":1-5}, rien d'autre :\n${pairs
    .map((p) => `[id:${p.id}] ${p.word}`)
    .join("\n")}`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "disabled" }, // pure classification — no reasoning needed
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  const parsed = z.array(scoreSchema).safeParse(JSON.parse(match[0]));
  return parsed.success ? parsed.data : [];
}

async function saveScores(scores: Known[]): Promise<number> {
  if (scores.length === 0) return 0;
  const ids = scores.map((s) => s.id);
  const vals = scores.map((s) => s.score);
  await sql`
    UPDATE words w SET known_score = v.score
    FROM (SELECT UNNEST(${ids}::int[]) AS id, UNNEST(${vals}::int[]) AS score) v
    WHERE w.id = v.id`;
  return scores.length;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

  await ensureColumn();

  const [{ n: total }] = await sql`
    SELECT COUNT(*)::int n FROM words
    WHERE language='fr' AND active=true AND known_score IS NULL`;
  console.log(
    `Unscored fr words: ${total}. Target this run: ${limit === Infinity ? "all" : limit}`
  );

  let scored = 0;
  while (scored < limit) {
    const rows = await sql`
      SELECT id, word FROM words
      WHERE language='fr' AND active=true AND known_score IS NULL
      ORDER BY familiarity DESC NULLS LAST, id
      LIMIT ${FETCH_SIZE}`;
    if (rows.length === 0) break;

    const batches: { id: number; word: string }[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(
        rows.slice(i, i + BATCH_SIZE).map((r) => ({
          id: r.id as number,
          word: r.word as string,
        }))
      );
    }

    for (let i = 0; i < batches.length && scored < limit; i += CONCURRENCY) {
      const group = batches.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(group.map((b) => scoreBatch(b)));
      for (const r of results) {
        if (r.status === "rejected") {
          console.error("\nBatch error (skipped):", r.reason?.message ?? r.reason);
          continue;
        }
        scored += await saveScores(r.value);
      }
      process.stdout.write(`\r  ${scored} scored...`);
    }
  }

  const dist = await sql`
    SELECT known_score, COUNT(*)::int n FROM words
    WHERE language='fr' AND known_score IS NOT NULL
    GROUP BY known_score ORDER BY known_score`;
  console.log(`\nDone. Scored ${scored} this run.`);
  console.log("known_score distribution:", JSON.stringify(dist));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
