// Occasion-based "cadeau personnalisé" guides. Consumed by
// scripts/seed-cadeau-situations.mjs. Items are [name, description] or
// { carnet: pitch } for our own item (exactly once, never first or last).

// Milestone birthdays share a shape but each gets its own life-stage angle.
const milestone = ({ age, angle, intro, items, tips, words, faqs, related }) => ({
  slug: `cadeau-personnalise-anniversaire-${age}-ans`,
  occasion: `Anniversaire ${age} ans`,
  title: `Idées de cadeaux personnalisés pour un anniversaire de ${age} ans`,
  intro,
  seoTitle: `Cadeau personnalisé ${age} ans : idées d'anniversaire | Les Flèches`,
  seoDescription: `Idées de cadeaux personnalisés pour un anniversaire de ${age} ans : ${angle}.`,
  items,
  tipsTitle: `Comment choisir un cadeau personnalisé pour ses ${age} ans`,
  tips,
  wordsTitle: `Quels souvenirs glisser dans un cadeau pour ses ${age} ans`,
  wordsIntro: "Des pistes de mots et de souvenirs à graver, écrire ou cacher dans une grille :",
  words,
  faqs,
  related,
});

export const OCCASIONS = [
  {
    slug: "cadeau-personnalise-anniversaire",
    occasion: "Anniversaire",
    title: "Idées de cadeaux d'anniversaire personnalisés",
    intro:
      "Un cadeau d'anniversaire personnalisé marque plus qu'un cadeau acheté au dernier moment : livre de lettres des proches, affiche de la date de naissance, objet gravé, mots fléchés sur sa vie ou expérience. Des idées pour tous les âges et tous les budgets.",
    seoTitle: "Cadeau d'anniversaire personnalisé : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux d'anniversaire personnalisés : livre de lettres, affiche de naissance, objet gravé, mots fléchés personnalisés, expérience, vidéo des proches.",
    items: [
      ["Un livre de lettres des proches", "Chaque ami ou membre de la famille écrit un mot, réunis dans un recueil."],
      ["Une affiche « le jour de ta naissance »", "Les titres du journal, la chanson numéro un et le ciel de ce jour-là."],
      ["Un objet gravé", "Un bijou, une montre ou un stylo avec la date et un mot qui compte."],
      { carnet: "Pour quelqu'un qui aime les jeux de lettres, un anniversaire est l'occasion parfaite : chaque grille raconte une époque de sa vie, et les mots cachés forment un message d'anniversaire." },
      ["Une vidéo surprise des proches", "Un montage de messages de ceux qui comptent, y compris ceux qui vivent loin."],
      ["Une expérience", "Un concert, un atelier ou une nuit insolite, choisi selon ses envies."],
    ],
    tipsTitle: "Comment choisir un cadeau d'anniversaire personnalisé",
    tips: [
      "Faites participer les proches : un cadeau qui rassemble plusieurs voix (lettres, vidéo, idées de mots) touche plus qu'un cadeau d'une seule personne.",
      "Adaptez le format à l'âge : les grands anniversaires (30, 50, 70 ans) appellent un cadeau qui retrace un parcours, les autres années un clin d'œil suffit.",
    ],
    wordsTitle: "Quels souvenirs glisser dans un cadeau d'anniversaire",
    wordsIntro: "Les classiques qui rendent un cadeau d'anniversaire unique :",
    words: [
      "Sa ville de naissance",
      "Le prénom de ses meilleurs amis",
      "Un voyage marquant",
      "Sa passion du moment",
      "Une anecdote que tout le monde connaît",
    ],
    faqs: [
      ["Quel cadeau d'anniversaire personnalisé offrir ?", "Les cadeaux d'anniversaire personnalisés qui marquent sont ceux qui racontent la personne : un livre de lettres de ses proches, une affiche du jour de sa naissance, un objet gravé, une vidéo surprise ou un carnet de mots fléchés dont chaque grille évoque une époque de sa vie. Faire participer plusieurs proches rend le cadeau plus fort."],
      ["Quel cadeau d'anniversaire original et personnalisé ?", "Pour un anniversaire original, choisissez un cadeau qu'on ne trouve pas en magasin : un jeu construit sur sa vie (quiz, mots fléchés personnalisés), un recueil de lettres ou une vidéo de messages. L'originalité vient du contenu personnel, pas de l'objet."],
    ],
    related: ["cadeau-personnalise-anniversaire-30-ans", "cadeau-personnalise-anniversaire-50-ans", "meilleures-idees-cadeaux-personnalises"],
  },
  milestone({
    age: 30,
    angle: "livre de souvenirs des amis, affiche de sa décennie, mots fléchés personnalisés, week-end entre amis",
    intro:
      "Pour un anniversaire de 30 ans, le cadeau personnalisé idéal célèbre la décennie écoulée et les amis qui l'ont faite : livre de souvenirs collectif, mots fléchés pleins de private jokes, affiche des années 20 à 30, week-end entre amis. Des idées pour marquer le cap.",
    items: [
      ["Un livre de souvenirs des amis", "Chaque ami raconte un moment de ses 20 ans. Drôle, et précieux dans 30 ans."],
      ["Une affiche de ses années 20", "Les villes où il ou elle a vécu, les voyages, les grandes étapes, en version graphique."],
      { carnet: "Les années 20, ce sont les colocs, les soirées et les voyages. En mots fléchés, toutes vos private jokes deviennent un jeu que seuls ses amis auraient pu écrire." },
      ["Un week-end entre amis", "Une maison louée à plusieurs, le cadeau collectif le plus apprécié à 30 ans."],
      ["Une bouteille de son année de naissance", "Un vin ou un champagne millésimé, avec une étiquette personnalisée."],
      ["Un objet gravé « 30 »", "Une montre, un bijou ou un briquet avec la date et un mot des amis."],
    ],
    tips: [
      "À 30 ans, les amis sont au centre. Un cadeau collectif qui rassemble leurs voix et leurs souvenirs touche plus qu'un objet de valeur.",
      "Gardez une pointe d'humour sur le « cap des 30 », sans tomber dans les blagues sur l'âge qui fâchent.",
    ],
    words: [
      "Le nom de sa première coloc",
      "La soirée dont tout le monde parle encore",
      "Ses voyages des années 20",
      "Le surnom donné par la bande",
      "Sa ville d'études",
    ],
    faqs: [
      ["Quel cadeau personnalisé pour un anniversaire de 30 ans ?", "Pour 30 ans, les cadeaux personnalisés les plus appréciés célèbrent les années 20 et les amis : un livre de souvenirs collectif, une affiche de ses villes et voyages, un week-end entre amis, une bouteille millésimée ou un carnet de mots fléchés rempli de private jokes. Les cadeaux collectifs fonctionnent particulièrement bien à cet âge."],
      ["Quel cadeau collectif pour les 30 ans d'un ami ?", "Pour les 30 ans d'un ami, un cadeau collectif réunit la bande : un week-end ensemble, un livre de souvenirs où chacun écrit, ou des grilles de mots fléchés dont chaque ami a proposé une définition. Chacun participe, et le cadeau raconte toute une décennie."],
    ],
    related: ["cadeau-personnalise-anniversaire-40-ans", "cadeaux-personnalises-meilleur-ami", "cadeau-personnalise-anniversaire"],
  }),
  milestone({
    age: 40,
    angle: "livre de lettres, mots fléchés personnalisés, carte de ses voyages, expérience à vivre",
    intro:
      "À 40 ans, un cadeau personnalisé peut faire le bilan avec tendresse et humour : un livre de lettres de ses proches, des mots fléchés sur ses quatre décennies, une carte de ses voyages ou une expérience longtemps repoussée. Des idées pour célébrer la quarantaine.",
    items: [
      ["Un livre de lettres « 40 mots pour tes 40 ans »", "Quarante proches écrivent chacun un mot ou un souvenir."],
      ["Une carte de ses voyages", "Tous les lieux visités sur une carte, avec la place pour les prochains."],
      ["Une expérience longtemps repoussée", "Le saut en parachute, le cours de cuisine japonaise, le concert dont il ou elle parle depuis des années."],
      { carnet: "Une grille par décennie : l'enfance, les années lycée, les années 20 et 30. Les définitions retracent son parcours, les mots cachés forment un message pour ses 40 ans." },
      ["Une playlist de sa vie", "Une chanson par année, imprimée comme une pochette de vinyle."],
      ["Un objet gravé de qualité", "Un beau stylo, une montre ou un bijou, pour marquer le cap."],
    ],
    tips: [
      "À 40 ans, on apprécie les cadeaux qui retracent le chemin parcouru. Un cadeau qui fait revivre plusieurs époques touche plus qu'un objet de plus.",
      "Pensez aussi à ce qu'il ou elle n'ose pas s'offrir : une envie repoussée depuis longtemps fait un excellent cadeau de 40 ans.",
    ],
    words: [
      "Son lycée ou sa ville d'adolescence",
      "Le prénom de ses enfants",
      "Le métier qu'il ou elle voulait faire petit",
      "Le voyage qui a tout changé",
      "Sa chanson fétiche de chaque décennie",
    ],
    faqs: [
      ["Quel cadeau personnalisé pour un anniversaire de 40 ans ?", "Pour 40 ans, les cadeaux personnalisés qui retracent un parcours marchent très bien : un livre de 40 lettres de proches, une carte de ses voyages, une playlist de sa vie, une expérience longtemps repoussée ou un carnet de mots fléchés avec une grille par décennie. L'idée est de célébrer le chemin parcouru."],
      ["Quel cadeau original pour les 40 ans de son mari ou de sa femme ?", "Pour les 40 ans de son conjoint, misez sur votre histoire commune : un livre de lettres de ses proches, une expérience à deux qu'il ou elle repousse depuis longtemps, ou des grilles de mots fléchés dont les définitions racontent sa vie et vos souvenirs. C'est la personnalisation qui rend le cadeau original."],
    ],
    related: ["cadeau-personnalise-anniversaire-50-ans", "cadeaux-personnalises-couple", "cadeau-personnalise-anniversaire"],
  }),
  milestone({
    age: 50,
    angle: "livre de sa vie, mots fléchés personnalisés, album de famille, voyage, bouteille millésimée",
    intro:
      "Un demi-siècle mérite un cadeau personnalisé qui raconte une vie : un livre de souvenirs familial, des mots fléchés sur ses 50 ans, un album photo des grandes étapes, une bouteille de son année ou un voyage. Des idées pour un anniversaire de 50 ans qui marque.",
    items: [
      ["Un album des grandes étapes", "De la photo de naissance aux souvenirs récents, cinquante ans en images."],
      ["Une bouteille millésimée de son année", "Un vin, un armagnac ou un porto de son année de naissance."],
      ["Un voyage dans un lieu qui compte", "Le retour dans la ville de son enfance ou la destination rêvée depuis longtemps."],
      { carnet: "Cinquante ans de souvenirs, ça remplit un carnet. Chaque grille évoque une époque (l'enfance, la jeunesse, la famille), et les mots cachés composent un message signé de tous ses proches." },
      ["Un livre « Dis-moi qui tu es »", "Un livre d'interview à remplir, ou un recueil de ses histoires écrit par la famille."],
      ["Un bijou ou une montre gravés", "Un objet de qualité avec la date des 50 ans, à transmettre un jour."],
    ],
    tips: [
      "À 50 ans, le cadeau idéal rassemble plusieurs générations : parents, enfants, amis de longue date. Impliquez-les tous.",
      "Misez sur la qualité et la durée : un cadeau de 50 ans est souvent gardé et transmis, il doit pouvoir traverser le temps.",
    ],
    words: [
      "Sa ville et sa maison d'enfance",
      "Le prénom de ses enfants et petits-enfants",
      "Ses années d'études ou son premier métier",
      "Un grand voyage",
      "La chanson de sa jeunesse",
    ],
    faqs: [
      ["Quel cadeau personnalisé pour un anniversaire de 50 ans ?", "Pour 50 ans, les cadeaux personnalisés qui racontent une vie sont les plus touchants : un album des grandes étapes, un livre de souvenirs, une bouteille millésimée de son année, un voyage symbolique ou un carnet de mots fléchés dont chaque grille évoque une époque. Impliquer plusieurs générations rend le cadeau unique."],
      ["Quel cadeau original pour les 50 ans de sa mère ou de son père ?", "Pour les 50 ans d'un parent, réunissez la famille autour de son histoire : un album des grandes étapes, un livre de lettres des enfants et amis, ou des mots fléchés personnalisés dont les réponses sont ses souvenirs. Un cadeau qui se feuillette et se garde est idéal."],
    ],
    related: ["cadeau-personnalise-anniversaire-60-ans", "cadeaux-personnalises-parents", "cadeau-personnalise-anniversaire"],
  }),
  milestone({
    age: 60,
    angle: "album de famille, mots fléchés personnalisés, arbre généalogique, expérience, livre de souvenirs",
    intro:
      "À 60 ans, un cadeau personnalisé réussi célèbre la famille et ce qui vient : un album des générations, des mots fléchés sur sa vie, un arbre généalogique, une expérience pour la nouvelle étape. Des idées pour fêter les 60 ans d'un parent, d'un ami ou d'un conjoint.",
    items: [
      ["Un arbre généalogique illustré", "Toute la famille réunie sur une affiche, des aïeux aux petits-enfants."],
      ["Un album des générations", "Photos de ses parents, de ses enfants et de ses petits-enfants, côte à côte."],
      { carnet: "À 60 ans, beaucoup ont le rituel des mots fléchés. Des grilles écrites pour lui ou pour elle, avec ses souvenirs et les prénoms de la famille, transforment ce plaisir quotidien en cadeau." },
      ["Une expérience pour la nouvelle étape", "Un cours d'œnologie, une croisière, une initiation à une passion qu'il ou elle n'a jamais eu le temps d'explorer."],
      ["Un livre de souvenirs à remplir", "Un livre de questions sur sa vie, pour transmettre ses histoires aux petits-enfants."],
      ["Une bouteille millésimée", "Un grand cru de son année de naissance, à ouvrir en famille."],
    ],
    tips: [
      "À 60 ans, la famille est souvent au cœur des priorités. Un cadeau qui la met en scène (photos, prénoms, souvenirs) fait mouche.",
      "Pensez aussi aux projets : retraite proche, nouvelles passions, voyages. Un cadeau tourné vers l'avenir est très apprécié à cet âge.",
    ],
    words: [
      "Les prénoms de ses enfants et petits-enfants",
      "Son métier ou sa carrière",
      "La maison familiale",
      "Ses passions (jardin, cuisine, voyages)",
      "Le lieu de son mariage",
    ],
    faqs: [
      ["Quel cadeau personnalisé pour un anniversaire de 60 ans ?", "Pour 60 ans, les cadeaux personnalisés qui mettent la famille en scène sont les plus appréciés : un arbre généalogique illustré, un album des générations, un livre de souvenirs à remplir ou un carnet de mots fléchés écrit autour de sa vie. Une expérience liée à une nouvelle passion fonctionne aussi très bien."],
      ["Quel cadeau pour les 60 ans de sa maman ?", "Pour les 60 ans de sa maman, offrez un cadeau qui célèbre sa famille et son histoire : un album des générations, un livre de lettres de ses enfants et petits-enfants, ou des grilles de mots fléchés dont les réponses sont vos souvenirs communs. Un cadeau qui se garde et se partage en famille."],
    ],
    related: ["cadeau-personnalise-anniversaire-70-ans", "cadeau-personnalise-depart-retraite", "cadeaux-personnalises-parents"],
  }),
  milestone({
    age: 70,
    angle: "livre de sa vie, mots fléchés personnalisés, album des petits-enfants, fête surprise, objet gravé",
    intro:
      "Pour 70 ans, le cadeau personnalisé idéal rend hommage à une vie bien remplie : un livre de ses souvenirs, des mots fléchés aux prénoms de la famille, un album des petits-enfants ou une fête surprise. Des idées pour un grand-parent, un parent ou un ami.",
    items: [
      ["Un livre de sa vie", "Une interview mise en page avec des photos, pour transmettre ses histoires."],
      ["Un album des petits-enfants", "Les photos et les mots de chacun des petits-enfants, réunis pour l'occasion."],
      ["Une fête surprise", "Les amis de toujours et la famille réunis, parfois venus de loin."],
      { carnet: "Pour un ou une amateur de mots fléchés, des grilles écrites rien que pour ses 70 ans : prénoms de la famille, souvenirs de jeunesse et grands moments, avec un message caché de tous ses proches." },
      ["Un objet gravé à transmettre", "Une montre, une bague ou une boîte à bijoux avec la date et les prénoms de la famille."],
      ["Une sortie en famille", "Un restaurant, une croisière fluviale ou un retour sur les lieux de son enfance."],
    ],
    tips: [
      "Pensez au confort : gros caractères, belles photos lisibles, objets faciles à manier. Un cadeau agréable à utiliser sera utilisé.",
      "À 70 ans, les souvenirs sont un trésor. Un cadeau qui les rassemble et les transmet aux plus jeunes a une valeur immense.",
    ],
    words: [
      "Les prénoms de ses enfants et petits-enfants",
      "Son village ou sa ville natale",
      "Son métier",
      "Le lieu de son mariage",
      "Un souvenir de jeunesse qu'il ou elle raconte souvent",
    ],
    faqs: [
      ["Quel cadeau personnalisé pour un anniversaire de 70 ans ?", "Pour 70 ans, les cadeaux personnalisés qui rendent hommage à une vie sont les plus forts : un livre de ses souvenirs, un album des petits-enfants, une fête surprise, un objet gravé à transmettre ou un carnet de mots fléchés écrit autour de sa famille. Privilégiez les formats lisibles et confortables."],
      ["Quel cadeau pour les 70 ans d'une grand-mère ou d'un grand-père ?", "Pour les 70 ans d'un grand-parent, faites participer les petits-enfants : un album avec leurs photos et leurs mots, un livre de souvenirs, ou des grilles de mots fléchés dont les réponses sont les prénoms et les histoires de la famille. Ces cadeaux se gardent et se partagent."],
    ],
    related: ["cadeau-personnalise-anniversaire-80-ans", "cadeaux-personnalises-grand-mere", "cadeau-personnalise-grand-pere"],
  }),
  milestone({
    age: 80,
    angle: "album de famille, mots fléchés personnalisés, livre de souvenirs, réunion de famille, lettres",
    intro:
      "Pour 80 ans, le plus beau cadeau personnalisé réunit la famille autour de ses souvenirs : un album des générations, des mots fléchés en gros caractères sur sa vie, un livre de lettres ou une grande réunion de famille. Des idées pour fêter les 80 ans d'un grand-parent.",
    items: [
      ["Une réunion de famille", "Tous les enfants, petits-enfants et arrière-petits-enfants autour d'une même table."],
      ["Un livre de lettres de toute la famille", "Chaque génération écrit un mot, du plus grand au plus petit."],
      { carnet: "Pour un grand-parent fidèle aux mots fléchés, des grilles construites autour de 80 ans de vie : son village, son métier, ses enfants et petits-enfants. Un jeu qui le ou la fera voyager dans ses souvenirs." },
      ["Un album des générations", "Ses parents, ses enfants, ses petits-enfants : quatre générations dans un même album."],
      ["Un enregistrement de ses histoires", "Une interview audio ou vidéo, pour que ses récits soient transmis."],
      ["Un cadre photo numérique", "Préchargé de photos de famille, mis à jour à distance par les petits-enfants."],
    ],
    tips: [
      "À 80 ans, le confort compte : textes lisibles, objets légers, rien de compliqué à utiliser. Un cadeau simple et chaleureux vaut mieux qu'un objet technique.",
      "La présence est souvent le plus beau cadeau. Combinez un objet personnalisé avec un moment réunissant la famille.",
    ],
    words: [
      "Les prénoms de toute la famille",
      "Son village natal",
      "Son métier de toujours",
      "Le lieu et l'année de son mariage",
      "Les chansons ou les films de sa jeunesse",
    ],
    faqs: [
      ["Quel cadeau personnalisé pour un anniversaire de 80 ans ?", "Pour 80 ans, les cadeaux personnalisés qui réunissent la famille sont les plus touchants : une réunion de famille, un livre de lettres de toutes les générations, un album des générations, un enregistrement de ses histoires ou un carnet de mots fléchés construit autour de sa vie. Privilégiez le confort et la lisibilité."],
      ["Quel cadeau pour une grand-mère de 80 ans qui aime les mots fléchés ?", "Pour une grand-mère de 80 ans qui aime les mots fléchés, offrez des grilles personnalisées : les réponses sont les prénoms de ses enfants et petits-enfants, son village et ses souvenirs, et le tout est imprimé et relié comme un vrai carnet. Elle retrouve son jeu préféré, avec sa propre histoire dedans."],
    ],
    related: ["cadeaux-personnalises-grand-mere", "cadeau-personnalise-grand-pere", "cadeau-personnalise-anniversaire-70-ans"],
  }),
  {
    slug: "cadeau-personnalise-fete-des-meres",
    group: "fete",
    occasion: "Fête des mères",
    title: "Idées de cadeaux personnalisés pour la fête des mères",
    intro:
      "Pour la fête des mères, un cadeau personnalisé montre qu'on a pensé à elle : un bijou gravé, un album de famille, une lettre des enfants, des mots fléchés sur vos souvenirs ou une journée ensemble. Des idées à préparer avant le dernier dimanche de mai.",
    seoTitle: "Cadeau personnalisé fête des mères : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour la fête des mères : bijou gravé, album de famille, mots fléchés personnalisés, lettre des enfants, journée ensemble.",
    items: [
      ["Un bijou gravé des prénoms des enfants", "Le grand classique de la fête des mères, toujours aussi touchant."],
      ["Un album de l'année en famille", "Les meilleurs moments de l'année, réunis dans un album à feuilleter."],
      ["Une lettre des enfants", "Les plus petits dessinent, les plus grands écrivent. À garder précieusement."],
      { carnet: "Pour une maman qui aime les jeux de lettres, des grilles écrites par ses enfants : souvenirs, surnoms et petites phrases de famille, avec un message caché pour la fête des mères." },
      ["Une plante ou un rosier", "Un cadeau vivant, qui refleurira chaque année à la même période."],
      ["Une journée rien que pour elle", "Un brunch, un spa ou une balade, sans avoir à rien organiser."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour la fête des mères",
    tips: [
      "Anticipez : un cadeau personnalisé demande souvent quelques jours de préparation et de fabrication. Prévoyez deux à trois semaines avant la date.",
      "Faites participer les enfants, même petits : un dessin, une idée de mot, un souvenir rendent le cadeau unique.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de fête des mères",
    wordsIntro: "Les mots qu'une maman aime retrouver :",
    words: [
      "Les prénoms et surnoms de ses enfants",
      "Le surnom que les enfants lui donnent",
      "Un souvenir de vacances en famille",
      "Sa recette que tout le monde adore",
      "Un « merci » ou un « je t'aime » caché",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir pour la fête des mères ?", "Les cadeaux personnalisés les plus appréciés pour la fête des mères parlent de ses enfants : un bijou gravé de leurs prénoms, un album de l'année, une lettre ou un dessin, une plante qui refleurira chaque année ou un carnet de mots fléchés écrit par la famille. Prévoyez deux à trois semaines pour la préparation."],
      ["Quand commander un cadeau personnalisé pour la fête des mères ?", "Pour un cadeau personnalisé fabriqué et livré (bijou gravé, album, carnet imprimé), commandez deux à trois semaines avant la fête des mères, qui tombe le dernier dimanche de mai en France (ou le premier dimanche de juin si la Pentecôte coïncide). Cela laisse le temps de la fabrication et de la livraison."],
    ],
    related: ["cadeau-personnalise-maman", "cadeau-personnalise-fete-des-grands-meres", "cadeaux-personnalises-parents"],
  },
  {
    slug: "cadeau-personnalise-fete-des-peres",
    group: "fete",
    occasion: "Fête des pères",
    title: "Idées de cadeaux personnalisés pour la fête des pères",
    intro:
      "Pour la fête des pères, un cadeau personnalisé bien choisi colle à ses passions : un objet gravé, un livre de ses anecdotes, des mots fléchés sur vos souvenirs, une affiche de son club ou une sortie ensemble. Des idées à préparer avant le troisième dimanche de juin.",
    seoTitle: "Cadeau personnalisé fête des pères : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour la fête des pères : objet gravé, livre d'anecdotes, mots fléchés personnalisés, affiche, sortie père et enfants.",
    items: [
      ["Un objet gravé qu'il utilisera", "Couteau, porte-clés, planche à découper ou stylo, avec un mot des enfants."],
      ["Un livre « Papa, raconte-moi »", "Il raconte sa vie en répondant aux questions, et la famille garde ses histoires."],
      { carnet: "Pour le papa qui fait sa grille chaque matin, des mots fléchés écrits par ses enfants : ses blagues, ses surnoms et vos souvenirs communs, avec un message caché pour la fête des pères." },
      ["Une affiche de sa passion", "Son stade, sa voiture de collection ou son coin de pêche, en grand format."],
      ["Un dessin des enfants transformé en objet", "Un dessin d'enfant imprimé sur un mug, un tablier ou un tee-shirt."],
      ["Une sortie père et enfants", "Un match, une rando, un atelier. Un souvenir à vivre ensemble."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour la fête des pères",
    tips: [
      "Partez de ce qu'il aime faire le week-end : bricolage, sport, cuisine, jeux. Un cadeau lié à une passion sera utilisé.",
      "Anticipez la fabrication : comptez deux à trois semaines pour un cadeau gravé ou imprimé avant la fête des pères.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de fête des pères",
    wordsIntro: "Des mots qui le feront sourire :",
    words: [
      "Sa blague ou sa réplique culte",
      "Le prénom de ses enfants",
      "Son équipe ou son sport",
      "Sa recette du dimanche",
      "Le surnom que lui donnent les enfants",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir pour la fête des pères ?", "Pour la fête des pères, les cadeaux personnalisés qui marchent collent à ses passions : un objet gravé qu'il utilisera, un livre pour raconter sa vie, une affiche de son club, un dessin des enfants imprimé ou un carnet de mots fléchés écrit par la famille. Prévoyez deux à trois semaines pour la fabrication."],
      ["Quelle est la date de la fête des pères en France ?", "En France, la fête des pères a lieu le troisième dimanche de juin. Pour un cadeau personnalisé fabriqué et livré, il vaut mieux commander au moins deux à trois semaines avant."],
    ],
    related: ["cadeau-personnalise-papa", "cadeau-personnalise-homme", "cadeaux-personnalises-parents"],
  },
  {
    slug: "cadeau-personnalise-fete-des-grands-meres",
    group: "fete",
    occasion: "Fête des grands-mères",
    title: "Idées de cadeaux personnalisés pour la fête des grands-mères",
    intro:
      "Pour la fête des grands-mères, début mars, un cadeau personnalisé fait par ou pour les petits-enfants touche à coup sûr : album photo, dessins encadrés, mots fléchés aux prénoms de la famille, plante ou calendrier. Des idées simples et pleines de tendresse.",
    seoTitle: "Cadeau personnalisé fête des grands-mères : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour la fête des grands-mères : album des petits-enfants, dessins encadrés, mots fléchés personnalisés, plante, calendrier photo.",
    items: [
      ["Un album des petits-enfants", "Les photos récentes de chacun, avec un petit mot sous chaque page."],
      ["Des dessins encadrés", "Les dessins des petits, mis en valeur dans un joli cadre."],
      { carnet: "Beaucoup de grands-mères sont fidèles aux mots fléchés. Des grilles où les réponses sont les prénoms de ses petits-enfants et les souvenirs de famille en font un jeu qu'elle chérira." },
      ["Un calendrier photo", "Une photo de famille par mois, avec les anniversaires de chacun déjà notés."],
      ["Une plante fleurie", "Un cadeau simple qui embellit la maison, avec une étiquette signée par les petits-enfants."],
      ["Un après-midi ensemble", "Une sortie, un goûter ou un atelier cuisine avec les petits-enfants."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour la fête des grands-mères",
    tips: [
      "Ce qui compte pour une grand-mère, c'est la trace des petits-enfants : un dessin, un mot, un prénom. Faites-les participer autant que possible.",
      "Pensez lisible et facile à garder : un album, un carnet ou un calendrier se ressortent tout au long de l'année.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau pour la fête des grands-mères",
    wordsIntro: "Les mots qu'une grand-mère aime retrouver :",
    words: [
      "Les prénoms de tous ses petits-enfants",
      "Son surnom (Mamie, Mamounette, Granny…)",
      "Sa spécialité de gâteau",
      "La maison où la famille se retrouve",
      "Un souvenir de vacances chez elle",
    ],
    faqs: [
      ["Quand a lieu la fête des grands-mères ?", "En France, la fête des grands-mères a lieu le premier dimanche de mars. Pour un cadeau personnalisé fabriqué et livré, prévoyez la commande deux à trois semaines avant."],
      ["Quel cadeau personnalisé offrir pour la fête des grands-mères ?", "Pour la fête des grands-mères, les cadeaux personnalisés qui touchent viennent des petits-enfants : un album photo, des dessins encadrés, un calendrier de famille, une plante signée ou un carnet de mots fléchés dont les réponses sont les prénoms de la famille. Plus les petits participent, plus le cadeau compte."],
    ],
    related: ["cadeaux-personnalises-grand-mere", "cadeau-personnalise-fete-des-meres", "cadeau-personnalise-anniversaire-80-ans"],
  },
  {
    slug: "cadeau-personnalise-mariage",
    occasion: "Mariage",
    title: "Idées de cadeaux de mariage personnalisés",
    intro:
      "Un cadeau de mariage personnalisé se démarque de la liste : une affiche de leur histoire, un livre d'or revisité, des mots fléchés sur le couple à résoudre en voyage de noces, une gravure de la date ou une expérience à deux. Des idées pour invités, témoins et familles.",
    seoTitle: "Cadeau de mariage personnalisé : idées originales | Les Flèches",
    seoDescription:
      "Idées de cadeaux de mariage personnalisés : affiche de leur histoire, livre d'or, mots fléchés sur le couple, objet gravé, expérience pour les mariés.",
    items: [
      ["Une affiche de leur histoire", "Les dates et lieux clés du couple, de la rencontre au mariage, en version graphique."],
      ["Un livre d'or revisité", "Un livre où chaque invité laisse un conseil, un souvenir ou un vœu pour les mariés."],
      ["Une planche ou un objet gravé", "Leurs prénoms et la date du mariage, sur un objet qu'ils utiliseront au quotidien."],
      { carnet: "Un cadeau à résoudre en voyage de noces : des grilles dont les réponses racontent leur histoire, leur rencontre et leurs proches. Les mots cachés forment un vœu de la part des invités." },
      ["Une expérience à deux", "Un dîner gastronomique ou une nuit insolite, pour prolonger la fête."],
      ["Une participation à la liste de mariage avec un mot", "Le classique, rendu personnel avec une carte écrite à la main."],
    ],
    tipsTitle: "Comment choisir un cadeau de mariage personnalisé",
    tips: [
      "Vérifiez d'abord s'il existe une liste de mariage, puis complétez-la avec une attention personnelle. Les deux se combinent très bien.",
      "Un cadeau de mariage personnalisé doit parler du couple, pas seulement de la date : leur rencontre, leurs voyages, leurs proches.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de mariage",
    wordsIntro: "Les souvenirs du couple à mettre en avant :",
    words: [
      "Le lieu de leur rencontre",
      "Leur premier voyage ensemble",
      "Le nom de leur animal",
      "La date et le lieu du mariage",
      "Les prénoms des témoins",
    ],
    faqs: [
      ["Quel cadeau de mariage personnalisé offrir ?", "Les cadeaux de mariage personnalisés qui se démarquent racontent l'histoire du couple : une affiche de leurs dates clés, un livre d'or où chaque invité laisse un vœu, un objet gravé de leurs prénoms, une expérience à deux ou un carnet de mots fléchés à résoudre en voyage de noces. Ils complètent bien une liste de mariage."],
      ["Quel cadeau original pour un couple qui se marie ?", "Pour un couple qui se marie, un cadeau original fait participer les proches : un livre de conseils des invités, des grilles de mots fléchés dont les réponses racontent leur histoire, ou une expérience à vivre après la fête. L'originalité vient du contenu personnel."],
    ],
    related: ["cadeau-personnalise-temoin-mariage", "cadeau-personnalise-anniversaire-de-mariage", "cadeaux-personnalises-couple"],
  },
  {
    slug: "cadeau-personnalise-anniversaire-de-mariage",
    occasion: "Anniversaire de mariage",
    title: "Idées de cadeaux personnalisés pour un anniversaire de mariage",
    intro:
      "Pour un anniversaire de mariage, un cadeau personnalisé rappelle le chemin parcouru à deux : un objet lié au symbole des noces, un album de vos années, des mots fléchés sur votre histoire, une lettre ou un retour sur les lieux de la rencontre. Des idées pour chaque année.",
    seoTitle: "Cadeau personnalisé anniversaire de mariage : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour un anniversaire de mariage : cadeau selon les noces, album du couple, mots fléchés personnalisés, lettre, voyage symbolique.",
    items: [
      ["Un cadeau selon le symbole des noces", "Coton à 1 an, cuir à 2 ans, bois à 5 ans, étain à 10 ans… Chaque année a sa matière, de quoi guider le choix."],
      ["Un album de vos années", "Une page par année de mariage, avec les photos et les moments forts."],
      { carnet: "Pour n'importe quelle année de mariage : des grilles dont les réponses racontent votre histoire, et un message caché pour votre moitié." },
      ["Une lettre ou un recueil de mots", "Une lettre par année de vie commune, à lire ensemble."],
      ["Un retour sur les lieux de la rencontre", "Un week-end dans la ville où tout a commencé."],
      ["Une gravure de vos coordonnées", "Les coordonnées GPS du lieu de votre mariage, sur un bijou ou un cadre."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour un anniversaire de mariage",
    tips: [
      "Les symboles des noces (coton, cuir, bois, étain) sont une bonne source d'inspiration et donnent un fil conducteur d'une année à l'autre.",
      "Le plus touchant reste votre histoire : un cadeau qui rappelle un souvenir que vous seuls partagez vaut tous les symboles.",
    ],
    wordsTitle: "Quels souvenirs glisser dans un cadeau d'anniversaire de mariage",
    wordsIntro: "Les mots de votre histoire à deux :",
    words: [
      "Le lieu de votre rencontre",
      "Votre chanson",
      "Le lieu du mariage",
      "Les surnoms que vous vous donnez",
      "Le prénom de vos enfants",
    ],
    faqs: [
      ["Quel cadeau personnalisé pour un anniversaire de mariage ?", "Pour un anniversaire de mariage, les cadeaux personnalisés qui touchent rappellent votre histoire : un cadeau selon le symbole des noces (coton, cuir, bois, étain), un album de vos années, une lettre, un week-end sur les lieux de la rencontre ou un carnet de mots fléchés dont les réponses racontent votre couple."],
      ["Quels sont les symboles des noces par année de mariage ?", "En France, les principales noces sont : coton (1 an), cuir (2 ans), froment (3 ans), bois (5 ans), étain (10 ans), cristal (15 ans), porcelaine (20 ans), argent (25 ans), perle (30 ans), émeraude (40 ans), vermeil (45 ans), or (50 ans) et diamant (60 ans). Le symbole peut guider le choix du cadeau, mais un souvenir personnel compte toujours davantage."],
    ],
    related: ["cadeau-personnalise-noces-d-or", "cadeaux-personnalises-couple", "cadeaux-saint-valentin-personnalises"],
  },
  {
    slug: "cadeau-personnalise-noces-d-or",
    occasion: "Noces d'or",
    title: "Idées de cadeaux personnalisés pour des noces d'or",
    intro:
      "Pour des noces d'or, 50 ans de mariage, un cadeau personnalisé célèbre toute une famille : un album de leurs 50 ans, un livre de lettres des enfants et petits-enfants, des mots fléchés sur leur histoire, un bijou doré gravé ou une fête de famille. Des idées pour leurs enfants.",
    seoTitle: "Cadeau personnalisé noces d'or (50 ans de mariage) | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour des noces d'or : album de 50 ans de mariage, livre de lettres, mots fléchés personnalisés, bijou doré gravé, fête de famille.",
    items: [
      ["Un album de leurs 50 ans de mariage", "De la photo du mariage aux petits-enfants, un demi-siècle en images."],
      ["Un livre de lettres de la famille", "Chaque enfant et petit-enfant écrit ce que ce couple représente pour lui."],
      ["Une fête de famille", "Les témoins du mariage, les amis de toujours et toute la famille réunis."],
      { carnet: "Cinquante ans d'histoire racontés en grilles : leur rencontre, leur mariage, leurs enfants, leurs maisons. Un jeu à faire à deux, avec un message caché de toute la famille." },
      ["Un bijou ou un objet doré gravé", "L'or, symbole de ces noces, avec leurs prénoms et les deux dates."],
      ["Un voyage sur les lieux de leur mariage", "Un retour à l'église, à la mairie ou dans la région de leur jeunesse."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour des noces d'or",
    tips: [
      "Les noces d'or sont un cadeau de famille : enfants et petits-enfants se réunissent souvent pour un cadeau commun. Répartissez les rôles (photos, lettres, organisation).",
      "Pensez au confort des mariés : textes lisibles, objets faciles à garder, moments sans fatigue.",
    ],
    wordsTitle: "Quels souvenirs glisser dans un cadeau de noces d'or",
    wordsIntro: "Les grands repères de leurs 50 ans ensemble :",
    words: [
      "Le lieu et l'année de leur mariage",
      "Le lieu de leur rencontre",
      "Les prénoms de leurs enfants et petits-enfants",
      "Leurs maisons successives",
      "Le voyage de noces",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir pour des noces d'or ?", "Pour des noces d'or (50 ans de mariage), les cadeaux personnalisés les plus touchants réunissent la famille : un album de leurs 50 ans, un livre de lettres des enfants et petits-enfants, une fête de famille, un bijou doré gravé ou un carnet de mots fléchés qui raconte leur histoire. C'est souvent un cadeau commun des enfants."],
      ["Combien d'années pour les noces d'or ?", "Les noces d'or célèbrent 50 ans de mariage. Elles suivent les noces de vermeil (45 ans) et précèdent les noces d'orchidée (55 ans) et de diamant (60 ans)."],
    ],
    related: ["cadeau-personnalise-anniversaire-de-mariage", "cadeaux-personnalises-parents", "cadeaux-personnalises-grand-mere"],
  },
  {
    slug: "cadeau-personnalise-depart-retraite",
    occasion: "Départ à la retraite",
    title: "Idées de cadeaux personnalisés pour un départ à la retraite",
    intro:
      "Pour un départ à la retraite, le cadeau personnalisé idéal salue la carrière et ouvre la suite : un livre d'or des collègues, des mots fléchés pleins de souvenirs de bureau pour occuper ses matinées, un objet gravé ou une expérience liée à ses projets.",
    seoTitle: "Cadeau personnalisé départ à la retraite : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour un départ à la retraite : livre d'or des collègues, mots fléchés personnalisés, objet gravé, expérience, matériel pour sa passion.",
    items: [
      ["Un livre d'or des collègues", "Chacun écrit un souvenir ou un vœu pour la suite. Le classique incontournable."],
      ["Du matériel pour sa nouvelle passion", "Jardinage, peinture, vélo, voyage : un coup de pouce pour ce qu'il ou elle a enfin le temps de faire."],
      { carnet: "Enfin le temps de faire des mots fléchés le matin ! Des grilles écrites par les collègues, avec les private jokes du bureau, les projets marquants et les surnoms de l'équipe." },
      ["Une expérience", "Un voyage, une croisière, un stage de cuisine pour ouvrir ce nouveau chapitre."],
      ["Un objet gravé", "Une montre (le grand classique), un stylo ou une plaque avec les dates de sa carrière."],
      ["Une caricature de l'équipe", "Un dessin de tout le service, avec les détails que tout le monde reconnaîtra."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour un départ à la retraite",
    tips: [
      "Combinez le passé et l'avenir : un souvenir de la carrière (livre d'or, mots fléchés du bureau) et un coup de pouce pour les projets à venir.",
      "Faites participer toute l'équipe, même les anciens collègues partis ailleurs. C'est ce qui donnera de la valeur au cadeau.",
    ],
    wordsTitle: "Quels souvenirs glisser dans un cadeau de départ à la retraite",
    wordsIntro: "Les clins d'œil de toute une carrière :",
    words: [
      "Le nom de l'entreprise ou du service",
      "Son surnom au bureau",
      "Le projet dont il ou elle est le plus fier",
      "Sa formule de réunion préférée",
      "Sa future passion de retraité",
    ],
    faqs: [
      ["Quel cadeau personnalisé pour un départ à la retraite ?", "Pour un départ à la retraite, les cadeaux personnalisés qui marchent saluent la carrière et ouvrent la suite : un livre d'or des collègues, du matériel pour sa nouvelle passion, une expérience, un objet gravé ou un carnet de mots fléchés écrit par l'équipe avec les souvenirs du bureau. Faites participer tout le service."],
      ["Quel cadeau collectif pour le départ à la retraite d'un collègue ?", "Pour un cadeau collectif de départ à la retraite, réunissez l'équipe autour d'un souvenir commun : un livre d'or, une caricature du service, ou des grilles de mots fléchés dont chaque collègue a proposé un mot. Une cagnotte peut compléter avec une expérience ou un voyage."],
    ],
    related: ["cadeau-personnalise-collegue", "cadeau-personnalise-anniversaire-60-ans", "idees-cadeaux-amoureux-des-mots"],
  },
];
