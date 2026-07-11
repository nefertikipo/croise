// Make the 3 older guides (Noël, Saint-Valentin, amoureux des mots) impartial
// roundups: a mix of genuine ideas, our book mid-list, only ours linked, no
// "best/favourite" language. No prices, no em dashes.
// Usage: SANITY_WRITE_TOKEN=xxx node scripts/seed-guides-impartial.mjs

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
const ref = (id) => ({ _type: "reference", _key: key(), _ref: id });
const slug = (current) => ({ _type: "slug", current });
const seo = (title, description) => ({ _type: "seo", title, description, noIndex: false });
const ourBook = (pitch) => ({
  _type: "giftItem",
  _key: key(),
  name: "Un livre de mots fléchés personnalisé",
  description: `${pitch} Les grilles sont imprimées et reliées dans un livre à offrir, et un message se dévoile au fil des pages.`,
  href: "/fleche",
});
const idea = (name, description) => ({ _type: "giftItem", _key: key(), name, description });

const guides = [
  {
    _id: "guide-idees-cadeaux-noel-personnalises",
    _type: "giftGuide",
    title: "Idées de cadeaux personnalisés à offrir à Noël",
    slug: slug("idees-cadeaux-noel-personnalises"),
    intro:
      "Sous le sapin, rien ne vaut un cadeau qui a demandé un peu d'attention. Voici une sélection d'idées de cadeaux personnalisés à offrir à Noël.",
    occasion: "Noël",
    publishedAt: "2026-07-02T09:00:00.000Z",
    items: [
      idea(
        "Un album photo de l'année",
        "Vos meilleurs moments de l'année réunis dans un bel album à feuilleter en famille.",
      ),
      idea(
        "Un calendrier personnalisé",
        "Un calendrier pour l'année à venir, illustré de vos photos et des dates importantes.",
      ),
      ourBook(
        "Une grille remplie de souvenirs de l'année, avec un message de Noël caché au fil des pages.",
      ),
      idea(
        "Un bijou gravé",
        "Un prénom, une date ou une initiale gravés, discret et intemporel.",
      ),
      idea(
        "Une affiche à encadrer",
        "Une carte du ciel ou une jolie citation, imprimée en grand format à accrocher.",
      ),
    ],
    body: [
      block("Comment choisir", "h2"),
      block(
        "À Noël, misez sur l'émotion. Un cadeau qui rassemble des souvenirs de l'année touchera bien plus qu'un objet acheté à la dernière minute.",
      ),
    ],
    faqs: [ref("faq-offrir-noel"), ref("faq-mot-fleche-idee-cadeau")],
    seo: seo(
      "Idées de cadeaux personnalisés à offrir à Noël | Les Flèches",
      "Une sélection d'idées de cadeaux personnalisés à offrir à Noël : album photo, calendrier, livre de mots fléchés personnalisé, bijou gravé et plus.",
    ),
  },
  {
    _id: "guide-cadeaux-saint-valentin-personnalises",
    _type: "giftGuide",
    title: "Idées de cadeaux personnalisés pour la Saint-Valentin",
    slug: slug("cadeaux-saint-valentin-personnalises"),
    intro:
      "Pour dire je t'aime autrement, rien ne vaut un cadeau qui parle de vous deux. Voici une sélection d'idées de cadeaux personnalisés pour la Saint-Valentin.",
    occasion: "Saint-Valentin",
    publishedAt: "2026-07-03T09:00:00.000Z",
    items: [
      idea(
        "Un album photo de vos souvenirs",
        "Vos voyages et vos moments à deux, réunis dans un bel album.",
      ),
      idea(
        "Une carte du ciel de votre rencontre",
        "Le ciel exact du soir où tout a commencé, imprimé en poster à encadrer.",
      ),
      ourBook(
        "Vos surnoms, vos lieux et vos dates deviennent des définitions, avec une petite déclaration cachée au fil des grilles.",
      ),
      idea(
        "Un bijou gravé",
        "Les coordonnées d'un lieu ou une date qui compte, à porter tous les jours.",
      ),
      idea(
        "Un week-end surprise",
        "Une escapade à deux, pour créer de nouveaux souvenirs plutôt qu'un objet.",
      ),
    ],
    body: [
      block("Le petit plus", "h2"),
      block(
        "Un message tendre change tout. C'est la révélation, au fil des pages ou à l'arrivée, qui transforme un cadeau en déclaration.",
      ),
    ],
    faqs: [ref("faq-message-cache"), ref("faq-mot-fleche-idee-cadeau")],
    seo: seo(
      "Idées de cadeaux personnalisés pour la Saint-Valentin | Les Flèches",
      "Une sélection d'idées de cadeaux personnalisés pour la Saint-Valentin : album photo, carte du ciel, livre de mots fléchés personnalisé et plus.",
    ),
  },
  {
    _id: "guide-idees-cadeaux-amoureux-des-mots",
    _type: "giftGuide",
    title: "Idées de cadeaux personnalisés pour les amoureux des mots",
    slug: slug("idees-cadeaux-amoureux-des-mots"),
    intro:
      "Difficile de surprendre quelqu'un qui adore les jeux de lettres ? Voici une sélection d'idées de cadeaux pour les amoureux des mots.",
    occasion: "Pour les amoureux des mots",
    publishedAt: "2026-07-01T09:00:00.000Z",
    items: [
      idea(
        "Un beau livre sur la langue française",
        "Un dictionnaire amoureux ou un ouvrage sur les curiosités de la langue, à savourer.",
      ),
      idea(
        "Un jeu de société de lettres",
        "Un classique comme le Scrabble ou un jeu de mots à partager en famille.",
      ),
      ourBook(
        "Une grille sur mesure, remplie de leurs prénoms, souvenirs et clins d'œil.",
      ),
      idea(
        "Un abonnement à une revue de jeux",
        "De quoi occuper les grilles pendant des mois, pour les mordus de mots croisés.",
      ),
      idea(
        "Une affiche typographique",
        "Une citation ou un mot qui leur ressemble, joliment mis en page et encadré.",
      ),
    ],
    body: [
      block("Notre conseil", "h2"),
      block(
        "Le cadeau qui touche le plus un amateur de mots est celui qui parle de lui. Privilégiez ce qui mêle jeu et souvenir.",
      ),
    ],
    faqs: [ref("faq-quel-cadeau-amateur-de-mots"), ref("faq-imprimer-offrir-grille")],
    seo: seo(
      "Idées de cadeaux personnalisés pour les amoureux des mots | Les Flèches",
      "Une sélection d'idées de cadeaux pour les amoureux des mots : beau livre, jeu de lettres, livre de mots fléchés personnalisé, abonnement et plus.",
    ),
  },
];

const documents = deepClean(guides);
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
console.log(`Made ${documents.length} guides impartial:`);
console.log((json.results || []).map((r) => `  ${r.operation}  ${r.id}`).join("\n"));
