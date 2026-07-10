// Second content batch for Les Flèches (launch set).
// Usage: SANITY_WRITE_TOKEN=xxx node scripts/seed-sanity-batch2.mjs
// Re-runnable: createOrReplace with stable hyphen IDs (no dots — dotted IDs are
// hidden from the public perspective).

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
const ref = (id) => ({ _type: "reference", _key: key(), _ref: id });
const slug = (current) => ({ _type: "slug", current });
const seo = (description, title) => ({ _type: "seo", title, description, noIndex: false });

// ─────────────── FAQs ───────────────
const faqs = [
  {
    _id: "faq-mots-croises-personnalises",
    _type: "faq",
    question: "Comment créer des mots croisés personnalisés ?",
    answer: [
      block(
        "Il suffit d'entrer vos mots et un éventuel message : le générateur les entrecroise automatiquement dans une grille, puis produit un PDF prêt à imprimer. Vous obtenez des mots croisés uniques, construits autour de votre histoire, gratuitement et sans inscription.",
      ),
    ],
  },
  {
    _id: "faq-quel-cadeau-amateur-de-mots",
    _type: "faq",
    question: "Quel cadeau offrir à quelqu'un qui aime les mots ?",
    answer: [
      block(
        "Pour un amateur de jeux de lettres, le cadeau idéal mêle défi et émotion : une grille de mots fléchés ou de mots croisés personnalisée, un livret de plusieurs grilles, ou un abonnement mensuel. On y cache prénoms, souvenirs et un message final, puis on l'imprime pour l'offrir.",
      ),
    ],
  },
  {
    _id: "faq-message-cache",
    _type: "faq",
    question: "Peut-on cacher un message dans la grille ?",
    answer: [
      block(
        "Oui. Sur Les Flèches, vous pouvez définir un mot ou une phrase caché(e) qui se révèle une fois la grille complétée — une déclaration, une invitation ou une bonne nouvelle. C'est souvent le cœur du cadeau.",
      ),
    ],
  },
  {
    _id: "faq-offrir-noel",
    _type: "faq",
    question: "Le mot fléché personnalisé est-il une bonne idée pour Noël ?",
    answer: [
      block(
        "Parfaitement : c'est un cadeau original et peu coûteux, à glisser sous le sapin. On y cache des souvenirs de l'année et un message de Noël, puis on l'imprime et on l'encadre — ou on relie plusieurs grilles en un petit livret à déballer.",
      ),
    ],
  },
];

