// Reposition the landing pages around the printed personalized BOOK (the paid
// product), with the free generator as "compose & preview".
// Usage: SANITY_WRITE_TOKEN=xxx node scripts/seed-reposition-book.mjs

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
const span = (text) => ({ _type: "span", _key: key(), text, marks: [] });
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

const landingPages = [
  {
    _id: "page-mots-fleches-personnalises",
    _type: "seoLandingPage",
    title: "Livre de mots fléchés personnalisé",
    slug: slug("mots-fleches-personnalises"),
    targetKeyword: "livre mots fléchés personnalisé",
    heading: "Un livre de mots fléchés personnalisé, à offrir",
    subheading:
      "Vos mots, vos souvenirs, un message caché — réunis dans un vrai livre imprimé et livré. Le cadeau que personne d'autre ne peut offrir.",
    cta: { _type: "cta", label: "Composer mon livre", href: "/fleche", variant: "primary" },
    body: [
      block("Un objet à garder, pas un simple jeu", "h2"),
      block(
        "Nous imprimons vos grilles dans un livre relié, à feuilleter et à conserver. Chaque définition renvoie à un souvenir, un prénom, une date qui vous appartient — et une grille cache un message qui se dévoile à la fin.",
      ),
      callout(
        "Un livre de mots fléchés personnalisé, imprimé et livré : le cadeau le plus personnel qu'on puisse offrir à quelqu'un qui aime les mots.",
      ),
      block("Comment ça marche", "h2"),
      block(
        "Composez et prévisualisez votre livre gratuitement en saisissant vos mots et votre message caché. Quand il vous plaît, nous l'imprimons et vous l'envoyons, prêt à offrir.",
      ),
      ctaBlock("Composer mon livre gratuitement", "/fleche"),
    ],
    faqs: [
      ref("faq-quest-ce-quun-mot-fleche-personnalise"),
      ref("faq-comment-creer-un-mot-fleche-personnalise"),
      ref("faq-mot-fleche-idee-cadeau"),
      ref("faq-imprimer-offrir-grille"),
    ],
    seo: seo(
      "Offrez un livre de mots fléchés personnalisé : vos mots, vos souvenirs, un message caché, imprimé et livré. Composez-le gratuitement en ligne.",
      "Livre de mots fléchés personnalisé à offrir | Les Flèches",
    ),
  },
  {
    _id: "page-mot-croise-personnalise",
    _type: "seoLandingPage",
    title: "Livre de mots croisés personnalisé",
    slug: slug("mot-croise-personnalise"),
    targetKeyword: "livre mots croisés personnalisé",
    heading: "Un livre de mots croisés personnalisé, rien que pour elle ou lui",
    subheading:
      "Composez une grille de mots croisés avec vos propres mots et un message caché — puis recevez-la imprimée et reliée, prête à offrir.",
    cta: { _type: "cta", label: "Composer mon livre", href: "/fleche", variant: "primary" },
    body: [
      block("Le jeu de lettres qui raconte votre histoire", "h2"),
      block(
        "Un livre de mots croisés personnalisé n'a rien d'un magazine : chaque définition renvoie à un souvenir, un prénom ou un clin d'œil qui vous appartient. Imprimé, relié, à résoudre puis à garder.",
      ),
      callout(
        "Des mots croisés personnalisés, imprimés dans un vrai livre : un cadeau unique, pensé pour une seule personne.",
      ),
      block("Mots croisés ou mots fléchés ?", "h2"),
      block(
        "Les deux se personnalisent de la même façon. Choisissez le style que préfère la personne à qui vous l'offrez ; nous nous occupons de l'impression et de la livraison.",
      ),
      ctaBlock("Composer mon livre gratuitement", "/fleche"),
    ],
    faqs: [
      ref("faq-mots-croises-personnalises"),
      ref("faq-difference-mots-fleches-mots-croises"),
      ref("faq-message-cache"),
      ref("faq-imprimer-offrir-grille"),
    ],
    seo: seo(
      "Offrez un livre de mots croisés personnalisé : vos mots, un message caché, imprimé et relié. Composez votre grille gratuitement en ligne.",
      "Livre de mots croisés personnalisé à offrir | Les Flèches",
    ),
  },
  {
    _id: "page-idee-cadeau-mots-fleches",
    _type: "seoLandingPage",
    title: "Idée cadeau : livre de jeux personnalisé",
    slug: slug("idee-cadeau-mots-fleches"),
    targetKeyword: "idée cadeau personnalisé livre",
    heading: "L'idée cadeau originale : un livre de jeux personnalisé",
    subheading:
      "À court d'idées ? Offrez un livre de mots fléchés personnalisé : vos souvenirs, vos mots, un message caché — imprimé, relié et livré.",
    cta: { _type: "cta", label: "Composer le cadeau", href: "/fleche", variant: "primary" },
    body: [
      block("Le cadeau qui prouve qu'on a pris le temps", "h2"),
      block(
        "On cherche tous le cadeau qui sort de l'ordinaire. Un livre personnalisé coche toutes les cases : original, personnel, et rempli d'attentions. Idéal pour un anniversaire, la Saint-Valentin, un départ à la retraite ou Noël.",
      ),
      callout(
        "Le meilleur cadeau n'est pas le plus cher : c'est celui qui montre qu'on a pensé à l'autre, souvenir après souvenir.",
        "tip",
      ),
      block("De la composition au colis", "h2"),
      block(
        "Composez et prévisualisez le livre gratuitement. Quand il est parfait, nous l'imprimons et l'expédions — vous n'avez plus qu'à l'offrir.",
      ),
      ctaBlock("Composer le cadeau", "/fleche"),
    ],
    faqs: [
      ref("faq-quel-cadeau-amateur-de-mots"),
      ref("faq-mot-fleche-idee-cadeau"),
      ref("faq-comment-creer-un-mot-fleche-personnalise"),
    ],
    seo: seo(
      "Une idée cadeau originale et personnelle : offrez un livre de mots fléchés personnalisé, imprimé et livré. Composez-le gratuitement en ligne.",
      "Idée cadeau originale : livre de jeux personnalisé | Les Flèches",
    ),
  },
];

const mutations = landingPages.map((doc) => ({ createOrReplace: doc }));
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
console.log(`Repositioned ${landingPages.length} landing pages:`);
console.log((json.results || []).map((r) => `  ${r.operation}  ${r.id}`).join("\n"));
