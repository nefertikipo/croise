// One-off seed script for the Les Flèches Sanity content.
// Usage: SANITY_WRITE_TOKEN=xxx node scripts/seed-sanity.mjs
// Re-runnable: uses createOrReplace with stable IDs.

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "bpesgoqn";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2026-02-01";
const token = process.env.SANITY_WRITE_TOKEN;

if (!token) {
  console.error("Missing SANITY_WRITE_TOKEN");
  process.exit(1);
}

let keySeq = 0;
const key = () => `k${(keySeq++).toString(36)}`;

// Portable Text helpers
const span = (text, marks = []) => ({ _type: "span", _key: key(), text, marks });
const block = (text, style = "normal") => ({
  _type: "block",
  _key: key(),
  style,
  markDefs: [],
  children: [span(text)],
});
const callout = (text, tone = "key") => ({ _type: "callout", _key: key(), tone, text });
const ctaBlock = (label, href, variant = "primary") => ({
  _type: "cta",
  _key: key(),
  label,
  href,
  variant,
});
// Sanity treats dots in _id as namespacing and hides such docs from the public
// perspective, so we normalise all IDs to hyphens.
const nid = (id) => id.replace(/\./g, "-");
const ref = (id) => ({ _type: "reference", _key: key(), _ref: nid(id) });

// ─────────────── Documents ───────────────

const author = {
  _id: "author.atelier-les-fleches",
  _type: "author",
  name: "L'atelier Les Flèches",
  slug: { _type: "slug", current: "atelier-les-fleches" },
  role: "Créateurs de mots fléchés et mots croisés personnalisés",
  bio: "Nous imaginons des grilles de jeux de lettres sur mesure, à offrir et à encadrer. Des cadeaux faits main, avec vos mots à vous.",
};

const siteSettings = {
  _id: "siteSettings",
  _type: "siteSettings",
  organizationName: "Les Flèches",
  description:
    "Créez des mots fléchés et mots croisés personnalisés avec vos propres mots — une idée cadeau originale, imprimée et prête à offrir.",
  socialLinks: [],
};

const faqs = [
  {
    _id: "faq.quest-ce-quun-mot-fleche-personnalise",
    _type: "faq",
    question: "Qu'est-ce qu'un mot fléché personnalisé ?",
    answer: [
      block(
        "Un mot fléché personnalisé est une grille de jeu créée à partir de vos propres mots : prénoms, souvenirs, dates ou messages. Contrairement à une grille de magazine, chaque définition et chaque réponse vous concerne, ce qui en fait un cadeau unique à offrir et à encadrer.",
      ),
    ],
  },
  {
    _id: "faq.comment-creer-un-mot-fleche-personnalise",
    _type: "faq",
    question: "Comment créer un mot fléché personnalisé ?",
    answer: [
      block(
        "Sur Les Flèches, il suffit de saisir vos mots et un éventuel message caché : notre générateur construit automatiquement une grille dense où chaque case s'entrecroise. Vous obtenez ensuite un PDF prêt à imprimer, gratuitement et sans inscription.",
      ),
    ],
  },
  {
    _id: "faq.mot-fleche-idee-cadeau",
    _type: "faq",
    question: "Le mot fléché personnalisé, est-ce une bonne idée cadeau ?",
    answer: [
      block(
        "Oui : c'est un cadeau original, personnel et peu coûteux, idéal pour un anniversaire, la Saint-Valentin, un départ à la retraite ou Noël. On y cache des souvenirs communs et un message final, puis on l'imprime pour l'offrir encadré ou relié en petit livret.",
      ),
    ],
  },
  {
    _id: "faq.difference-mots-fleches-mots-croises",
    _type: "faq",
    question: "Quelle est la différence entre mots fléchés et mots croisés ?",
    answer: [
      block(
        "Dans les mots croisés, les définitions sont listées à côté de la grille et repérées par des numéros. Dans les mots fléchés, les définitions sont écrites directement dans des cases à l'intérieur de la grille, avec une flèche indiquant le sens de lecture. Les deux se personnalisent de la même façon sur Les Flèches.",
      ),
    ],
  },
  {
    _id: "faq.imprimer-offrir-grille",
    _type: "faq",
    question: "Puis-je imprimer ma grille pour l'offrir ?",
    answer: [
      block(
        "Chaque grille s'exporte en PDF prêt à imprimer, avec sa page de solutions. Vous pouvez l'imprimer chez vous en A4, la faire encadrer, ou réunir plusieurs grilles dans un petit livret à offrir tout au long de l'année.",
      ),
    ],
  },
];