// ─────────────── Landing pages ───────────────
const landingPages = [
  {
    _id: "page-mot-croise-personnalise",
    _type: "seoLandingPage",
    title: "Mots croisés personnalisés",
    slug: slug("mot-croise-personnalise"),
    targetKeyword: "mots croisés personnalisés",
    heading: "Des mots croisés personnalisés, rien que pour vous",
    subheading:
      "Composez une grille de mots croisés avec vos propres mots et un message caché, puis imprimez-la pour l'offrir. Gratuit, sans inscription, en français.",
    cta: { _type: "cta", label: "Créer ma grille", href: "/fleche", variant: "primary" },
    body: [
      block("Le jeu de lettres qui raconte votre histoire", "h2"),
      block(
        "Un mot croisé personnalisé n'a rien d'une grille de magazine : chaque définition renvoie à un souvenir, un prénom ou un clin d'œil qui vous appartient. À résoudre, à encadrer, à offrir.",
      ),
      callout(
        "Des mots croisés personnalisés transforment vos souvenirs en un jeu à résoudre — un cadeau unique, prêt à imprimer.",
      ),
      block("Mots croisés ou mots fléchés ?", "h2"),
      block(
        "Les deux se personnalisent de la même façon. Dans les mots croisés, les définitions sont listées à côté de la grille ; dans les mots fléchés, elles s'inscrivent dans les cases avec une flèche. Choisissez le style que préfère la personne à qui vous l'offrez.",
      ),
      ctaBlock("Créer ma grille gratuitement", "/fleche"),
    ],
    faqs: [
      ref("faq-mots-croises-personnalises"),
      ref("faq-difference-mots-fleches-mots-croises"),
      ref("faq-message-cache"),
      ref("faq-imprimer-offrir-grille"),
    ],
    seo: seo(
      "Créez des mots croisés personnalisés avec vos propres mots et un message caché. PDF gratuit prêt à imprimer — une idée cadeau originale à offrir.",
      "Mots croisés personnalisés à créer et imprimer | Les Flèches",
    ),
  },
  {
    _id: "page-idee-cadeau-mots-fleches",
    _type: "seoLandingPage",
    title: "Idée cadeau : mots fléchés personnalisés",
    slug: slug("idee-cadeau-mots-fleches"),
    targetKeyword: "idée cadeau mots fléchés",
    heading: "Une idée cadeau originale et personnelle",
    subheading:
      "À court d'idées ? Offrez une grille de mots fléchés personnalisée : vos souvenirs, vos mots, un message caché — imprimée et prête à offrir.",
    cta: { _type: "cta", label: "Créer un cadeau", href: "/fleche", variant: "primary" },
    body: [
      block("Le cadeau qui prouve qu'on a pris le temps", "h2"),
      block(
        "On cherche tous le cadeau qui sort de l'ordinaire sans se ruiner. Une grille personnalisée coche toutes les cases : originale, personnelle, abordable, et remplie d'attentions. Idéale pour un anniversaire, la Saint-Valentin, un départ à la retraite ou Noël.",
      ),
      callout(
        "Le meilleur cadeau n'est pas le plus cher : c'est celui qui montre qu'on a pensé à l'autre, souvenir après souvenir.",
        "tip",
      ),
      block("Prêt en quelques minutes", "h2"),
      block(
        "Saisissez vos mots, ajoutez un message caché, et récupérez un PDF prêt à imprimer. À encadrer ou à relier en petit livret.",
      ),
      ctaBlock("Créer mon cadeau", "/fleche"),
    ],
    faqs: [
      ref("faq-quel-cadeau-amateur-de-mots"),
      ref("faq-mot-fleche-idee-cadeau"),
      ref("faq-comment-creer-un-mot-fleche-personnalise"),
    ],
    seo: seo(
      "Une idée cadeau originale et personnelle : offrez des mots fléchés personnalisés avec vos souvenirs et un message caché. Gratuit, prêt à imprimer.",
      "Idée cadeau originale : mots fléchés personnalisés | Les Flèches",
    ),
  },
];

