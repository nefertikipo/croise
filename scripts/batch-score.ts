/**
 * Batch score clue-answer pairs using LLM.
 *
 * Usage:
 *   pnpm tsx scripts/batch-score.ts --test          # A/B test on 100 pairs
 *   pnpm tsx scripts/batch-score.ts --run haiku      # Full batch with Haiku
 *   pnpm tsx scripts/batch-score.ts --run sonnet     # Full batch with Sonnet
 *   pnpm tsx scripts/batch-score.ts --compare        # Show A/B comparison
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { generateText, Output } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { writeFileSync, readFileSync, existsSync } from "fs";

const sql = neon(process.env.DATABASE_URL!);

const BATCH_SIZE = 30;
const PROGRESS_FILE = "data/batch-score-progress.json";

const MODELS = {
  haiku: "anthropic/claude-haiku-4.5",
  sonnet: "anthropic/claude-sonnet-4.6",
} as const;

const clueSchema = z.object({
  clueId: z.number(),
  difficulty: z.number().min(1).max(3),
  wordType: z.enum(["nom-propre", "nom", "verbe", "adjectif", "adverbe", "expression", "abreviation"]),
  domain: z.enum([
    "geographie", "histoire", "litterature", "philosophie", "science",
    "art", "pop-culture", "sport", "cuisine", "nature", "musique",
    "medecine", "religion", "militaire", "droit", "general",
  ]),
  clueStyle: z.enum(["definition", "synonyme", "jeu-de-mots", "reference", "expression"]),
  audience: z.enum(["universel", "classique", "moderne", "cultive"]),
});

const batchSchema = z.array(clueSchema);

async function loadFewShotExamples(): Promise<string> {
  const rows = await sql`
    SELECT c.id, w.word, c.clue, c.difficulty
    FROM clues c
    JOIN words w ON c.word_id = w.id
    WHERE c.difficulty IS NOT NULL AND c.verified = true
    ORDER BY c.id
    LIMIT 500
  `;

  const lines = rows.map((r) => {
    const diff = ["", "facile", "moyen", "difficile"][r.difficulty as number];
    return `${r.word} → "${r.clue}" → ${diff}`;
  });

  return lines.join("\n");
}

function buildPrompt(examples: string, pairs: { id: number; word: string; clue: string }[]): string {
  return `Tu es un expert en mots fleches francais. Tu classifies des paires mot-indice.

Pour chaque paire, donne:
1. difficulty (1, 2, ou 3):
   - 1 = facile: mot que la plupart des gens connaissent, indice direct ou reference tres connue (ex: ANE → "animal tetu", ROME → "capitale de l'Italie")
   - 2 = moyen: culture generale, leger jeu de mots, reference qui demande un peu de reflexion (ex: SADE → "celebre marquis", USURE → "pratique qui ne manque pas d'interet")
   - 3 = difficile: reference pointue, mot rare, ou jeu de mots complexe (ex: EILAT → "port d'Israel", NATRON → "lac sale d'Afrique")

2. wordType: nom-propre, nom, verbe, adjectif, expression, abreviation

3. domain: geographie, histoire, litterature, philosophie, science, art, pop-culture, sport, cuisine, nature, musique, general

4. clueStyle: definition (definition directe), synonyme, jeu-de-mots (jeu de mots/double sens), reference (reference culturelle), expression (expression idiomatique)

5. audience: universel (tout age), classique (mots croises traditionnels, references classiques), moderne (pop culture, mots recents), cultive (litteraire, historique, necessite education)

Voici des exemples deja scores par un humain (difficulte seulement, a toi d'inferer le reste):

${examples}

Maintenant, classifie ces ${pairs.length} paires. Retourne un tableau JSON avec clueId, difficulty, wordType, domain, clueStyle, audience pour chaque:

${pairs.map((p) => `[id:${p.id}] ${p.word} → "${p.clue}"`).join("\n")}`;
}

async function scoreBatch(
  model: keyof typeof MODELS,
  examples: string,
  pairs: { id: number; word: string; clue: string }[],
): Promise<z.infer<typeof clueSchema>[]> {
  const prompt = buildPrompt(examples, pairs);

  const { output } = await generateText({
    model: gateway(MODELS[model]),
    output: Output.array({ element: clueSchema }),
    prompt,
    maxRetries: 2,
  });

  return output ?? [];
}

async function saveScores(scores: z.infer<typeof clueSchema>[]) {
  for (const s of scores) {
    await sql`
      UPDATE clues
      SET
        difficulty = ${s.difficulty},
        vibe = ${s.clueStyle},
        tags = ARRAY[${s.wordType}, ${s.domain}, ${s.audience}]
      WHERE id = ${s.clueId}
    `;
  }
}

// ---- Commands ----

async function runTest() {
  console.log("Loading few-shot examples...");
  const examples = await loadFewShotExamples();
  console.log(`Loaded ${examples.split("\n").length} examples`);

  // Pull 100 random unlabeled pairs
  const pairs = await sql`
    SELECT c.id, w.word, c.clue
    FROM clues c
    JOIN words w ON c.word_id = w.id
    WHERE c.difficulty IS NULL
    ORDER BY RANDOM()
    LIMIT 100
  `;
  console.log(`Testing on ${pairs.length} pairs\n`);

  // Save the test set IDs
  writeFileSync("data/test-pairs.json", JSON.stringify(pairs.map((p) => ({
    id: p.id, word: p.word, clue: p.clue,
  }))));

  // Run both models
  for (const model of ["haiku", "sonnet"] as const) {
    console.log(`\n=== Running ${model} ===`);
    const allScores: z.infer<typeof clueSchema>[] = [];

    for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
      const batch = pairs.slice(i, i + BATCH_SIZE).map((p) => ({
        id: p.id as number,
        word: p.word as string,
        clue: p.clue as string,
      }));

      try {
        const scores = await scoreBatch(model, examples, batch);
        allScores.push(...scores);
        process.stdout.write(`\r  ${allScores.length}/${pairs.length} scored`);
      } catch (err) {
        console.error(`\nBatch error:`, err);
      }
    }

    writeFileSync(`data/test-scores-${model}.json`, JSON.stringify(allScores, null, 2));
    console.log(`\nSaved to data/test-scores-${model}.json`);

    // Quick stats
    const dist = { 1: 0, 2: 0, 3: 0 };
    for (const s of allScores) dist[s.difficulty as 1 | 2 | 3]++;
    console.log(`Distribution: facile=${dist[1]} moyen=${dist[2]} difficile=${dist[3]}`);
  }
}

async function runCompare() {
  if (!existsSync("data/test-scores-haiku.json") || !existsSync("data/test-scores-sonnet.json")) {
    console.log("Run --test first");
    return;
  }

  const pairs: { id: number; word: string; clue: string }[] = JSON.parse(
    readFileSync("data/test-pairs.json", "utf-8"),
  );
  const haiku: z.infer<typeof clueSchema>[] = JSON.parse(
    readFileSync("data/test-scores-haiku.json", "utf-8"),
  );
  const sonnet: z.infer<typeof clueSchema>[] = JSON.parse(
    readFileSync("data/test-scores-sonnet.json", "utf-8"),
  );

  // Check if user has labeled these pairs
  const ids = pairs.map((p) => p.id);
  const userLabels = await sql`
    SELECT id, difficulty FROM clues WHERE id = ANY(${ids}) AND difficulty IS NOT NULL
  `;
  const userMap = new Map(userLabels.map((r) => [r.id, r.difficulty as number]));
  const haikuMap = new Map(haiku.map((s) => [s.clueId, s]));
  const sonnetMap = new Map(sonnet.map((s) => [s.clueId, s]));

  console.log(`User labeled: ${userMap.size}/${pairs.length}`);

  let haikuAgree = 0, sonnetAgree = 0, haikuSonnetAgree = 0;
  const disagreements: string[] = [];

  for (const p of pairs) {
    const user = userMap.get(p.id);
    const h = haikuMap.get(p.id);
    const s = sonnetMap.get(p.id);

    if (user && h && s) {
      if (h.difficulty === user) haikuAgree++;
      if (s.difficulty === user) sonnetAgree++;
      if (h.difficulty === s.difficulty) haikuSonnetAgree++;

      if (h.difficulty !== user || s.difficulty !== user) {
        const labels = ["", "F", "M", "D"];
        disagreements.push(
          `${p.word} → "${p.clue}" | You:${labels[user]} Haiku:${labels[h.difficulty]} Sonnet:${labels[s.difficulty]}`,
        );
      }
    }
  }

  const labeled = userMap.size;
  if (labeled > 0) {
    console.log(`\nAgreement with your labels (out of ${labeled}):`);
    console.log(`  Haiku:  ${haikuAgree}/${labeled} (${(haikuAgree / labeled * 100).toFixed(0)}%)`);
    console.log(`  Sonnet: ${sonnetAgree}/${labeled} (${(sonnetAgree / labeled * 100).toFixed(0)}%)`);
    console.log(`  Haiku=Sonnet: ${haikuSonnetAgree}/${labeled} (${(haikuSonnetAgree / labeled * 100).toFixed(0)}%)`);

    if (disagreements.length > 0) {
      console.log(`\nDisagreements (${disagreements.length}):`);
      for (const d of disagreements.slice(0, 30)) {
        console.log(`  ${d}`);
      }
    }
  } else {
    console.log("\nNo user labels for test set yet. Label them at /admin/label first.");
    console.log("Test pair IDs saved in data/test-pairs.json");
  }

  // Show category distribution from Haiku
  console.log("\n=== Haiku category distribution ===");
  const domains: Record<string, number> = {};
  for (const s of haiku) {
    domains[s.domain] = (domains[s.domain] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(domains).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
}

async function runFull(model: keyof typeof MODELS) {
  console.log(`Full batch with ${model}...`);
  const examples = await loadFewShotExamples();

  // Load progress
  let done = new Set<number>();
  if (existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    done = new Set(progress.done);
    console.log(`Resuming: ${done.size} already scored`);
  }

  // Get all unlabeled pairs
  const total = await sql`
    SELECT COUNT(*) as count FROM clues WHERE difficulty IS NULL
  `;
  console.log(`Unlabeled pairs: ${total[0].count}`);

  let scored = done.size;
  const FETCH_SIZE = 500;

  while (true) {
    // Fetch a chunk of unlabeled pairs
    const pairs = await sql`
      SELECT c.id, w.word, c.clue
      FROM clues c
      JOIN words w ON c.word_id = w.id
      WHERE c.difficulty IS NULL
      ORDER BY c.id
      LIMIT ${FETCH_SIZE}
    `;

    if (pairs.length === 0) break;

    // Process in batches
    for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
      const batch = pairs.slice(i, i + BATCH_SIZE)
        .filter((p) => !done.has(p.id as number))
        .map((p) => ({ id: p.id as number, word: p.word as string, clue: p.clue as string }));

      if (batch.length === 0) continue;

      try {
        const scores = await scoreBatch(model, examples, batch);
        await saveScores(scores);
        for (const s of scores) done.add(s.clueId);
        scored += scores.length;

        process.stdout.write(`\r  ${scored} scored...`);

        // Save progress every batch
        writeFileSync(PROGRESS_FILE, JSON.stringify({ done: Array.from(done) }));
      } catch (err) {
        console.error(`\nBatch error (skipping):`, err);
      }
    }
  }

  console.log(`\n\nDone! Total scored: ${scored}`);
}

// ---- Main ----

const args = process.argv.slice(2);

if (args[0] === "--test") {
  runTest().catch(console.error);
} else if (args[0] === "--compare") {
  runCompare().catch(console.error);
} else if (args[0] === "--run") {
  const model = args[1] as keyof typeof MODELS;
  if (!model || !MODELS[model]) {
    console.error("Usage: --run haiku|sonnet");
    process.exit(1);
  }
  runFull(model).catch(console.error);
} else {
  console.log("Usage:");
  console.log("  pnpm tsx scripts/batch-score.ts --test       # A/B test on 100 pairs");
  console.log("  pnpm tsx scripts/batch-score.ts --compare    # Compare results");
  console.log("  pnpm tsx scripts/batch-score.ts --run haiku  # Full batch");
}