const landingPage = {
  _id: "page.mots-fleches-personnalises",
  _type: "seoLandingPage",
  title: "Mots fléchés personnalisés",
  slug: { _type: "slug", current: "mots-fleches-personnalises" },
  targetKeyword: "mots fléchés personnalisés",
  heading: "Des mots fléchés personnalisés, à votre image",
  subheading:
    "Créez une grille avec vos propres mots et un message caché, puis imprimez-la pour l'offrir. Gratuit, sans inscription, en français.",
  cta: { _type: "cta", label: "Créer ma grille", href: "/fleche", variant: "primary" },
  body: [
    block("Un cadeau qui vous ressemble", "h2"),
    block(
      "Offrir des mots fléchés personnalisés, c'est offrir bien plus qu'un jeu : c'est un condensé de souvenirs communs, de prénoms et de clins d'œil, mis en grille et prêt à encadrer. Chaque définition renvoie à votre histoire, et un message se dévoile une fois la grille complétée.",
    ),
    callout(
      "Un mot fléché personnalisé transforme vos souvenirs en un jeu à résoudre — un cadeau original, personnel et prêt à imprimer.",
    ),
    block("Comment ça marche", "h2"),
    block(
      "Saisissez vos mots, ajoutez un message caché, et laissez notre générateur composer une grille dense où chaque case s'entrecroise. Vous récupérez un PDF prêt à imprimer en quelques secondes.",
    ),
    ctaBlock("Créer ma grille gratuitement", "/fleche"),
  ],
  faqs: [
    ref("faq.quest-ce-quun-mot-fleche-personnalise"),
    ref("faq.comment-creer-un-mot-fleche-personnalise"),
    ref("faq.mot-fleche-idee-cadeau"),
    ref("faq.imprimer-offrir-grille"),
  ],
  seo: {
    _type: "seo",
    title: "Mots fléchés personnalisés à créer et imprimer | Les Flèches",
    description:
      "Créez des mots fléchés personnalisés avec vos propres mots et un message caché. PDF gratuit prêt à imprimer — une idée cadeau originale à offrir.",
    noIndex: false,
  },
};

const giftGuide = {
  _id: "guide.idees-cadeaux-amoureux-des-mots",
  _type: "giftGuide",
  title: "8 idées de cadeaux personnalisés pour les amoureux des mots",
  slug: { _type: "slug", current: "idees-cadeaux-amoureux-des-mots" },
  intro:
    "À court d'idées pour offrir à quelqu'un qui adore les jeux de lettres ? Voici huit cadeaux personnalisés, du plus simple au plus original, autour des mots.",
  occasion: "Anniversaire",
  publishedAt: "2026-07-01T09:00:00.000Z",
  items: [
    {
      _type: "giftItem",
      _key: key(),
      name: "Une grille de mots fléchés personnalisée",
      description:
        "La grille sur mesure avec vos souvenirs et un message caché. À imprimer et encadrer pour un cadeau vraiment unique.",
      href: "/fleche",
      priceBracket: "low",
    },
    {
      _type: "giftItem",
      _key: key(),
      name: "Un livret de plusieurs grilles",
      description:
        "Plusieurs mots fléchés reliés en un petit livret paginé, avec les solutions à la fin. Parfait pour occuper de longues soirées.",
      href: "/fleche",
      priceBracket: "mid",
    },
    {
      _type: "giftItem",
      _key: key(),
      name: "Un mot croisé de déclaration",
      description:
        "Cachez un « je t'aime » ou une demande spéciale dans une grille à résoudre. L'effet de surprise est garanti.",
      href: "/create",
      priceBracket: "low",
    },
    {
      _type: "giftItem",
      _key: key(),
      name: "Un abonnement mensuel",
      description:
        "Une nouvelle grille personnalisée livrée chaque mois de l'année : le cadeau qui dure.",
      href: "/fleche",
      priceBracket: "high",
    },
  ],
  body: [
    block("Nos conseils pour bien choisir", "h2"),
    block(
      "Le meilleur cadeau pour un amateur de jeux de lettres est celui qui raconte quelque chose. Privilégiez les grilles qui mêlent souvenirs communs et petit défi : c'est le mélange d'émotion et de jeu qui fait mouche.",
    ),
  ],
  faqs: [ref("faq.mot-fleche-idee-cadeau"), ref("faq.imprimer-offrir-grille")],
  seo: {
    _type: "seo",
    description:
      "8 idées de cadeaux personnalisés pour les amoureux des mots : grilles de mots fléchés, livrets, mots croisés de déclaration et plus encore.",
    noIndex: false,
  },
};