// ─────────────── Articles ───────────────
const articles = [
  {
    _id: "article-messages-a-cacher-mots-fleches",
    _type: "article",
    title: "10 idées de messages à cacher dans un mot fléché personnalisé",
    slug: slug("messages-a-cacher-mots-fleches"),
    excerpt:
      "Le message caché, c'est le cœur d'une grille personnalisée. Voici 10 idées, de la déclaration d'amour à l'annonce surprise.",
    targetKeyword: "message caché mots fléchés",
    author: ref("author-atelier-les-fleches"),
    publishedAt: "2026-07-06T09:00:00.000Z",
    body: [
      block(
        "Une grille personnalisée se termine toujours par un moment : celui où la dernière case révèle un mot ou une phrase. Voici dix idées de messages à cacher, selon l'occasion et la personne.",
      ),
      block("Pour dire je t'aime", "h2"),
      block(
        "Un simple « JE T'AIME », un surnom, la date de votre rencontre, ou le lieu de votre premier baiser. Court, direct, efficace.",
      ),
      block("Pour annoncer une surprise", "h2"),
      block(
        "« ON PART À VENISE », « TU VAS ÊTRE GRAND FRÈRE », « VEUX-TU M'ÉPOUSER » : le jeu fait durer le suspense jusqu'à la révélation.",
      ),
      callout(
        "Le meilleur message caché est celui que seule la personne concernée peut vraiment comprendre.",
        "tip",
      ),
      block("Pour une occasion", "h2"),
      block(
        "« JOYEUX ANNIVERSAIRE », « BONNE RETRAITE », « JOYEUX NOËL » suivi d'un petit mot doux dans les définitions autour.",
      ),
      ctaBlock("Créer ma grille avec un message caché", "/fleche"),
    ],
    faqs: [ref("faq-message-cache"), ref("faq-comment-creer-un-mot-fleche-personnalise")],
    seo: seo(
      "10 idées de messages à cacher dans un mot fléché personnalisé : déclaration, annonce surprise, anniversaire, retraite. De quoi rendre votre cadeau inoubliable.",
    ),
  },
  {
    _id: "article-cadeau-pour-amateur-de-mots",
    _type: "article",
    title: "Quel cadeau offrir à quelqu'un qui aime les mots ?",
    slug: slug("cadeau-pour-amateur-de-mots"),
    excerpt:
      "Cruciverbiste, amoureux des jeux de lettres, fan de mots fléchés : voici comment trouver le cadeau parfait.",
    targetKeyword: "cadeau amateur de mots",
    author: ref("author-atelier-les-fleches"),
    publishedAt: "2026-07-07T09:00:00.000Z",
    body: [
      block(
        "Les amateurs de mots sont parfois difficiles à surprendre : ils ont déjà les livres, les magazines et les applis. La bonne idée, c'est de leur offrir quelque chose qu'ils ne peuvent trouver nulle part ailleurs — une grille faite pour eux.",
      ),
      block("Une grille personnalisée", "h2"),
      block(
        "Mots fléchés ou mots croisés, construits autour de leurs souvenirs et d'un message caché : le cadeau se joue, se garde et s'encadre.",
      ),
      callout(
        "Pour un amateur de jeux de lettres, le cadeau le plus mémorable est une grille dont ils sont les héros.",
      ),
      block("Un livret ou un abonnement", "h2"),
      block(
        "Pour aller plus loin : un petit livret de plusieurs grilles à résoudre au fil des soirées, ou un abonnement qui livre une nouvelle grille chaque mois.",
      ),
      ctaBlock("Créer un cadeau sur mesure", "/fleche"),
    ],
    faqs: [ref("faq-quel-cadeau-amateur-de-mots"), ref("faq-mot-fleche-idee-cadeau")],
    seo: seo(
      "Quel cadeau offrir à quelqu'un qui aime les mots ? Nos idées de cadeaux personnalisés pour cruciverbistes et amateurs de jeux de lettres.",
    ),
  },
  {
    _id: "article-mots-fleches-ou-mots-croises-offrir",
    _type: "article",
    title: "Mots fléchés ou mots croisés : lequel offrir ?",
    slug: slug("mots-fleches-ou-mots-croises-offrir"),
    excerpt:
      "Deux jeux proches mais différents. Voici comment choisir entre mots fléchés et mots croisés pour votre cadeau personnalisé.",
    targetKeyword: "mots fléchés ou mots croisés",
    author: ref("author-atelier-les-fleches"),
    publishedAt: "2026-07-08T09:00:00.000Z",
    body: [
      block(
        "Mots fléchés et mots croisés partagent le même plaisir — remplir une grille à partir de définitions — mais ne se présentent pas de la même façon. Voici comment choisir.",
      ),
      block("La différence en une phrase", "h2"),
      block(
        "Dans les mots croisés, les définitions sont listées à part et repérées par des numéros ; dans les mots fléchés, elles sont écrites dans les cases, avec une flèche indiquant le sens de lecture.",
      ),
      callout(
        "Mots fléchés : tout est dans la grille, plus visuel. Mots croisés : la grille est épurée, les définitions à côté.",
        "info",
      ),
      block("Lequel choisir pour un cadeau ?", "h2"),
      block(
        "Offrez des mots fléchés à qui aime les grilles de magazine et le côté compact ; des mots croisés à qui préfère l'élégance d'une grille nue. Dans les deux cas, la personnalisation fait tout le charme.",
      ),
      ctaBlock("Créer ma grille personnalisée", "/fleche"),
    ],
    faqs: [
      ref("faq-difference-mots-fleches-mots-croises"),
      ref("faq-mots-croises-personnalises"),
    ],
    seo: seo(
      "Mots fléchés ou mots croisés : quelle grille personnalisée offrir ? On compare les deux jeux pour vous aider à choisir le cadeau idéal.",
    ),
  },
];

