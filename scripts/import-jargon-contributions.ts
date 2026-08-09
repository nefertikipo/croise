/**
 * One-off: add a curated batch of pop-culture / jargon clue "contributions" to
 * the community list shown on /contribuer (words + clues tables, origin="user"),
 * each scored with a difficulty.
 *
 * Clues are written in a terse mots-fléchés register: short nominal phrases, no
 * trailing period, first letter capitalized — the way a grille reads.
 *
 * Difficulty is on the 1-3 scale the /contribuer page renders:
 *   1 = Facile, 2 = Moyen, 3 = Difficile
 * (the schema allows 1-5, but the page's label array only covers 1-3, so a 4/5
 * would render blank — see src/app/contribuer/page.tsx).
 *
 * Mirrors POST /api/admin/contribute: find-or-create the French word
 * (quality 90), then insert the clue as origin="user", verified=false (pending
 * review, like a real submission — the /contribuer list shows it regardless of
 * verified, but grid generation only uses verified clues). Also stamps a `vibe`
 * and a theme `tag` since the schema supports them.
 *
 * Idempotent: skips a clue if the same (word, clue) pair already exists (in the
 * DB or earlier in this run).
 *
 * Dry-run by default. Pass --apply to write.
 *   set -a; source .env.local; set +a
 *   node_modules/.bin/tsx scripts/import-jargon-contributions.ts          # preview
 *   node_modules/.bin/tsx scripts/import-jargon-contributions.ts --apply  # write
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { words, clues } from "../src/db/schema/clue-entries";
import { normalizeAnswer } from "../src/lib/crossword/normalize";

const APPLY = process.argv.includes("--apply");
const VERIFIED = false; // pending review, matching the real contribute flow

type Row = [word: string, clue: string, difficulty: 1 | 2 | 3];

// Grouped by theme. `vibe` is a clues.vibe value; `tag` lands in clues.tags.
const THEMES: { name: string; vibe: string; tag: string; rows: Row[] }[] = [
  {
    name: "Jargon du bureau & de la tech",
    vibe: "fun",
    tag: "tech",
    rows: [
      ["ASAP", "Sigle des pressés", 2],
      ["BUG", "Bête noire du développeur", 1],
      ["CALL", "Réunion qui s'ignore", 2],
      ["CAPTCHA", "Test d'humanité en ligne", 2],
      ["CRM", "Mémoire vive du commercial", 3],
      ["GHOST", "Esprit frappeur du dating", 2],
      ["SCROLL", "Marathon pour le pouce", 2],
      ["SLACK", "Machine à café virtuelle", 2],
      ["SPAM", "Courrier importun", 1],
      ["WIFI", "Fil invisible convoité", 1],
    ],
  },
  {
    name: "Quotidien, lifestyle & consommation",
    vibe: "fun",
    tag: "lifestyle",
    rows: [
      ["CROCS", "Sabots percés mais assumés", 1],
      ["DYSON", "Tornade d'intérieur", 2],
      ["MATCHA", "Poudre verte qui se fait mousser", 2],
      ["PICARD", "Sauveur du surgelé", 2],
      ["RACLETTE", "Sport d'hiver à table", 1],
      ["SOPALIN", "Éponge de papier", 1],
      ["STRAVA", "Vitrine de la sueur", 2],
      ["TINDER", "Balayage amoureux", 2],
      ["UBER", "Chauffeur de poche", 1],
      ["VELOTAFF", "Trajet au jus de mollet", 3],
      ["VINTED", "Braderie de poche", 2],
    ],
  },
  {
    name: "Écrans, pop culture & séries",
    vibe: "pop-culture",
    tag: "series",
    rows: [
      ["BINGE", "Gavage télévisuel", 2],
      ["GIF", "Boucle muette", 2],
      ["KAAMELOTT", "Table ronde à la française", 2],
      ["KOHLANTA", "Camping sur TF1", 2],
      ["LUPIN", "Voleur en col blanc", 2],
      ["MACGYVER", "Héros au trombone", 2],
      ["MEME", "Blague virale", 1],
      ["POUDLARD", "Internat à magie", 1],
      ["SPOIL", "Révélation qui fâche", 2],
      ["TOTEM", "Immunité de plage", 2],
      ["TOUDOUM", "Jingle du canapé", 3],
      ["WIKIPEDIA", "Sauveur d'exposé", 1],
      ["WINTER", "Il vient, chez les Stark", 2],
    ],
  },
  {
    name: "Musique, jeux & célébrités",
    vibe: "pop-culture",
    tag: "celebrities",
    rows: [
      ["DAFT", "Moitié de duo casqué", 2],
      ["JUL", "Ovni marseillais", 2],
      ["OASIS", "Frères ennemis de la Britpop", 2],
      ["SIMS", "Vie par procuration", 2],
      ["SWIFT", "Reine de la pop", 1],
      ["UNO", "Brouille-amis à coups de +4", 1],
      ["ZELDA", "Princesse prise pour son héros", 2],
    ],
  },
  {
    name: "Numérique, réseaux & nouvelles habitudes",
    vibe: "fun",
    tag: "digital",
    rows: [
      ["HASHTAG", "Dièse qui a réussi", 2],
      ["LIKE", "Unité de validation sociale", 1],
      ["SWIPE", "Coup de pouce sur un profil", 2],
      ["EMOJI", "Petit dessin qui parle", 1],
      ["TWEET", "Gazouillis devenu X", 1],
      ["PODCAST", "Radio de poche", 1],
      ["QRCODE", "Labyrinthe carré à flasher", 2],
      ["SNOOZE", "Bouton de la flemme matinale", 2],
      ["REPLAY", "Seconde chance télévisée", 2],
      ["INFLUENCEUR", "Homme-sandwich d'Internet", 1],
    ],
  },
  {
    name: "Nourriture, cuisine & consommation",
    vibe: "fun",
    tag: "food",
    rows: [
      ["BURRATA", "Mozzarella au cœur coulant", 2],
      ["TUPPERWARE", "Boîte qui ne revient jamais", 1],
      ["NUTELLA", "L'or brun des crêpes", 1],
      ["VEGAN", "Ami des vaches", 1],
      ["SUSHI", "Rouleau venu du Japon", 1],
      ["KLEENEX", "Éponge à gros chagrin", 1],
      ["SCOTCH", "Ruban qui colle, pas qui se boit", 1],
      ["VELIB", "Deux-roues des Parisiens", 2],
      ["IKEA", "Meubles en kit et boulettes", 1],
    ],
  },
  {
    name: "Jeux, geeks & nostalgie",
    vibe: "pop-culture",
    tag: "gaming",
    rows: [
      ["TETRIS", "Rangement de briques sous pression", 1],
      ["PACMAN", "Goinfre jaune du labyrinthe", 1],
      ["MARIO", "Plombier moustachu à champignons", 1],
      ["AVATAR", "Bleu chez Cameron, vous en ligne", 2],
      ["QWERTY", "Clavier qui perd le nord en France", 2],
      ["POKEMON", "Monstres de poche à attraper", 1],
      ["TAMAGOTCHI", "Animal numérique qui mourait vite", 2],
    ],
  },
  {
    name: "Personnages cultes & icônes pop",
    vibe: "pop-culture",
    tag: "characters",
    rows: [
      ["ASTERIX", "Irréductible sous potion", 1],
      ["ZIDANE", "Roulette et coup de tête", 1],
      ["BATMAN", "Milliardaire en rongeur volant", 1],
      ["SHREK", "Ogre vert des marais", 1],
      ["BOND", "Martini au shaker, pas à la cuillère", 2],
      ["JACK", "Recalé de la porte flottante", 2],
      ["GANDALF", "Il vous empêche de passer", 2],
    ],
  },
  {
    name: "Littérature française",
    vibe: "literary",
    tag: "literature",
    rows: [
      ["PROUST", "Tout un roman pour une madeleine", 2],
      ["PROUST", "Écrivain à la madeleine", 2],
      ["HUGO", "Victor, pas Lloris", 2],
      ["HUGO", "Père de Cosette et Quasimodo", 2],
      ["MOLIERE", "Patron de notre langue", 2],
      ["MOLIERE", "Père du Malade imaginaire", 2],
      ["CAMUS", "Fâché avec l'Étranger", 2],
      ["CAMUS", "Auteur de l'Étranger", 2],
      ["ZOLA", "Il a écrit « J'accuse »", 2],
      ["BAUDELAIRE", "Poète aux fleurs toxiques", 2],
      ["BOVARY", "Madame qui s'ennuie en Normandie", 2],
      ["BALZAC", "Architecte de la Comédie humaine", 2],
      ["CYRANO", "Un nez qui fait des vers", 1],
    ],
  },
  {
    name: "Mythologie & patrimoine",
    vibe: "literary",
    tag: "mythology",
    rows: [
      ["LOUVRE", "Maison de la Joconde", 1],
      ["CUPIDON", "Archer de la Saint-Valentin", 1],
      ["JUPITER", "Patron de l'Olympe, parfois de l'Élysée", 2],
      ["HELOISE", "Le grand amour d'Abélard", 3],
      ["VENUS", "Déesse sortie d'un coquillage", 2],
      ["CESAR", "Franchit le Rubicon, inspire une salade", 2],
    ],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — run: set -a; source .env.local; set +a");
    process.exit(1);
  }
  const db = drizzle(neon(process.env.DATABASE_URL));

  const seen = new Set<string>(); // guard against same (word, clue) twice in one run
  let created = 0;
  let inserted = 0;
  let skipped = 0;

  for (const theme of THEMES) {
    console.log(`\n## ${theme.name}  (vibe=${theme.vibe}, tag=${theme.tag})`);
    for (const [rawWord, rawClue, difficulty] of theme.rows) {
      const word = normalizeAnswer(rawWord);
      const clueText = rawClue.trim();

      if (word.length < 2 || word.length > 15) {
        console.log(`  ! SKIP ${rawWord} — length ${word.length} out of 2-15`);
        skipped++;
        continue;
      }

      const key = `${word} ${clueText}`;
      if (seen.has(key)) {
        console.log(`  = DUP  ${word} — "${clueText}" (repeated in batch)`);
        skipped++;
        continue;
      }
      seen.add(key);

      // Find-or-create the French word.
      let [existing] = await db
        .select({ id: words.id })
        .from(words)
        .where(and(eq(words.word, word), eq(words.language, "fr")))
        .limit(1);

      const wordExists = !!existing;
      let wordId = existing?.id ?? -1;

      if (!wordExists && APPLY) {
        const [ins] = await db
          .insert(words)
          .values({ word, length: word.length, language: "fr", qualityScore: 90, frequency: 1 })
          .onConflictDoNothing()
          .returning({ id: words.id });
        if (ins) {
          wordId = ins.id;
        } else {
          [existing] = await db
            .select({ id: words.id })
            .from(words)
            .where(and(eq(words.word, word), eq(words.language, "fr")))
            .limit(1);
          wordId = existing!.id;
        }
      }
      if (!wordExists) created++;

      // Dedupe: skip if this exact (word, clue) already exists in the DB.
      if (wordExists) {
        const dupes = await db
          .select({ id: clues.id })
          .from(clues)
          .where(and(eq(clues.wordId, wordId), eq(clues.clue, clueText)))
          .limit(1);
        if (dupes.length) {
          console.log(`  = DUP  ${word} — "${clueText}" (already in DB)`);
          skipped++;
          continue;
        }
      }

      const label = ["", "Facile", "Moyen", "Difficile"][difficulty];
      console.log(
        `  ${wordExists ? "+clue" : "+word"} ${word.padEnd(12)} [${label}] — ${clueText}`,
      );

      if (APPLY) {
        await db.insert(clues).values({
          wordId,
          clue: clueText,
          language: "fr",
          difficulty,
          vibe: theme.vibe,
          tags: ["jargon", theme.tag],
          source: "user",
          origin: "user",
          verified: VERIFIED,
        });
      }
      inserted++;
    }
  }

  const total = THEMES.reduce((n, t) => n + t.rows.length, 0);
  console.log(
    `\n${APPLY ? "WROTE" : "PREVIEW"}: ${inserted} clues to insert, ` +
      `${created} new words, ${skipped} skipped — of ${total} total.`,
  );
  if (!APPLY) console.log("(dry-run — pass --apply to write)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
