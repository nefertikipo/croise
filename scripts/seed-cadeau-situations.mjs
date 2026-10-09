// "Cadeau personnalisé" declined across every situation (recipients, occasions, Noël).
// One impartial gift guide per situation, each with two situation-specific FAQs
// (FAQPage JSON-LD) and links to sibling guides. Our carnet sits mid-list and is
// the only item with a link. No prices, no em dashes.
//
// Usage:
//   node scripts/seed-cadeau-situations.mjs --json > .context/cadeau-situations.json
//   SANITY_WRITE_TOKEN=xxx node scripts/seed-cadeau-situations.mjs            (writes drafts)
//   SANITY_WRITE_TOKEN=xxx node scripts/seed-cadeau-situations.mjs --publish  (writes published)

import { RECIPIENTS } from "./content/cadeau-situations-recipients.mjs";
import { OCCASIONS } from "./content/cadeau-situations-occasions.mjs";
import { NOEL } from "./content/cadeau-situations-noel.mjs";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "bpesgoqn";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2026-02-01";
const asJson = process.argv.includes("--json");
const publish = process.argv.includes("--publish");

// Safety net: never let an em/en dash reach the content.
const clean = (s) =>
  typeof s === "string"
    ? s
        .replace(/\s*[—–]\s*/g, ", ")
        .replace(/,\s*,/g, ",")
        .replace(/\s+,/g, ",")
        .replace(/,\s*([.!?])/g, "$1")
    : s;
const deepClean = (v) =>
  Array.isArray(v)
    ? v.map(deepClean)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.entries(v).map(([k, val]) => [k, deepClean(val)]))
      : clean(v);

let keySeq = 0;
const key = () => `k${(keySeq++).toString(36)}`;
const span = (text, marks = []) => ({ _type: "span", _key: key(), text, marks });
const block = (text, style = "normal") => ({
  _type: "block",
  _key: key(),
  style,
  markDefs: [],
  children: [span(text)],
});
const bullet = (text) => ({ ...block(text), listItem: "bullet", level: 1 });
const linkBullet = (text, href) => {
  const linkKey = key();
  return {
    _type: "block",
    _key: key(),
    style: "normal",
    listItem: "bullet",
    level: 1,
    markDefs: [{ _type: "link", _key: linkKey, href }],
    children: [span(text, [linkKey])],
  };
};
const ref = (id) => ({ _type: "reference", _key: key(), _ref: id });

// Our item: described like the others, tailored per situation, the only link.
const CARNET_HREF = "/livre/nouveau";
const carnetItem = (pitch) => ({
  _type: "giftItem",
  _key: key(),
  name: "Un carnet de mots fléchés personnalisé",
  description: `${pitch} Vous choisissez les mots (prénoms, lieux, souvenirs, private jokes), les grilles se construisent autour et se prévisualisent gratuitement. Chaque grille cache un mot, et bout à bout ils forment un message. Le tout est imprimé et relié dans un vrai carnet.`,
  href: CARNET_HREF,
});
const ideaItem = ([name, description]) => ({ _type: "giftItem", _key: key(), name, description });
const oursItem = ({ name, description, href }) => ({ _type: "giftItem", _key: key(), name, description, href });

// Titles of guides that already exist in Sanity, for "À lire aussi" links.
const EXISTING_TITLES = {
  "cadeaux-personnalises-couple": "Cadeaux personnalisés pour son copain ou sa copine",
  "cadeaux-personnalises-grand-mere": "Cadeaux personnalisés pour une grand-mère",
  "cadeaux-personnalises-meilleur-ami": "Cadeaux personnalisés pour un(e) meilleur(e) ami(e)",
  "cadeaux-personnalises-parents": "Cadeaux personnalisés pour ses parents",
  "cadeaux-saint-valentin-personnalises": "Cadeaux personnalisés pour la Saint-Valentin",
  "idees-cadeaux-amoureux-des-mots": "Cadeaux pour les amoureux des mots",
  "idees-cadeaux-noel-personnalises": "Cadeaux personnalisés à offrir à Noël",
  "meilleures-idees-cadeaux-personnalises": "Les idées de cadeaux personnalisés",
};

// `group` drives the sections of /guides; a situation can override its default.
const SITUATIONS = [
  ...RECIPIENTS.map((s) => ({ group: "destinataire", ...s })),
  ...OCCASIONS.map((s) => ({ group: "occasion", ...s })),
  ...NOEL.map((s) => ({ group: "fete", ...s })),
];
const titleFor = (slug) => {
  const s = SITUATIONS.find((x) => x.slug === slug);
  if (s) return s.title;
  if (EXISTING_TITLES[slug]) return EXISTING_TITLES[slug];
  throw new Error(`Unknown related slug: ${slug}`);
};

const publishedAt = new Date().toISOString();

function buildSituation(s) {
  const faqDocs = s.faqs.map(([question, answer], i) => ({
    _id: `faq-${s.slug}-${i + 1}`,
    _type: "faq",
    question,
    answer: [block(answer)],
  }));

  const items = s.items.map((it) =>
    it.carnet ? carnetItem(it.carnet) : it.ours ? oursItem(it.ours) : ideaItem(it),
  );
  const carnetCount = items.filter((it) => it.href).length;
  const carnetIndex = items.findIndex((it) => it.href);
  if (carnetCount !== 1 || carnetIndex === 0 || carnetIndex === items.length - 1) {
    throw new Error(`${s.slug}: our item must appear exactly once, mid-list`);
  }

  const body = [
    block(s.tipsTitle, "h2"),
    ...s.tips.map((t) => block(t)),
    block(s.wordsTitle, "h2"),
    block(s.wordsIntro),
    ...s.words.map((w) => bullet(w)),
    block("À lire aussi", "h2"),
    ...s.related.map((slug) => linkBullet(titleFor(slug), `/guides/${slug}`)),
  ];

  const guide = {
    _id: `guide-${s.slug}`,
    _type: "giftGuide",
    title: s.title,
    slug: { _type: "slug", current: s.slug },
    occasion: s.occasion,
    group: s.group,
    intro: s.intro,
    items,
    body,
    faqs: faqDocs.map((f) => ref(f._id)),
    publishedAt,
    seo: { _type: "seo", title: s.seoTitle, description: s.seoDescription, noIndex: false },
  };
  if (guide.intro.length > 320) throw new Error(`${s.slug}: intro over 320 chars`);
  return [...faqDocs, guide];
}

const docs = deepClean(SITUATIONS.flatMap(buildSituation));

const slugs = SITUATIONS.map((s) => s.slug);
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupes.length) throw new Error(`Duplicate slugs: ${dupes.join(", ")}`);

if (asJson) {
  process.stdout.write(JSON.stringify(docs, null, 2));
  process.exit(0);
}

const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error("Missing SANITY_WRITE_TOKEN (or pass --json to print the documents)");
  process.exit(1);
}

const mutations = docs.map((doc) => ({
  createOrReplace: publish ? doc : { ...doc, _id: `drafts.${doc._id}` },
}));
const res = await fetch(
  `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations }),
  },
);
if (!res.ok) {
  console.error(`Sanity mutate failed (${res.status}):`, await res.text());
  process.exit(1);
}
console.error(
  `Wrote ${docs.length} documents (${SITUATIONS.length} guides) as ${publish ? "published" : "drafts"}.`,
);
