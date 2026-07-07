/**
 * Salvage previously-deleted clues. Re-scores the reconstructed deletions
 * (.context/scoring/deleted-reconstructed.tsv) with the CORRECTED prompt via the
 * Anthropic Batches API, and RESTORES the ones now judged valid (badClue=0) for
 * their word — reversing the earlier over-deletion of clever clues (luxé,
 * essentiel/accidentel, etc.). Genuine misattributions (badClue=1) stay deleted.
 *
 * Only the badClue-reason deletions are candidates; self-referencing ones
 * (answer literally in the clue) are correctly bad and skipped.
 *
 * Usage: pnpm tsx scripts/salvage-deleted.ts [--limit N]
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic();
const MODEL = "claude-sonnet-4-6";
const PER_REQUEST = 100;

const SYSTEM_PROMPT = `Tu es un expert en mots fléchés français. Pour chaque paire mot→indice, donne difficulty (1/2/3) et badClue (0/1).

difficulty — EN CAS DE DOUTE, SCORE PLUS HAUT (rareté du MOT × indice détourné) :
- 1 facile : mot courant + indice direct. Ex ANE→"animal têtu".
- 2 moyen : réflexion / jeu de mots simple / culture générale. Les références TRÈS CONNUES (films cultes, proverbes célèbres) sont MOYEN.
- 3 difficile : mot RARE/technique, référence OBSCURE, ou jeu de mots vraiment retors.

badClue=1 UNIQUEMENT si l'indice décrit NETTEMENT un AUTRE mot, ou est du charabia. Ex EAUX→"nœud coulant"(=LACS), SERVEUR→"jeune mâle", LEGAL→"enregistrement de données"(=SAISIE).
badClue=0 (VALIDE — sois PRUDENT, préfère 0) : synonyme approximatif / sens voisin même imparfait ("rendre la monnaie"→REMBOURSER, "les gens du voyage"→PASSAGERS) ; jeu de mots (MARIN→"ouvrier du bâtiment") ; antonyme ("point accessoire"→ESSENTIEL) ; forme ACCENTUÉE/homographe — les mots fléchés SUPPRIMENT les accents, LUXE peut être LUXÉ donc "démis"/"foulé"=VALIDE. En cas de doute → 0.

Réponds UNIQUEMENT avec un tableau JSON compact de triplets [id, difficulty, badClue], ex: [[12345,2,0]]. Rien d'autre.`;

async function main() {
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity;

  // candidates = badClue-reason deletions only
  const lines = readFileSync(".context/scoring/deleted-reconstructed.tsv", "utf-8").trim().split("\n").slice(1);
  const cands = lines
    .map((l) => { const [id, word, clue, reason] = l.split("\t"); return { id: +id, word, clue, reason }; })
    .filter((c) => c.reason === "badClue")
    .slice(0, limit === Infinity ? undefined : limit);
  console.log(`Candidates (badClue deletions): ${cands.length}`);

  const examples = (await sql`
    SELECT w.word, c.clue, c.difficulty FROM clues c JOIN words w ON c.word_id=w.id
    WHERE c.difficulty IS NOT NULL AND c.verified=true AND c.language='fr' ORDER BY c.id LIMIT 60`)
    .map((r) => `${r.word} → "${r.clue}" → ${["", "facile", "moyen", "difficile"][r.difficulty as number]}`);
  const prefix = `${SYSTEM_PROMPT}\n\nExemples (humain) :\n${examples.join("\n")}`;

  // word -> id map for restore
  const wordRows = await sql`SELECT id, word FROM words WHERE language='fr'`;
  const wid = new Map(wordRows.map((r) => [r.word as string, r.id as number]));

  const requests = [];
  for (let i = 0; i < cands.length; i += PER_REQUEST) {
    const grp = cands.slice(i, i + PER_REQUEST);
    requests.push({
      custom_id: `s${i}`,
      params: {
        model: MODEL,
        max_tokens: 8000,
        system: [{ type: "text" as const, text: prefix, cache_control: { type: "ephemeral" as const } }],
        messages: [{ role: "user" as const, content: `Classifie ces ${grp.length} paires (triplets [id,diff,bad]):\n${grp.map((p) => `${p.id}\t${p.word}\t${p.clue}`).join("\n")}` }],
      },
    });
  }

  const created = await anthropic.messages.batches.create({ requests });
  console.log(`Batch ${created.id} submitted. Polling...`);
  let b = created;
  while (b.processing_status !== "ended") {
    await new Promise((r) => setTimeout(r, 10000));
    b = await anthropic.messages.batches.retrieve(created.id);
    process.stdout.write(`\r  ${b.request_counts.succeeded} ok / ${b.request_counts.processing} proc`);
  }

  const candById = new Map(cands.map((c) => [c.id, c]));
  const toRestore: { id: number; word: string; clue: string; diff: number }[] = [];
  let stillBad = 0, cost = 0;
  for await (const res of await anthropic.messages.batches.results(created.id)) {
    if (res.result.type !== "succeeded") continue;
    const u = res.result.message.usage;
    cost += (u.input_tokens * 3 + u.output_tokens * 15 + (u.cache_creation_input_tokens ?? 0) * 3.75 + (u.cache_read_input_tokens ?? 0) * 0.3) / 1e6 * 0.5;
    const t = res.result.message.content.find((c) => c.type === "text");
    if (!t || t.type !== "text") continue;
    const m = t.text.match(/\[\s*\[[\s\S]*\]\s*\]/);
    if (!m) continue;
    for (const [id, diff, bad] of JSON.parse(m[0]) as [number, number, number][]) {
      const c = candById.get(id);
      if (!c || ![1, 2, 3].includes(diff)) continue;
      if (bad) { stillBad++; continue; }
      if (wid.has(c.word)) toRestore.push({ id, word: c.word, clue: c.clue, diff });
    }
  }
  console.log(`\nRe-scored. Valid (restore): ${toRestore.length}, still bad (leave deleted): ${stillBad}. Cost $${cost.toFixed(2)}`);

  let restored = 0;
  for (const r of toRestore) {
    const src = r.clue === r.clue.toUpperCase() ? "fsolver" : "dico-mots";
    await sql`
      INSERT INTO clues (id, word_id, clue, language, source, origin, verified, difficulty, bad_clue)
      VALUES (${r.id}, ${wid.get(r.word)!}, ${r.clue}, 'fr', ${src}, 'scraped', false, ${r.diff}, false)
      ON CONFLICT (id) DO NOTHING`;
    restored++;
    if (restored % 200 === 0) process.stderr.write(`\r  restored ${restored}/${toRestore.length}`);
  }
  console.log(`\nRESTORED ${restored} previously-deleted clues (now scored, bad_clue=false).`);
}
main().catch((e) => { console.error(e); process.exit(1); });