const article = {
  _id: "article.pourquoi-offrir-mots-fleches-personnalises",
  _type: "article",
  title: "Pourquoi offrir des mots fléchés personnalisés ?",
  slug: { _type: "slug", current: "pourquoi-offrir-mots-fleches-personnalises" },
  excerpt:
    "Original, personnel et peu coûteux : le mot fléché personnalisé coche toutes les cases du bon cadeau. Voici pourquoi il séduit autant.",
  targetKeyword: "offrir mots fléchés personnalisés",
  author: ref("author.atelier-les-fleches"),
  publishedAt: "2026-07-05T09:00:00.000Z",
  body: [
    block(
      "On cherche tous, un jour, le cadeau qui sort de l'ordinaire sans coûter une fortune. Le mot fléché personnalisé est de ceux-là : il demande un peu d'attention, beaucoup de tendresse, et se révèle à mesure qu'on le complète.",
    ),
    block("Un cadeau qui raconte une histoire", "h2"),
    block(
      "Chaque définition renvoie à un souvenir partagé, et un message final se dévoile une fois la grille remplie. Le destinataire ne reçoit pas seulement un jeu : il redécouvre votre histoire commune, case après case.",
    ),
    callout(
      "Le meilleur cadeau n'est pas le plus cher, c'est celui qui prouve qu'on a pris le temps de penser à l'autre.",
      "tip",
    ),
    block("Facile à créer, prêt à imprimer", "h2"),
    block(
      "Pas besoin d'être un pro des jeux de lettres : le générateur compose la grille pour vous à partir de vos mots. Vous obtenez un PDF prêt à imprimer, à encadrer ou à relier en livret.",
    ),
    ctaBlock("Créer ma grille personnalisée", "/fleche"),
  ],
  faqs: [
    ref("faq.mot-fleche-idee-cadeau"),
    ref("faq.comment-creer-un-mot-fleche-personnalise"),
  ],
  seo: {
    _type: "seo",
    description:
      "Pourquoi le mot fléché personnalisé est une idée cadeau originale, personnelle et abordable — et comment créer le vôtre en quelques minutes.",
    noIndex: false,
  },
};

// The first seed run used dotted IDs (hidden from public reads); delete those.
const OLD_DOTTED_IDS = [
  "author.atelier-les-fleches",
  "faq.quest-ce-quun-mot-fleche-personnalise",
  "faq.comment-creer-un-mot-fleche-personnalise",
  "faq.mot-fleche-idee-cadeau",
  "faq.difference-mots-fleches-mots-croises",
  "faq.imprimer-offrir-grille",
  "page.mots-fleches-personnalises",
  "guide.idees-cadeaux-amoureux-des-mots",
  "article.pourquoi-offrir-mots-fleches-personnalises",
];

const documents = [author, siteSettings, ...faqs, landingPage, giftGuide, article].map(
  (doc) => ({ ...doc, _id: nid(doc._id) }),
);
const mutations = [
  ...OLD_DOTTED_IDS.map((id) => ({ delete: { id } })),
  ...documents.map((doc) => ({ createOrReplace: doc })),
];

const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}?returnIds=true`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ mutations }),
});

const json = await res.json();
if (!res.ok) {
  console.error("Seeding failed:", JSON.stringify(json, null, 2));
  process.exit(1);
}
console.log(`Seeded ${documents.length} documents:`);
console.log((json.results || []).map((r) => `  ${r.operation}  ${r.id}`).join("\n"));
