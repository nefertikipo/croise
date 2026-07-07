/**
 * Small Anthropic Batches API test: score ~500 clues, then report EXACT token
 * usage + cost from the API response so we can price the full run precisely.
 * Bills the pay-as-you-go ANTHROPIC_API_KEY (not the Claude subscription).
 *
 * Usage: pnpm tsx scripts/score-batch-test.ts [--count 500]
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "fs";

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic();
const MODEL = "claude-sonnet-4-6";
const BATCH_SIZE = 40;

const SYSTEM_PROMPT = `Tu es un expert en mots fléchés français. Pour chaque paire mot→indice, donne difficulty (1/2/3) et badClue (true/false).

difficulty — EN CAS DE DOUTE, SCORE PLUS HAUT. Combine la rareté du MOT et le caractère détourné de l'INDICE :
- 1 = facile : mot courant + indice direct. Ex : ANE→"animal têtu", REINE→"épouse de roi".
- 2 = moyen : réflexion, jeu de mots simple, culture générale. Ex : MEMBRE→"il a la carte du parti".
- 3 = difficile : jeu de mots complexe, référence spécifique, mot rare/technique, indice très détourné. Ex : AUDIENCE→"trafic", TOMBE→"place d'orchestre".

badClue = true UNIQUEMENT si l'indice décrit clairement un AUTRE mot que la réponse, ou est incohérent/charabia. Ex vrais badClue : EAUX→"nœud coulant" (=LACS), SERVEUR→"jeune mâle", LEGAL→"enregistrement de données" (=SAISIE).

badClue = false (indices VALIDES, NE PAS flaguer) : indice difficile mais correct ; jeu de mots/calembour (MARIN→"ouvrier du bâtiment", bâtiment=navire) ; antonyme ("point accessoire" pour ESSENTIEL) ; forme accentuée/homographe — les mots fléchés SUPPRIMENT les accents, LUXE peut être LUXÉ donc "démis"/"foulé" = VALIDE ; référence culturelle correcte. En cas de doute, false.

Réponds UNIQUEMENT avec un tableau JSON: [{"clueId":N,"difficulty":1|2|3,"badClue":true|false},...]`;

async function main() {
  const countIdx = process.argv.indexOf("--count");
  const count = countIdx !== -1 ? parseInt(process.argv[countIdx + 1], 10) : 500;

  const examples = (await sql`
    SELECT w.word, c.clue, c.difficulty FROM clues c JOIN words w ON c.word_id=w.id
    WHERE c.difficulty IS NOT NULL AND c.verified=true AND c.language='fr' ORDER BY c.id LIMIT 120`)
    .map((r) => `${r.word} → "${r.clue}" → ${["", "facile", "moyen", "difficile"][r.difficulty as number]}`);
  const cachedPrefix = `${SYSTEM_PROMPT}\n\nExemples calibrés par un humain :\n${examples.join("\n")}`;

  const rows = await sql`
    SELECT c.id, w.word, c.clue FROM clues c JOIN words w ON c.word_id=w.id
    WHERE c.difficulty IS NULL AND c.language='fr'
    ORDER BY w.familiarity DESC, w.frequency DESC, c.id LIMIT ${count}`;
  console.log(`Test set: ${rows.length} clues, ${Math.ceil(rows.length / BATCH_SIZE)} batches`);

  const requests = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const user = `Classifie ces ${batch.length} paires:\n${batch.map((p) => `[id:${p.id}] ${p.word} → "${p.clue}"`).join("\n")}`;
    requests.push({
      custom_id: `b${i / BATCH_SIZE}`,
      params: {
        model: MODEL,
        max_tokens: 4096,
        system: [{ type: "text" as const, text: cachedPrefix, cache_control: { type: "ephemeral" as const } }],
        messages: [{ role: "user" as const, content: user }],
      },
    });
  }

  const created = await anthropic.messages.batches.create({ requests });
  console.log(`Batch ${created.id} submitted (${created.processing_status}). Polling...`);

  let batch = created;
  while (batch.processing_status !== "ended") {
    await new Promise((r) => setTimeout(r, 8000));
    batch = await anthropic.messages.batches.retrieve(created.id);
    process.stdout.write(`\r  ${batch.request_counts.succeeded} ok, ${batch.request_counts.processing} processing, ${batch.request_counts.errored} err`);
  }
  console.log("\nBatch ended. Reading results...");

  let inTok = 0, outTok = 0, cacheWrite = 0, cacheRead = 0, scored = 0, flagged = 0, failed = 0;
  const parsed: { clueId: number; difficulty: number; badClue: boolean }[] = [];
  for await (const res of await anthropic.messages.batches.results(created.id)) {
    if (res.result.type !== "succeeded") { failed++; continue; }
    const u = res.result.message.usage;
    inTok += u.input_tokens; outTok += u.output_tokens;
    cacheWrite += u.cache_creation_input_tokens ?? 0; cacheRead += u.cache_read_input_tokens ?? 0;
    const text = res.result.message.content.find((b) => b.type === "text");
    if (text && text.type === "text") {
      try {
        const arr = JSON.parse(text.text.replace(/```json|```/g, "").trim());
        for (const s of arr) if ([1,2,3].includes(s.difficulty)) { parsed.push(s); scored++; if (s.badClue) flagged++; }
      } catch { failed++; }
    }
  }

  writeFileSync(".context/scoring/preview/api-scores.json", JSON.stringify(parsed));
  console.log(`Saved ${parsed.length} API scores to .context/scoring/preview/api-scores.json`);

  // Batches API = 50% off standard. Sonnet standard: $3/M in, $15/M out, cache write $3.75/M, cache read $0.30/M.
  const cost = (inTok*3 + outTok*15 + cacheWrite*3.75 + cacheRead*0.30) / 1_000_000 * 0.5;
  const perClue = cost / Math.max(scored, 1);
  console.log(`\n=== RESULTS ===`);
  console.log(`Scored ${scored}, flagged bad ${flagged}, failed ${failed}`);
  console.log(`Tokens — input ${inTok}, output ${outTok}, cacheWrite ${cacheWrite}, cacheRead ${cacheRead}`);
  console.log(`Test cost (50% batch): $${cost.toFixed(4)}  |  per clue: $${perClue.toFixed(6)}`);
  console.log(`\n>>> Extrapolated to 429,073 remaining: $${(perClue * 429073).toFixed(2)}`);
  console.log(`\nNOT applied to DB — this is a measurement run only.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
