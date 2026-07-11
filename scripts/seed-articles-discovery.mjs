// Discovery articles targeting the "mots fléchés personnalisés" cluster.
// Book positioning, no price, no em dashes, message caché = one word per grid.
// Usage: SANITY_WRITE_TOKEN=xxx node scripts/seed-articles-discovery.mjs

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "bpesgoqn";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2026-02-01";
const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error("Missing SANITY_WRITE_TOKEN");
  process.exit(1);
}

const clean = (s) =>
  typeof s === "string" ? s.replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",") : s;
const deepClean = (v) =>
  Array.isArray(v)
    ? v.map(deepClean)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.entries(v).map(([k, val]) => [k, deepClean(val)]))
      : clean(v);

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
const A = "author-atelier-les-fleches";
const seo = (title, description) => ({ _type: "seo", title, description, noIndex: false });

// A couple of new FAQs these articles reuse.
const faqs = [
  {
    _id: "faq-ou-imprimer-mots-fleches-personnalises",
    _type: "faq",
    question: "Où faire imprimer des mots fléchés personnalisés ?",
    answer: [
      block(
        "Sur Les Flèches, vous composez votre grille en ligne gratuitement, puis nous l'imprimons et vous l'envoyons reliée dans un livre. Pas besoin de logiciel ni d'imprimante : vous recevez un objet fini, prêt à offrir.",
      ),
    ],
  },
  {
    _id: "faq-combien-de-temps-creer",
    _type: "faq",
    question: "Combien de temps faut-il pour créer des mots fléchés personnalisés ?",
    answer: [
      block(
        "Quelques minutes suffisent. Vous saisissez vos mots, choisissez un message à cacher au fil des grilles, et la grille se compose automatiquement. Vous prévisualisez le résultat avant de commander votre livre.",
      ),
    ],
  },
];

