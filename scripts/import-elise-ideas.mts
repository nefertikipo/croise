/**
 * One-off: load the clue-idea spreadsheet into "Elise's 25th" (BOOK-81KFPU),
 * adding a `category` to each idea. Idempotent-ish: matches rows already in the
 * book by answer (or by clue text, to catch typo'd answers) and only backfills
 * their category; genuinely new rows are appended.
 *
 * Dry-run by default. Pass --apply to write.
 *   set -a; source .env.local; set +a
 *   node_modules/.bin/tsx scripts/import-elise-ideas.mts          # preview
 *   node_modules/.bin/tsx scripts/import-elise-ideas.mts --apply  # write
 */
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const CODE = "BOOK-81KFPU";
const APPLY = process.argv.includes("--apply");

// Fold a category to its canonical casing so a group reads as one.
function canonCategory(raw: string): string {
  const k = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    hec: "HEC",
    général: "Général",
    general: "Général",
    fasny: "Fasny",
    belgique: "Belgique",
    famille: "Famille",
    lse: "LSE",
    bayonne: "Bayonne",
  };
  return map[k] ?? raw.trim();
}

function normAns(s: string): string {
  return s
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "AE")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

// First 16 alphanumerics of a clue, accent-folded, for fuzzy same-clue matching.
function clueFp(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
}

function clueScore(a: string, b: string): number {
  const fa = clueFp(a);
  const fb = clueFp(b);
  if (!fa && !fb) return 1;
  if (fa === fb && fa) return 2;
  const short = fa.length < fb.length ? fa : fb;
  const long = fa.length < fb.length ? fb : fa;
  if (short.length >= 6 && long.startsWith(short)) return 1;
  return 0;
}