// ─────────────── Gift guides ───────────────
const giftGuides = [
  {
    _id: "guide-idees-cadeaux-noel-personnalises",
    _type: "giftGuide",
    title: "10 idées de cadeaux personnalisés à offrir à Noël",
    slug: slug("idees-cadeaux-noel-personnalises"),
    intro:
      "Sous le sapin, rien ne vaut un cadeau qui a demandé un peu d'attention. Voici nos idées de cadeaux personnalisés autour des mots, pour un Noël qui marque.",
    occasion: "Noël",
    publishedAt: "2026-07-02T09:00:00.000Z",
    items: [
      {
        _type: "giftItem",
        _key: key(),
        name: "Une grille de mots fléchés « spécial Noël »",
        description:
          "Cachez un « Joyeux Noël » et des souvenirs de l'année dans une grille à résoudre au coin du feu.",
        href: "/fleche",
        priceBracket: "low",
      },
      {
        _type: "giftItem",
        _key: key(),
        name: "Un livret de grilles pour toute la famille",
        description:
          "Plusieurs grilles reliées, avec les solutions à la fin : de quoi occuper petits et grands pendant les fêtes.",
        href: "/fleche",
        priceBracket: "mid",
      },
      {
        _type: "giftItem",
        _key: key(),
        name: "Un mot croisé de vœux",
        description:
          "Une grille dont la solution dévoile un message de fin d'année, personnalisé pour la personne qui le reçoit.",
        href: "/fleche",
        priceBracket: "low",
      },
      {
        _type: "giftItem",
        _key: key(),
        name: "Un abonnement pour l'année à venir",
        description:
          "Une nouvelle grille personnalisée chaque mois : le cadeau de Noël qui dure jusqu'au Noël suivant.",
        href: "/fleche",
        priceBracket: "high",
      },
    ],
    body: [
      block("Comment bien choisir", "h2"),
      block(
        "À Noël, misez sur l'émotion : une grille remplie de souvenirs de l'année écoulée touchera bien plus qu'un objet acheté à la dernière minute.",
      ),
    ],
    faqs: [ref("faq-offrir-noel"), ref("faq-imprimer-offrir-grille")],
    seo: seo(
      "10 idées de cadeaux personnalisés à offrir à Noël autour des mots : grilles de mots fléchés, livrets, mots croisés de vœux et abonnements.",
    ),
  },
  {
    _id: "guide-cadeaux-saint-valentin-personnalises",
    _type: "giftGuide",
    title: "6 idées de cadeaux personnalisés pour la Saint-Valentin",
    slug: slug("cadeaux-saint-valentin-personnalises"),
    intro:
      "Pour dire je t'aime autrement, offrez un jeu à deux. Voici nos idées de cadeaux personnalisés autour des mots, pleins de tendresse.",
    occasion: "Saint-Valentin",
    publishedAt: "2026-07-03T09:00:00.000Z",
    items: [
      {
        _type: "giftItem",
        _key: key(),
        name: "Un mot fléché « déclaration »",
        description:
          "La grille dont la dernière case révèle un « je t'aime » ou une phrase qui n'appartient qu'à vous deux.",
        href: "/fleche",
        priceBracket: "low",
      },
      {
        _type: "giftItem",
        _key: key(),
        name: "Une grille de vos souvenirs",
        description:
          "Vos lieux, vos surnoms, vos dates : chaque définition raconte votre histoire commune.",
        href: "/fleche",
        priceBracket: "low",
      },
      {
        _type: "giftItem",
        _key: key(),
        name: "Un mot croisé à encadrer",
        description:
          "Une grille imprimée grand format, à résoudre puis à accrocher au mur comme un souvenir.",
        href: "/fleche",
        priceBracket: "mid",
      },
    ],
    body: [
      block("Le petit plus", "h2"),
      block(
        "Ajoutez un message caché tendre : c'est la révélation finale qui transforme un jeu en déclaration.",
      ),
    ],
    faqs: [ref("faq-message-cache"), ref("faq-mot-fleche-idee-cadeau")],
    seo: seo(
      "6 idées de cadeaux personnalisés pour la Saint-Valentin : mots fléchés déclaration, grilles de souvenirs et mots croisés à encadrer.",
    ),
  },
];

const documents = [...faqs, ...landingPages, ...articles, ...giftGuides];
const mutations = documents.map((doc) => ({ createOrReplace: doc }));

const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}?returnIds=true`;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ mutations }),
});
const json = await res.json();
if (!res.ok) {
  console.error("Seeding failed:", JSON.stringify(json, null, 2));
  process.exit(1);
}
console.log(`Published ${documents.length} documents:`);
console.log((json.results || []).map((r) => `  ${r.operation}  ${r.id}`).join("\n"));
