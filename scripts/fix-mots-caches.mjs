// Correct the "message caché" mechanic: it is spelled ACROSS the grids of a BOOK,
// page by page, not revealed in a single grid. Rewrites the message-centric
// article + FAQ, and sweeps single-grid phrasing out of every other doc.
// Keeps examples short. No em dashes.
// Usage: SANITY_WRITE_TOKEN=xxx node scripts/fix-mots-caches.mjs

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "bpesgoqn";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2026-02-01";
const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error("Missing SANITY_WRITE_TOKEN");
  process.exit(1);
}

// Single-grid -> book phrasing corrections, applied in order to every string.
const REPLACEMENTS = [
  ["une grille cache un message qui se dévoile à la fin", "un message se dévoile au fil des grilles de votre livre"],
  ["un message final se dévoile une fois la grille remplie", "un message se dévoile au fil des grilles de votre livre"],
  ["un message se dévoile une fois la grille complétée", "un message se dévoile au fil des grilles de votre livre"],
  ["se dévoile une fois la grille complétée", "se dévoile au fil des grilles de votre livre"],
  ["se dévoile une fois la grille remplie", "se dévoile au fil des grilles de votre livre"],
  ["se révèle à la dernière case", "se dévoile au fil des grilles de votre livre"],
  ["se dévoile à la dernière case", "se dévoile au fil des grilles de votre livre"],
  ["La grille dont la dernière case révèle un", "Un livre où, au fil des grilles, se compose un"],
  ["dont la dernière case révèle un", "où, au fil des grilles, se compose un"],
  ["la dernière case révèle", "les grilles composent"],
  ["Une grille dont la solution dévoile un message", "Un livre dont les grilles composent un message"],
  ["dont la solution dévoile un message", "dont les grilles composent un message"],
  ["dont la solution dévoile", "dont les grilles composent"],
  ["à la dernière case", "au fil des grilles de votre livre"],
  ["une grille cache un message", "votre livre cache un message"],
];
const applyReplacements = (s) => {
  let out = s;
  for (const [a, b] of REPLACEMENTS) out = out.split(a).join(b);
  return out;
};
const clean = (s) =>
  typeof s === "string"
    ? applyReplacements(s).replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",")
    : s;

let keySeq = 0;
const key = () => `k${(keySeq++).toString(36)}`;
const span = (text) => ({ _type: "span", _key: key(), text, marks: [] });
const block = (text, style = "normal") => ({
  _type: "block",
  _key: key(),
  style,
  markDefs: [],
  children: [span(text)],
});
const callout = (text, tone = "key") => ({ _type: "callout", _key: key(), tone, text });
const ctaBlock = (label, href) => ({ _type: "cta", _key: key(), label, href, variant: "primary" });
const ref = (id) => ({ _type: "reference", _key: key(), _ref: id });

// Volatile fields to drop when re-writing swept docs.
const VOLATILE = new Set(["_rev", "_createdAt", "_updatedAt", "_system"]);
let sweepChanged = false;
const sweep = (v) => {
  if (Array.isArray(v)) return v.map(sweep);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([k]) => !VOLATILE.has(k))
        .map(([k, val]) => [k, sweep(val)]),
    );
  }
  if (typeof v === "string") {
    const out = clean(v);
    if (out !== v) sweepChanged = true;
    return out;
  }
  return v;
};

// ---- Full rewrites of the two message-centric docs ----
const article = {
  _id: "article-messages-a-cacher-mots-fleches",
  _type: "article",
  title: "Quel message cacher dans un livre de mots fléchés personnalisé ?",
  slug: { _type: "slug", current: "messages-a-cacher-mots-fleches" },
  excerpt:
    "Dans un livre personnalisé, chaque grille cache un mot, et ces mots composent un message. Comptez un mot par grille. Voici des idées.",
  targetKeyword: "message caché mots fléchés",
  author: ref("author-atelier-les-fleches"),
  publishedAt: "2026-07-06T09:00:00.000Z",
  body: [
    block(
      "Dans un livre de mots fléchés personnalisé, chaque grille cache un mot. Au fil des pages, ces mots composent un message qui se dévoile petit à petit. Comptez environ un mot par grille.",
    ),
    block("Pour dire je t'aime", "h2"),
    block(
      "« JE T'AIME », « POUR TOUJOURS », ou le prénom de l'être aimé. Un mot par grille, et le message se construit.",
    ),
    block("Pour marquer un événement", "h2"),
    block("« JOYEUX ANNIVERSAIRE », « BIENVENUE BÉBÉ », ou « MERCI POUR TOUT »."),
    callout(
      "Comptez un mot par grille : un livre de dix grilles cache un message de dix mots. Adaptez la longueur du message au nombre de grilles.",
      "tip",
    ),
    block("Pour une occasion", "h2"),
    block("« JOYEUX NOËL », « BONNE RETRAITE », ou « FÉLICITATIONS »."),
    ctaBlock("Composer mon livre", "/fleche"),
  ],
  faqs: [ref("faq-message-cache"), ref("faq-comment-creer-un-mot-fleche-personnalise")],
  seo: {
    _type: "seo",
    title: "Quel message cacher dans un livre de mots fléchés personnalisé ? | Les Flèches",
    description:
      "Dans un livre de mots fléchés personnalisé, un message se dévoile au fil des grilles. Nos idées de messages à cacher, courts et efficaces.",
    noIndex: false,
  },
};

const faq = {
  _id: "faq-message-cache",
  _type: "faq",
  question: "Peut-on cacher un message dans le livre ?",
  answer: [
    block(
      "Oui. Chaque grille cache un mot, et au fil de votre livre ces mots composent un message. Comptez environ un mot par grille : de quoi glisser un « joyeux anniversaire » ou une petite déclaration. C'est souvent le cœur du cadeau.",
    ),
  ],
};

const REWRITTEN_IDS = new Set([article._id, faq._id]);

// ---- Fetch all content docs and sweep the rest ----
const TYPES = ["article", "seoLandingPage", "giftGuide", "faq", "author", "category", "siteSettings"];
const base = `https://${projectId}.api.sanity.io/v${apiVersion}/data`;
const query = `*[_type in $types && !(_id in path("drafts.**"))]`;
const qUrl = `${base}/query/${dataset}?query=${encodeURIComponent(query)}&$types=${encodeURIComponent(JSON.stringify(TYPES))}`;
const qRes = await fetch(qUrl, { headers: { Authorization: `Bearer ${token}` } });
const { result: docs } = await qRes.json();
if (!docs) {
  console.error("No docs fetched");
  process.exit(1);
}

const mutations = [
  { createOrReplace: article },
  { createOrReplace: faq },
];
for (const doc of docs) {
  if (REWRITTEN_IDS.has(doc._id)) continue;
  sweepChanged = false;
  const cleaned = sweep(doc);
  if (sweepChanged) mutations.push({ createOrReplace: cleaned });
}

const mRes = await fetch(`${base}/mutate/${dataset}?returnIds=true`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ mutations }),
});
const mJson = await mRes.json();
if (!mRes.ok) {
  console.error("Failed:", JSON.stringify(mJson, null, 2));
  process.exit(1);
}
console.log(`Corrected ${mutations.length} docs (article + faq rewritten, rest swept):`);
console.log((mJson.results || []).map((r) => `  ${r.operation}  ${r.id}`).join("\n"));