// The spreadsheet, transcribed. [answer, clue, category, author]. Blank = "".
// The "Utile p" fragment in the source is dropped (incomplete cell).
const ROWS: [string, string, string, string][] = [
  ["Epices", "Elles peuvent être dissimulées", "HEC", "Louise"],
  ["Tortilla", "On la slap", "HEC", "Louise"],
  ["Cordée", "On y est mieux pour avancer", "HEC", "Louise"],
  ["HEC", "Elle nous apprend à oser", "HEC", "Louise"],
  ["Ponton", "On y bronze", "Général", "Louise"],
  ["Annecy", "Lieu de villégiature", "Général", "Louise"],
  ["Wake", "GTT's classic", "Général", "Louise"],
  ["GTT", "On emprunte son navire", "Général", "Louise"],
  ["Triathlon", "", "Général", "Louise"],
  ["Greg", "Voulait construire son Empire mais a rencontré son impératrice", "Général", "Louise, Diane"],
  ["Toujours", "Les gagnants gagnent __", "Général", "Louise"],
  ["Manuelle", "On a du mal à la conduire", "Général", "Louise"],
  ["Hello", "Usual greeting répété", "HEC", "Théo"],
  ["Meridababy", "Suceur de roue", "", "Théo"],
  ["Suzuki", "Bolide auvergnois", "Général", "Louise"],
  ["Sauna", "", "", ""],
  ["Den", "", "", ""],
  ["Mortadelle", "Un fromage? Apparement", "HEC", ""],
  ["Mini", "On le finit en 10mn (30s pour Louise)", "", ""],
  ["PDP", "Ce soir c'est la", "HEC", "Théo"],
  ["JDC", "Tu veux un nespresso ou du __ ?", "", ""],
  ["Sacoche", "Cadeau à retardement", "HEC", "Théo"],
  ["Front", "Il est national", "Fasny", "Diane"],
  ["Chicken", "Pumpkin and__", "Fasny", "Diane"],
  ["Balls", "To the sweat right down my__", "Fasny", "Diane"],
  ["Arsine", "On gravit son pic", "HEC", "Louise"],
  ["GP", "Gala", "", "Théo"],
  ["GTT", "Frère de Gala", "Belgique", "Andréa"],
  ["Banc", "On y dort à Hampi", "Général", "Emma"],
  ["Moustiquaire", "On la met dans les hostels", "Général", "Emma"],
  ["Kiwi", "On mange sa peau", "Général", "Emma"],
  ["eMTB", "On le casse en descente", "Général", "Emma"],
  ["Frigo", "Il est toujours bien rangé", "Général", "Emma"],
  ["Milkshake", "Ça ramène tous les garçons dans le jardin", "Général", "Emma"],
  ["Sur pelouse", "On y retrouve le barbu", "Bayonne", "Diane"],
  ["ZOO", "Safari préféré des animaux de la AU", "LSE", "Marine"],
  ["Madeleine", "Fait autant mal aux fesses que du bien au bidou", "Général", "Marine"],
  ["caca", "Explose dans les canalisations", "", "Théo"],
  ["cookies", "Sont meilleurs quand ils sont faits par Afsaneh", "Fasny", "Afsaneh"],
  ["tartibon", "Succulent fromage", "HEC", "Théo"],
  ["Lise emmanuelle", "Tu te tais", "HEC", "Théo"],
  ["Puppy elise", "L'animal dans lequel tu te transformes quand tu as bu", "Fasny", "Afsaneh"],
  ["sourcils", "Ce que tu me demandes de te faire à chaque fois qu'on se voit", "Fasny", "Afsaneh"],
  ["Annecy", "_ la belle vie", "Fasny", "Afsaneh"],
  ["Seraphin", "Made breakfast shirtless in front of Cedric", "Fasny", "Afsaneh"],
  ["Mr Mercredi", "Un plaisir qui n'a pas de nom", "Fasny", "Afsaneh"],
  ["gouter", "Pas dispo pour un sleepover, mais on peut faire un _ ?", "Fasny", "Afsaneh"],
  ["serrure", "Diane l'a cassée pendant que tu dormais", "Fasny", "Afsaneh"],
  ["boobs", "THEY'RE HUGE!", "Fasny", "Afsaneh"],
  ["Tournette", "Montagne qui te fait tourner la tête et vide tes jambes", "", ""],
  ["Reblochonnade", "Une raclette…mais en meilleur", "", ""],
  ["Sexing", "Verbe souvent utilisé dans les Mad libs", "Belgique", "Andréa"],
  ["Ferrari", "Qu'est ce qu'y se gare dans le garage?", "Belgique", "Andréa"],
  ["Iruguay", "Pays en Amérique Latine qui n'existe pas", "Belgique", "Andréa"],
  ["Tweedle Tea", "Cookies ou glace à Menthon St Bernard", "Belgique", "Andréa"],
  ["Arab", "T'inquiète pas c'est une origine difficile à prononcer en anglais", "Famille", "Aline"],
  ["Zoomies", "Occurs a bit too often when energy is HIGH, au grand déséspor de Greg", "Famille", "Aline"],
  ["Marie-Claude", "On en achète souvent au 8à8", "Famille", "Aline"],
  ["Ring", "You would like a … you would like a …", "Famille", "Aline"],
  ["Chounette", "Un password ou pseudonyme", "Famille", "Aline"],
  ["Step", "À la recherche de cours pour maman", "Famille", "Aline"],
  ["Anthropology (ou rock)", "Marchand a marché dessus", "Famille", "Aline"],
  ["Jacques", "A non-negociable for the wedding", "Famille", "Aline"],
  ["Testosterone", "Excédent hormonal util pour ouvrir du vin", "Fasny", "Diane"],
  ["Michael", "PB101 crush", "Fasny", "Diane"],
  ["Bottines", "A ne surtout pas acheté en seconde main à Berlin", "Fasny", "Diane"],
  ["Matin", "Pur soiree", "Fasny", "Diane"],
  ["Milkshake", "Amène tous les hommes dans le jardin", "Fasny", "Diane"],
  ["Yeux bleus", "Te font craquer sans faute", "Fasny", "Afsaneh"],
  ["chanson", "Le meilleur cadeau que tu puisses offrir", "Fasny", "Afsaneh"],
  ["cement", "béton", "Fasny", "Afsaneh"],
  ["Basket", "Sport choisi par deux personnes qui depasssent pas les 1.30m", "LSE", "Mahé"],
  ["Draps", "Victimes collaterales d'une vie sexuelle active", "LSE", "Mahé"],
  ["Lessive", "Deuxieme activité préférée apres le sexxxx", "LSE", "Mahé"],
  ["Plaque de cuisson", "Truc qui vaut mieux eteindre", "LSE", "Mahé"],
  ["Step", "Activité incompatible avec certaines courbatures au club Med", "LSE", "Mahé"],
  ["Telephone", "Accessoire lavable. Apparemment.", "LSE", "Mahé"],
  ["Taylorism", "Doctrine economique popularisée par Taylor Swift", "LSE", "Mahé"],
  ["Cuilliere", "Seule position sexuelle homologuée par certaines personnes (mais pas Elise)", "LSE", "Mahé"],
  ["Covid", "Deuxieme prenom de elise entre 2020 et 2022", "LSE", "Mahé"],
  ["Josh", "Patient zero du ski trip", "LSE", "Mahé"],
  ["Neige", "Endroit romantique ou les virus prennent l'air", "LSE", "Mahé"],
  ["PCR", "Test qu'Elise aurait pu prendre en abonnement", "LSE", "Mahé"],
  ["Potentiel", "Futur licorne partie trop tôt", "", ""],
];