const articles = [
  {
    _id: "article-comment-creer-mots-fleches-personnalises",
    _type: "article",
    title: "Comment créer des mots fléchés personnalisés",
    slug: { _type: "slug", current: "comment-creer-mots-fleches-personnalises" },
    excerpt:
      "Créer des mots fléchés personnalisés est plus simple qu'il n'y paraît. Voici les étapes, de vos premiers mots au livre imprimé.",
    targetKeyword: "créer mots fléchés personnalisés",
    author: ref(A),
    publishedAt: "2026-07-09T08:00:00.000Z",
    body: [
      block(
        "Offrir des mots fléchés personnalisés commence par une bonne idée et quelques mots. Voici comment passer de vos souvenirs à un livre imprimé, étape par étape.",
      ),
      block("1. Rassemblez vos mots", "h2"),
      block(
        "Listez les prénoms, lieux, dates et petites manies de la personne. Ce sont eux qui rempliront la grille et rendront chaque définition unique.",
      ),
      block("2. Choisissez un message à cacher", "h2"),
      block(
        "Chaque grille peut cacher un mot. Au fil des pages de votre livre, ces mots composent un message. Comptez environ un mot par grille et gardez-le simple.",
      ),
      block("3. Composez la grille", "h2"),
      block(
        "Saisissez vos mots sur Les Flèches et laissez la grille se construire automatiquement. Vous prévisualisez le résultat gratuitement, autant de fois que vous voulez.",
      ),
      block("4. Recevez votre livre", "h2"),
      block(
        "Quand tout vous plaît, nous imprimons vos grilles dans un livre relié et vous l'envoyons, prêt à offrir.",
      ),
      callout(
        "Le secret d'une bonne grille personnalisée : des mots qui racontent une histoire commune. Prénoms, souvenirs et clins d'œil valent mieux qu'une longue liste.",
        "tip",
      ),
      ctaBlock("Composer ma grille", "/fleche"),
    ],
    faqs: [
      ref("faq-combien-de-temps-creer"),
      ref("faq-comment-creer-un-mot-fleche-personnalise"),
      ref("faq-message-cache"),
    ],
    seo: seo(
      "Comment créer des mots fléchés personnalisés | Les Flèches",
      "Comment créer des mots fléchés personnalisés en quelques minutes : rassemblez vos mots, cachez un message, composez la grille et recevez votre livre imprimé.",
    ),
  },
  {
    _id: "article-ou-faire-imprimer-mots-fleches-personnalises",
    _type: "article",
    title: "Où faire imprimer des mots fléchés personnalisés ?",
    slug: { _type: "slug", current: "ou-faire-imprimer-mots-fleches-personnalises" },
    excerpt:
      "Vous voulez offrir des mots fléchés personnalisés imprimés, sans y passer des heures ? Voici comment obtenir un vrai livre, prêt à offrir.",
    targetKeyword: "faire imprimer mots fléchés personnalisés",
    author: ref(A),
    publishedAt: "2026-07-09T09:30:00.000Z",
    body: [
      block(
        "Composer une grille soi-même, c'est faisable. La faire imprimer proprement, reliée et prête à offrir, c'est une autre affaire. Voici la solution la plus simple.",
      ),
      block("Composer en ligne, recevoir un livre", "h2"),
      block(
        "Sur Les Flèches, vous composez vos mots fléchés personnalisés en ligne, gratuitement. Nous nous occupons ensuite de l'impression et de la reliure, et vous recevez un livre fini à la maison.",
      ),
      callout(
        "Pas de logiciel, pas d'imprimante, pas de mise en page à gérer : vous composez, nous imprimons, vous offrez.",
      ),
      block("Ce qui rend le résultat unique", "h2"),
      block(
        "Chaque définition renvoie à un souvenir ou un prénom, et un message se dévoile au fil des grilles de votre livre. C'est ce qui transforme un jeu en cadeau.",
      ),
      ctaBlock("Composer mon livre", "/fleche"),
    ],
    faqs: [
      ref("faq-ou-imprimer-mots-fleches-personnalises"),
      ref("faq-imprimer-offrir-grille"),
      ref("faq-mot-fleche-idee-cadeau"),
    ],
    seo: seo(
      "Où faire imprimer des mots fléchés personnalisés ? | Les Flèches",
      "Où faire imprimer des mots fléchés personnalisés ? Composez votre grille en ligne gratuitement et recevez un livre imprimé et relié, prêt à offrir.",
    ),
  },
  {
    _id: "article-mots-fleches-personnalises-occasions",
    _type: "article",
    title: "Mots fléchés personnalisés : les meilleures occasions pour en offrir",
    slug: { _type: "slug", current: "mots-fleches-personnalises-occasions" },
    excerpt:
      "Anniversaire, mariage, retraite ou Noël : les mots fléchés personnalisés s'adaptent à toutes les occasions. Voici lesquelles s'y prêtent le mieux.",
    targetKeyword: "mots fléchés personnalisés cadeau",
    author: ref(A),
    publishedAt: "2026-07-09T11:30:00.000Z",
    body: [
      block(
        "Un livre de mots fléchés personnalisé s'offre toute l'année. Certaines occasions s'y prêtent particulièrement bien, parce qu'elles appellent un cadeau qui a du sens.",
      ),
      block("Un anniversaire", "h2"),
      block(
        "Glissez l'âge, les prénoms des proches et les grands moments de l'année. Le message caché peut annoncer un « joyeux anniversaire » au fil des grilles.",
      ),
      block("Un mariage ou un anniversaire de couple", "h2"),
      block(
        "Vos lieux, vos dates et vos souvenirs à deux font des définitions pleines de tendresse, avec une petite déclaration cachée dans le livre.",
      ),
      block("Un départ à la retraite", "h2"),
      block(
        "Collègues, projets et anecdotes de carrière : de quoi célébrer une vie professionnelle avec humour et émotion.",
      ),
      block("Noël et les fêtes", "h2"),
      block(
        "Un cadeau qui occupe les longues soirées d'hiver et rassemble toute la famille autour d'une grille à leur image.",
      ),
      ctaBlock("Composer un cadeau", "/fleche"),
    ],
    faqs: [ref("faq-mot-fleche-idee-cadeau"), ref("faq-quest-ce-quun-mot-fleche-personnalise")],
    seo: seo(
      "Mots fléchés personnalisés : les meilleures occasions pour offrir | Les Flèches",
      "Anniversaire, mariage, retraite, Noël : découvrez les meilleures occasions pour offrir des mots fléchés personnalisés, un cadeau qui a du sens.",
    ),
  },
];

const documents = deepClean([...faqs, ...articles]);
const mutations = documents.map((doc) => ({ createOrReplace: doc }));
const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}?returnIds=true`;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ mutations }),
});
const json = await res.json();
if (!res.ok) {
  console.error("Failed:", JSON.stringify(json, null, 2));
  process.exit(1);
}
console.log(`Published ${documents.length} docs:`);
console.log((json.results || []).map((r) => `  ${r.operation}  ${r.id}`).join("\n"));
