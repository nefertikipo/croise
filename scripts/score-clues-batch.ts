/**
 * Production clue scorer — Anthropic Batches API (Sonnet), flag-not-delete.
 * Bills the pay-as-you-go ANTHROPIC_API_KEY, NOT the Claude subscription.
 *
 * Optimizations vs the gateway version:
 *  - Terser output: model returns [[id,diff,bad],...] (~10 tok/clue vs ~20).
 *  - 100 clues/request: amortizes the instruction prefix over more clues.
 *  - 60 calibration examples (smaller prefix).
 * Flag-not-delete: sets clues.difficulty + clues.bad_clue. Nothing deleted.
 * Resumable: only pulls difficulty IS NULL, most-recognizable first.
 *
 * Usage:
 *   pnpm tsx scripts/score-clues-batch.ts --count 500   # small priced test (still applies)
 *   pnpm tsx scripts/score-clues-batch.ts               # full remainder
 *   pnpm tsx scripts/score-clues-batch.ts --salvage     # re-score reconstructed deleted clues (see below)
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "fs";

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic();
const MODEL = "claude-sonnet-4-6";
const PER_REQUEST = 100; // clues per batch request
const REQUESTS_PER_BATCH = 1500; // requests per submitted batch (=150k clues); ~3 waves, applied+resumable between waves

const SYSTEM_PROMPT = `Tu es un expert en mots fléchés français. Pour chaque paire mot→indice, donne difficulty (1/2/3) et badClue (0/1).

difficulty — EN CAS DE DOUTE, SCORE PLUS HAUT (rareté du MOT × indice détourné) :
- 1 facile : mot courant + indice direct. Ex ANE→"animal têtu", REINE→"épouse de roi".
- 2 moyen : réflexion / jeu de mots simple / culture générale. Ex MEMBRE→"il a la carte du parti". Les références culturelles TRÈS CONNUES (films cultes, personnages/proverbes célèbres) sont MOYEN, pas difficile. Ex ORDURE→"le père Noël en est une" = 2 (film très connu).
- 3 difficile : mot RARE/technique, référence spécifique OBSCURE, ou jeu de mots vraiment retors. Ex AUDIENCE→"trafic", TOMBE→"place d'orchestre". Ne mets 3 que si peu de gens trouveraient.

badClue=1 UNIQUEMENT si l'indice décrit NETTEMENT un AUTRE mot, ou est du charabia. Ex EAUX→"nœud coulant"(=LACS), SERVEUR→"jeune mâle", LEGAL→"enregistrement de données"(=SAISIE), CHACUNE→"toute personne en personne parmi les personnes"(charabia).
badClue=0 (VALIDE, ne PAS flaguer) — sois PRUDENT, préfère 0 :
- Synonyme APPROXIMATIF, paraphrase, ou sens VOISIN, même imparfait. Ex VALIDES : "rendre la monnaie"→REMBOURSER, "les gens du voyage"→PASSAGERS, "jeu de mots"→ECRITURE.
- Indice difficile/obscur mais correct ; jeu de mots (MARIN→"ouvrier du bâtiment", bâtiment=navire) ; antonyme ("point accessoire"→ESSENTIEL).
- Forme ACCENTUÉE/homographe — les mots fléchés SUPPRIMENT les accents, LUXE peut être LUXÉ donc "démis"/"foulé"=VALIDE ; référence culturelle correcte.
Ne flague (1) que si tu es SÛR que l'indice vise un autre mot. En cas de doute → 0.

Réponds UNIQUEMENT avec un tableau JSON compact de triplets [id, difficulty, badClue], ex: [[12345,2,0],[12346,3,1]]. Rien d'autre.`;

let CACHED_PREFIX = "";
async function buildPrefix() {
  const ex = (await sql`
    SELECT w.word, c.clue, c.difficulty FROM clues c JOIN words w ON c.word_id=w.id
    WHERE c.difficulty IS NOT NULL AND c.verified=true AND c.language='fr' ORDER BY c.id LIMIT 60`)
    .map((r) => `${r.word} → "${r.clue}" → ${["", "facile", "moyen", "difficile"][r.difficulty as number]}`);
  CACHED_PREFIX = `${SYSTEM_PROMPT}\n\nExemples (humain) :\n${ex.join("\n")}`;
}

function buildRequest(id: string, pairs: { id: number; word: string; clue: string }[]) {
  return {
    custom_id: id,
    params: {
      model: MODEL,
      max_tokens: 8000,
      system: [{ type: "text" as const, text: CACHED_PREFIX, cache_control: { type: "ephemeral" as const } }],
      messages: [
        {
          role: "user" as const,
          content: `Classifie ces ${pairs.length} paires (réponds en triplets compacts [id,diff,bad]):\n${pairs
            .map((p) => `${p.id}\t${p.word}\t${p.clue}`)
            .join("\n")}`,
        },
      ],
    },
  };
}

type Triple = [number, number, number];
function parseTriples(text: string): Triple[] {
  const m = text.match(/\[\s*\[[\s\S]*\]\s*\]/);
  if (!m) return [];
  try {
    return (JSON.parse(m[0]) as Triple[]).filter(
      (t) => Array.isArray(t) && t.length === 3 && [1, 2, 3].includes(t[1]),
    );
  } catch {
    return [];
  }
}

async function apply(triples: Triple[]): Promise<number> {
  if (triples.length === 0) return 0;
  const ids = triples.map((t) => t[0]);
  const diffs = triples.map((t) => t[1]);
  const bad = triples.map((t) => !!t[2]);
  await sql`
    UPDATE clues c SET difficulty = v.diff, bad_clue = v.bad
    FROM (SELECT UNNEST(${ids}::int[]) id, UNNEST(${diffs}::int[]) diff, UNNEST(${bad}::bool[]) bad) v
    WHERE c.id = v.id`;
  return triples.length;
}

async function runBatch(requests: ReturnType<typeof buildRequest>[]) {
  const created = await anthropic.messages.batches.create({ requests });
  console.log(`\n  submitted batch ${created.id} (recoverable id if interrupted)`);
  let b = created;
  while (b.processing_status !== "ended") {
    await new Promise((r) => setTimeout(r, 10000));
    b = await anthropic.messages.batches.retrieve(created.id);
    process.stdout.write(`\r    batch ${created.id.slice(-6)}: ${b.request_counts.succeeded} ok / ${b.request_counts.processing} proc / ${b.request_counts.errored} err`);
  }
  let scored = 0, flagged = 0, inTok = 0, outTok = 0, cw = 0, cr = 0;
  for await (const res of await anthropic.messages.batches.results(created.id)) {
    if (res.result.type !== "succeeded") continue;
    const u = res.result.message.usage;
    inTok += u.input_tokens; outTok += u.output_tokens; cw += u.cache_creation_input_tokens ?? 0; cr += u.cache_read_input_tokens ?? 0;
    const t = res.result.message.content.find((c) => c.type === "text");
    if (t && t.type === "text") {
      const triples = parseTriples(t.text);
      scored += await apply(triples);
      flagged += triples.filter((x) => x[2]).length;
    }
  }
  const cost = (inTok * 3 + outTok * 15 + cw * 3.75 + cr * 0.3) / 1e6 * 0.5;
  return { scored, flagged, cost };
}

async function main() {
  await buildPrefix();
  const countIdx = process.argv.indexOf("--count");
  const limit = countIdx !== -1 ? parseInt(process.argv[countIdx + 1], 10) : Infinity;

  const [{ n: total }] = await sql`SELECT COUNT(*)::int n FROM clues WHERE language='fr' AND difficulty IS NULL`;
  console.log(`Unlabeled: ${total}. This run: ${limit === Infinity ? "all" : limit}`);

  let done = 0, flaggedTotal = 0, costTotal = 0;
  while (done < limit) {
    const take = Math.min(REQUESTS_PER_BATCH * PER_REQUEST, limit === Infinity ? REQUESTS_PER_BATCH * PER_REQUEST : limit - done);
    const rows = await sql`
      SELECT c.id, w.word, c.clue FROM clues c JOIN words w ON c.word_id=w.id
      WHERE c.difficulty IS NULL AND c.language='fr'
      ORDER BY w.familiarity DESC, w.frequency DESC, c.id LIMIT ${take}`;
    if (rows.length === 0) break;

    const requests = [];
    for (let i = 0; i < rows.length; i += PER_REQUEST) {
      requests.push(buildRequest(`r${done + i}`, rows.slice(i, i + PER_REQUEST).map((r) => ({ id: r.id as number, word: r.word as string, clue: r.clue as string }))));
    }
    console.log(`\nSubmitting ${requests.length} requests (${rows.length} clues)...`);
    const { scored, flagged, cost } = await runBatch(requests);
    done += scored; flaggedTotal += flagged; costTotal += cost;
    console.log(`\n  applied ${scored} (${flagged} flagged bad). Running total: ${done} scored, $${costTotal.toFixed(2)} spent.`);
  }
  console.log(`\nDONE. Scored ${done}, flagged ${flaggedTotal} bad (kept). Cost: $${costTotal.toFixed(2)} (per clue $${(costTotal / Math.max(done,1)).toFixed(6)}).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