type Idea = { id: string; answer: string; clue: string; category?: string; author?: string };

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const [book] = await sql`SELECT id, clue_ideas FROM books WHERE code = ${CODE}`;
  if (!book) throw new Error(`Book ${CODE} not found`);

  const existing: Idea[] = (book.clue_ideas ?? []).map((i: Idea) => ({ ...i }));
  const consumed = new Set<string>();

  const newIdeas: Idea[] = [];
  const backfilled: { answer: string; fields: string }[] = [];
  const skipped: string[] = [];

  // Group the spreadsheet rows by normalized answer so answers that appear more
  // than once (Annecy, Step, Milkshake, GTT) are disambiguated by clue.
  const groups = new Map<string, [string, string, string, string][]>();
  for (const row of ROWS) {
    const k = normAns(row[0]);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(row);
  }

  for (const [key, rows] of groups) {
    const candidates = existing.filter((e) => normAns(e.answer) === key && !consumed.has(e.id));

    // Best-first pairing of rows to same-answer candidates by clue similarity.
    const pairs: { r: number; c: number; s: number }[] = [];
    rows.forEach((row, ri) =>
      candidates.forEach((cand, ci) =>
        pairs.push({ r: ri, c: ci, s: clueScore(row[1], cand.clue) }),
      ),
    );
    pairs.sort((a, b) => b.s - a.s);
    const rowUsed = new Set<number>();
    const candUsed = new Set<number>();
    const matchedRow = new Map<number, Idea>();
    for (const p of pairs) {
      if (rowUsed.has(p.r) || candUsed.has(p.c)) continue;
      rowUsed.add(p.r);
      candUsed.add(p.c);
      matchedRow.set(p.r, candidates[p.c]);
    }

    rows.forEach((row, ri) => {
      const [answer, clue, rawCat, rawAuthor] = row;
      const category = canonCategory(rawCat);
      const author = rawAuthor.trim();
      let target = matchedRow.get(ri);

      // No same-answer match: try a clue-text match (catches typo'd answers like
      // Meridababt/Meridababy, Anthropology/Anthropology (ou rock)).
      if (!target) {
        target = existing.find(
          (e) => !consumed.has(e.id) && clueScore(clue, e.clue) === 2 && clueFp(clue).length >= 10,
        );
      }

      if (target) {
        consumed.add(target.id);
        const set: string[] = [];
        if (category && !target.category?.trim()) {
          target.category = category;
          set.push(`cat=${category}`);
        }
        if (author && !target.author?.trim()) {
          target.author = author;
          set.push(`author=${author}`);
        }
        if (set.length) backfilled.push({ answer: target.answer, fields: set.join(", ") });
        else skipped.push(`${target.answer} (cat=${target.category ?? "—"}, author=${target.author ?? "—"})`);
      } else {
        const idea: Idea = { id: randomUUID(), answer, clue };
        if (category) idea.category = category;
        if (author) idea.author = author;
        existing.push(idea);
        newIdeas.push(idea);
      }
    });
  }

  console.log(`Existing ideas: ${(book.clue_ideas ?? []).length}`);
  console.log(`\nNEW (${newIdeas.length}):`);
  for (const i of newIdeas)
    console.log(`  + [${i.category ?? "—"}/${i.author ?? "—"}] ${i.answer} — ${i.clue}`);
  console.log(`\nBACKFILLED (${backfilled.length}):`);
  for (const b of backfilled) console.log(`  ~ ${b.answer} → ${b.fields}`);
  console.log(`\nUNCHANGED (${skipped.length}):`);
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
