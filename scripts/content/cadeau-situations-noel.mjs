// Christmas "cadeau personnalisé" guides (group "fete"). Consumed by
// scripts/seed-cadeau-situations.mjs. Items are [name, description],
// { carnet: pitch } for the printed carnet, or { ours: { name, description, href } }
// for another of our own items. Exactly one of ours per guide, never first or last.
// The first entry replaces the original July Noël guide (same slug, same _id).

export const NOEL = [
  {
    slug: "idees-cadeaux-noel-personnalises",
    occasion: "Noël",
    title: "Idées de cadeaux personnalisés à offrir à Noël",
    intro:
      "À Noël, un cadeau personnalisé se remarque sous le sapin parce qu'il raconte quelque chose : un album de l'année, un calendrier de famille, un carnet de mots fléchés écrit sur vos souvenirs, un bijou gravé ou une affiche. Des idées pour toute la famille, à commander tôt.",
    seoTitle: "Cadeau de Noël personnalisé : idées pour toute la famille | Les Flèches",
    seoDescription:
      "Idées de cadeaux de Noël personnalisés : album de l'année, calendrier de famille, mots fléchés personnalisés, bijou gravé, affiche. Par destinataire et avec les délais.",
    items: [
      ["Un album photo de l'année", "Vos meilleurs moments de l'année réunis dans un album à feuilleter en famille le 25 au matin."],
      ["Un calendrier de famille", "Pour l'année qui commence : une photo par mois et toutes les dates importantes déjà notées."],
      ["Un bijou gravé", "Un prénom, une date ou une initiale, discret et intemporel."],
      { carnet: "Un cadeau qui occupe les vacances : des grilles remplies des souvenirs de l'année et des prénoms de la famille, avec un message de Noël qui se dévoile grille après grille." },
      ["Une affiche à encadrer", "Une carte du ciel, le plan de la maison de famille ou une citation qui vous ressemble."],
      ["Une boule de Noël gravée", "Le prénom de chacun ou l'année en cours, à ressortir tous les ans en décorant le sapin."],
    ],
    tipsTitle: "Comment choisir un cadeau de Noël personnalisé",
    tips: [
      "Misez sur l'émotion plutôt que sur l'objet : un cadeau qui rassemble les souvenirs de l'année touche plus qu'un achat de dernière minute.",
      "Anticipez : un cadeau personnalisé se fabrique et s'expédie. Visez une commande début décembre au plus tard, et plus tôt encore pour un objet imprimé et relié.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de Noël personnalisé",
    wordsIntro: "Les souvenirs de l'année font les meilleurs cadeaux de Noël :",
    words: [
      "Le voyage ou les vacances de l'année",
      "Les prénoms des nouveaux venus dans la famille",
      "La tradition de Noël de votre famille (le réveillon, la bûche, le sapin)",
      "La phrase culte de l'année",
      "Un « Joyeux Noël » caché, mot après mot",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à Noël ?", "Les cadeaux de Noël personnalisés les plus appréciés racontent l'année ou la famille : un album photo de l'année, un calendrier de famille pour l'année suivante, un bijou gravé, une affiche ou un carnet de mots fléchés écrit autour de vos souvenirs. Choisissez selon la personne : un amateur de jeux de lettres appréciera les grilles, un nostalgique l'album."],
      ["Jusqu'à quand commander un cadeau personnalisé pour Noël ?", "Pour un cadeau personnalisé fabriqué puis livré (objet gravé, album, carnet imprimé), comptez en général deux à trois semaines entre la commande et la réception. Visez la fin novembre ou le tout début décembre, et vérifiez les délais annoncés par chaque créateur, qui s'allongent à l'approche des fêtes."],
    ],
    related: [
      "cadeau-noel-personnalise-maman",
      "cadeau-noel-personnalise-papa",
      "cadeau-noel-personnalise-grands-parents",
      "cadeau-noel-personnalise-couple",
      "cadeau-noel-personnalise-belle-famille",
      "cadeau-noel-personnalise-meilleure-amie",
      "cadeau-noel-personnalise-collegue",
      "cadeau-noel-personnalise-famille",
      "calendrier-avent-personnalise",
      "cadeau-noel-personnalise-derniere-minute",
    ],
  },
  {
    slug: "cadeau-noel-personnalise-maman",
    occasion: "Noël, pour sa maman",
    title: "Idées de cadeaux de Noël personnalisés pour sa maman",
    intro:
      "Pour le Noël de sa maman, un cadeau personnalisé fait la différence : un album de l'année en famille, un bijou gravé des prénoms de ses enfants, un carnet de recettes, des mots fléchés sur vos souvenirs ou une sortie à deux après les fêtes.",
    seoTitle: "Cadeau de Noël personnalisé pour maman : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux de Noël personnalisés pour sa maman : album de l'année, bijou gravé, carnet de recettes, mots fléchés personnalisés, sortie à deux.",
    items: [
      ["Un album de l'année en famille", "Les moments de l'année réunis, à ouvrir le matin du 25."],
      ["Un bijou gravé des prénoms de ses enfants", "Un classique qui ne lasse jamais, porté tous les jours."],
      { carnet: "Pendant les vacances, quand la maison se calme, elle ouvre un carnet de grilles écrites pour elle : vos prénoms, les Noëls d'enfance, ses expressions favorites." },
      ["Un carnet de recettes de famille", "La bûche, la dinde, les petits gâteaux de Noël : ses recettes enfin réunies."],
      ["Un plaid brodé", "Pour les soirées d'hiver, avec un mot doux brodé dans un coin."],
      ["Une sortie à deux en janvier", "Un spa, une expo ou un restaurant, pour prolonger les fêtes."],
    ],
    tipsTitle: "Comment choisir un cadeau de Noël personnalisé pour sa maman",
    tips: [
      "À Noël, une maman reçoit souvent beaucoup d'objets. Un cadeau qui parle de ses enfants ou de votre histoire se distingue immédiatement.",
      "Pensez au temps des vacances : un cadeau qui se savoure pendant les jours calmes après le 25 (un album, des grilles, un livre) prolonge le plaisir.",
    ],
    wordsTitle: "Quels souvenirs glisser dans un cadeau de Noël pour maman",
    wordsIntro: "Des mots qui la feront sourire au pied du sapin :",
    words: [
      "Les prénoms et surnoms de ses enfants",
      "Le dessert de Noël qu'elle prépare chaque année",
      "Un souvenir de Noël quand vous étiez petits",
      "La maison où la famille se retrouve",
      "Un « merci maman » caché au fil des grilles",
    ],
    faqs: [
      ["Quel cadeau de Noël personnalisé offrir à sa maman ?", "Pour Noël, les cadeaux personnalisés qui touchent une maman parlent de sa famille : un album de l'année, un bijou gravé des prénoms de ses enfants, un carnet de recettes familiales, un plaid brodé ou un carnet de mots fléchés écrit autour de vos souvenirs. Un cadeau à savourer pendant les vacances prolonge les fêtes."],
      ["Quel cadeau de Noël original pour une maman qui a tout ?", "Pour une maman qui a déjà tout, offrez un souvenir plutôt qu'un objet : des Noëls d'enfance racontés dans un album, des grilles de mots fléchés construites sur votre histoire, ou un moment à deux après les fêtes. Ce sont des cadeaux qui ne s'achètent pas en rayon."],
    ],
    related: ["idees-cadeaux-noel-personnalises", "cadeau-personnalise-maman", "cadeau-noel-personnalise-papa"],
  },
  {
    slug: "cadeau-noel-personnalise-papa",
    occasion: "Noël, pour son papa",
    title: "Idées de cadeaux de Noël personnalisés pour son papa",
    intro:
      "Pour le Noël de son papa, un cadeau personnalisé évite la énième paire de chaussettes : un objet gravé qu'il utilisera, un livre pour raconter sa vie, des mots fléchés pleins de souvenirs de famille, une affiche de son club ou une sortie ensemble.",
    seoTitle: "Cadeau de Noël personnalisé pour papa : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux de Noël personnalisés pour son papa : objet gravé, livre « Papa, raconte-moi », mots fléchés personnalisés, affiche, sortie père et enfants.",
    items: [
      ["Un objet gravé qu'il utilisera", "Couteau, planche à découper, porte-clés : un objet du quotidien avec un mot des enfants."],
      ["Un livre « Papa, raconte-moi »", "Il raconte sa vie au fil des questions, pendant les longues soirées d'hiver."],
      { carnet: "Pour le papa qui fait sa grille chaque matin : des mots fléchés où les réponses sont ses blagues, ses surnoms et vos souvenirs communs. De quoi l'occuper entre Noël et le jour de l'an." },
      ["Une affiche de son club ou de son coin préféré", "Son stade, son lieu de pêche ou sa route de vacances, en grand format."],
      ["Un coffret dégustation", "Bières, vins ou cafés, avec une étiquette à son nom."],
      ["Une sortie père et enfants", "Un match, une balade ou un atelier en janvier, offert sous forme de bon."],
    ],
    tipsTitle: "Comment choisir un cadeau de Noël personnalisé pour son papa",
    tips: [
      "Visez un objet qu'il utilisera ou un souvenir qui le fera rire. Les papas qui disent « je n'ai besoin de rien » apprécient souvent un cadeau qui parle de la famille.",
      "Un cadeau à faire pendant les vacances (un livre, des grilles, un jeu) a l'avantage d'être utilisé tout de suite.",
    ],
    wordsTitle: "Quels souvenirs glisser dans un cadeau de Noël pour papa",
    wordsIntro: "Des mots qui le feront réagir au pied du sapin :",
    words: [
      "Sa blague de Noël de chaque année",
      "Le nom de son équipe ou de son sport",
      "Sa première voiture",
      "Le surnom que lui donnent ses enfants",
      "Le plat qu'il prépare pour les fêtes",
    ],
    faqs: [
      ["Quel cadeau de Noël personnalisé offrir à son papa ?", "Pour Noël, un papa apprécie un cadeau personnalisé qui colle à ses passions : un objet gravé qu'il utilisera, un livre pour raconter sa vie, une affiche de son club, un coffret dégustation ou un carnet de mots fléchés rempli de souvenirs de famille. Un cadeau à utiliser pendant les vacances a l'avantage de servir tout de suite."],
      ["Quel cadeau de Noël pour un papa qui ne veut rien ?", "Pour un papa qui ne veut rien, offrez du temps ou des souvenirs : une sortie ensemble, un livre où il raconte sa vie, ou des grilles de mots fléchés dont les réponses sont vos histoires de famille. Ces cadeaux ne s'empilent pas dans un placard."],
    ],
    related: ["idees-cadeaux-noel-personnalises", "cadeau-personnalise-papa", "cadeau-noel-personnalise-maman"],
  },
  {
    slug: "cadeau-noel-personnalise-grands-parents",
    occasion: "Noël, pour les grands-parents",
    title: "Idées de cadeaux de Noël personnalisés pour ses grands-parents",
    intro:
      "Pour Noël, les grands-parents sont touchés par un cadeau qui leur ramène les petits-enfants : un calendrier photo de l'année à venir, un album, des mots fléchés aux prénoms de toute la famille, des dessins encadrés ou une visite.",
    seoTitle: "Cadeau de Noël personnalisé pour grands-parents | Les Flèches",
    seoDescription:
      "Idées de cadeaux de Noël personnalisés pour ses grands-parents : calendrier photo, album des petits-enfants, mots fléchés personnalisés, dessins encadrés, visite.",
    items: [
      ["Un calendrier photo de l'année à venir", "Une photo des petits-enfants par mois, et tous les anniversaires déjà notés."],
      ["Un album des petits-enfants", "Les photos de l'année avec un petit mot de chacun."],
      { carnet: "Beaucoup de grands-parents font des mots fléchés tous les jours. Des grilles où ils retrouvent les prénoms des petits-enfants, la maison de famille et leurs souvenirs en font un cadeau qu'ils garderont longtemps, imprimé en caractères lisibles." },
      ["Des dessins encadrés", "Les dessins de Noël des petits, mis en valeur dans un joli cadre."],
      ["Un cadre photo numérique", "Préchargé de photos de famille et mis à jour à distance tout au long de l'année."],
      ["Une visite ou une journée ensemble", "Le cadeau qu'ils préfèrent souvent : du temps avec les petits-enfants."],
    ],
    tipsTitle: "Comment choisir un cadeau de Noël personnalisé pour ses grands-parents",
    tips: [
      "Faites participer les petits-enfants : un dessin, un mot ou une idée de définition rend le cadeau unique à leurs yeux.",
      "Pensez lisible et simple : gros caractères, belles photos, objets faciles à utiliser.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de Noël pour ses grands-parents",
    wordsIntro: "Les mots qui les feront sourire :",
    words: [
      "Les prénoms de tous les petits-enfants",
      "Leurs surnoms (Mamie, Papi, Mamounette…)",
      "La maison où la famille fête Noël",
      "Leur spécialité des fêtes",
      "Un souvenir de vacances chez eux",
    ],
    faqs: [
      ["Quel cadeau de Noël personnalisé offrir à ses grands-parents ?", "Pour Noël, les grands-parents apprécient les cadeaux qui leur ramènent les petits-enfants : un calendrier photo de l'année à venir, un album, des dessins encadrés, un cadre photo numérique ou un carnet de mots fléchés dont les réponses sont les prénoms et souvenirs de la famille. Une visite reste souvent le cadeau préféré."],
      ["Quel cadeau de Noël pour une grand-mère qui aime les mots fléchés ?", "Pour une grand-mère amatrice de mots fléchés, offrez des grilles personnalisées : les réponses sont les prénoms de ses petits-enfants, ses souvenirs et ses traditions de Noël, et le tout est imprimé et relié comme un vrai carnet. Elle retrouve son jeu préféré, avec sa famille dedans."],
    ],
    related: ["idees-cadeaux-noel-personnalises", "cadeaux-personnalises-grand-mere", "cadeau-personnalise-grand-pere"],
  },
  {
    slug: "cadeau-noel-personnalise-couple",
    occasion: "Noël, pour son copain ou sa copine",
    title: "Idées de cadeaux de Noël personnalisés pour son copain ou sa copine",
    intro:
      "Pour Noël en couple, un cadeau personnalisé dit « je te connais » : une affiche du lieu de votre rencontre, un bijou gravé, des mots fléchés sur votre histoire avec un message caché, un livre de vos souvenirs ou un week-end à deux.",
    seoTitle: "Cadeau de Noël personnalisé pour son couple : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux de Noël personnalisés pour son copain ou sa copine : affiche du lieu de rencontre, bijou gravé, mots fléchés avec message caché, week-end à deux.",
    items: [
      ["Une affiche du lieu de votre rencontre", "Le plan de la ville ou le ciel de ce soir-là, avec la date."],
      ["Un bijou gravé", "Vos initiales, une date ou un mot à vous."],
      ["Un livre de vos souvenirs", "Vos photos et vos anecdotes réunies, de la rencontre à aujourd'hui."],
      { carnet: "Des grilles qui racontent votre histoire, avec vos private jokes en réponses. Les mots cachés, grille après grille, forment un message que vous seul ou seule pouviez écrire." },
      ["Un week-end à deux", "Offert le 25, à vivre en janvier quand les fêtes sont passées."],
      ["Une boule de Noël à vos prénoms", "La première d'une tradition à deux, à ressortir chaque année."],
    ],
    tipsTitle: "Comment choisir un cadeau de Noël personnalisé pour son couple",
    tips: [
      "Le cadeau le plus fort rappelle un moment que vous seuls partagez : la rencontre, un voyage, une phrase.",
      "Un message caché ou une surprise qui se dévoile petit à petit rend l'ouverture du cadeau mémorable.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de Noël pour son couple",
    wordsIntro: "Les mots de votre histoire :",
    words: [
      "Le lieu de votre rencontre",
      "Vos surnoms l'un pour l'autre",
      "Votre premier voyage",
      "Votre chanson",
      "Un « je t'aime » caché au fil des grilles",
    ],
    faqs: [
      ["Quel cadeau de Noël personnalisé offrir à son copain ou sa copine ?", "Pour Noël en couple, les cadeaux personnalisés qui marchent racontent votre histoire : une affiche du lieu de votre rencontre, un bijou gravé, un livre de vos souvenirs, un week-end à deux ou un carnet de mots fléchés avec un message caché. Le détail personnel compte plus que le prix."],
      ["Quel cadeau de Noël original pour son couple ?", "Pour un Noël original à deux, choisissez un cadeau qui se découvre : des grilles de mots fléchés dont les mots cachés forment un message, une énigme qui mène à un week-end, ou une boule de Noël qui lance une tradition. L'effet de surprise fait la moitié du cadeau."],
    ],
    related: ["idees-cadeaux-noel-personnalises", "cadeaux-personnalises-couple", "cadeaux-saint-valentin-personnalises"],
  },
  {
    slug: "cadeau-noel-personnalise-belle-famille",
    occasion: "Noël, pour sa belle-famille",
    title: "Idées de cadeaux de Noël personnalisés pour sa belle-famille",
    intro:
      "Pour un Noël dans la belle-famille, le bon cadeau personnalisé est chaleureux sans être trop intime : un calendrier photo de famille, un panier gourmand étiqueté, des mots fléchés sur la famille, une plante ou une boule de Noël gravée.",
    seoTitle: "Cadeau de Noël personnalisé pour sa belle-famille | Les Flèches",
    seoDescription:
      "Idées de cadeaux de Noël personnalisés pour ses beaux-parents et sa belle-famille : calendrier photo, panier gourmand, mots fléchés personnalisés, boule gravée.",
    items: [
      ["Un calendrier photo de famille", "Les photos de l'année, petits-enfants en tête, avec les anniversaires de chacun."],
      ["Un panier gourmand de votre région", "Des produits que vous aimez, avec une étiquette personnalisée."],
      { carnet: "Si vos beaux-parents aiment les mots fléchés, des grilles autour de la famille montrent que vous connaissez leur univers : prénoms, maison de famille, traditions de Noël." },
      ["Une boule de Noël gravée", "Le nom de la famille et l'année, à accrocher chaque Noël."],
      ["Une plante d'hiver dans un pot gravé", "Un cadeau simple et durable pour la maison."],
      ["Un cadre avec une photo de toute la famille", "Prise lors d'un repas de l'année, enfin imprimée."],
    ],
    tipsTitle: "Comment choisir un cadeau de Noël personnalisé pour sa belle-famille",
    tips: [
      "Visez la famille que vous partagez : petits-enfants, maison de famille, traditions. C'est le terrain le plus sûr.",
      "En cas de doute, demandez à votre conjoint une passion ou une habitude à mettre en avant.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de Noël pour sa belle-famille",
    wordsIntro: "Des mots personnels mais rassembleurs :",
    words: [
      "Les prénoms des enfants et petits-enfants",
      "La maison ou la région de famille",
      "Leur tradition de Noël",
      "Leur spécialité culinaire",
      "Le nom de leur animal",
    ],
    faqs: [
      ["Quel cadeau de Noël personnalisé offrir à ses beaux-parents ?", "Pour ses beaux-parents à Noël, un cadeau personnalisé chaleureux sans être trop intime est idéal : un calendrier photo de famille, un panier gourmand étiqueté, une boule de Noël gravée, un cadre photo ou un carnet de mots fléchés sur la famille. Les petits-enfants et les traditions sont les thèmes les plus sûrs."],
      ["Quel petit cadeau de Noël pour sa belle-famille ?", "Pour un petit cadeau de Noël à sa belle-famille, une boule gravée au nom de la famille, un panier gourmand ou une plante dans un pot personnalisé font plaisir sans gêner. L'attention compte plus que le budget."],
    ],
    related: ["idees-cadeaux-noel-personnalises", "cadeau-personnalise-belle-mere", "cadeau-noel-personnalise-grands-parents"],
  },
  {
    slug: "cadeau-noel-personnalise-meilleure-amie",
    occasion: "Noël, pour sa meilleure amie",
    title: "Idées de cadeaux de Noël personnalisés pour sa meilleure amie",
    intro:
      "Pour le Noël de sa meilleure amie, un cadeau personnalisé joue sur votre complicité : des bijoux assortis, un album de vos années, des mots fléchés pleins de private jokes, une bougie à votre nom ou une sortie entre filles.",
    seoTitle: "Cadeau de Noël personnalisé pour sa meilleure amie | Les Flèches",
    seoDescription:
      "Idées de cadeaux de Noël personnalisés pour sa meilleure amie : bijoux assortis, album d'amitié, mots fléchés personnalisés, bougie, sortie entre amies.",
    items: [
      ["Des bijoux assortis", "Un pour chacune, avec une initiale ou un mot à vous."],
      ["Un album de vos années d'amitié", "Les soirées, les voyages, les photos que vous n'avez jamais imprimées."],
      { carnet: "Toutes vos private jokes dans des grilles qu'elle seule peut résoudre : vos surnoms, vos soirées, vos voyages, avec un message de Noël caché." },
      ["Une bougie avec une étiquette personnalisée", "Un parfum d'hiver et une phrase qui n'appartient qu'à vous."],
      ["Une playlist de votre amitié", "Imprimée façon pochette de vinyle, à accrocher."],
      ["Une sortie entre amies", "Un atelier, un spa ou un concert à vivre en janvier."],
    ],
    tipsTitle: "Comment choisir un cadeau de Noël personnalisé pour sa meilleure amie",
    tips: [
      "Puisez dans ce que vous seules partagez : un surnom, une soirée, une chanson. C'est ce qui rend le cadeau impossible à copier.",
      "Si vous vivez loin l'une de l'autre, un cadeau qui se garde et se feuillette entretient le lien toute l'année.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de Noël pour sa meilleure amie",
    wordsIntro: "Les ingrédients d'un cadeau complice :",
    words: [
      "Le lieu de votre rencontre",
      "Vos surnoms",
      "La soirée dont vous parlez encore",
      "Votre voyage le plus fou",
      "Votre chanson",
    ],
    faqs: [
      ["Quel cadeau de Noël personnalisé offrir à sa meilleure amie ?", "Pour Noël, une meilleure amie appréciera un cadeau personnalisé qui joue sur votre complicité : des bijoux assortis, un album de vos années d'amitié, une bougie personnalisée, une sortie ensemble ou un carnet de mots fléchés rempli de vos private jokes."],
      ["Quel cadeau de Noël original pour sa meilleure amie ?", "Pour un cadeau original, choisissez quelque chose qu'elle seule peut comprendre : des grilles de mots fléchés construites sur vos souvenirs, une playlist de votre amitié ou un album de photos jamais imprimées. L'originalité vient de votre histoire commune."],
    ],
    related: ["idees-cadeaux-noel-personnalises", "cadeaux-personnalises-meilleur-ami", "cadeau-personnalise-soeur"],
  },
  {
    slug: "cadeau-noel-personnalise-collegue",
    occasion: "Noël, pour un collègue",
    title: "Idées de cadeaux de Noël personnalisés pour un collègue",
    intro:
      "Pour Noël au bureau, Secret Santa ou cadeau d'équipe, un cadeau personnalisé fait rire tout le monde : un mug avec une phrase culte, une plante gravée, une boule de Noël au nom de l'équipe ou des mots fléchés pleins de private jokes du bureau.",
    seoTitle: "Cadeau de Noël personnalisé pour collègue et Secret Santa | Les Flèches",
    seoDescription:
      "Idées de cadeaux de Noël personnalisés pour un collègue ou un Secret Santa : mug, plante gravée, boule de Noël d'équipe, mots fléchés du bureau, chocolats.",
    items: [
      ["Un mug avec une phrase culte du bureau", "Le classique du Secret Santa, rendu drôle par une réplique que tout le monde reconnaît."],
      ["Une plante de bureau dans un pot gravé", "Un petit budget et un cadeau qui dure."],
      ["Une boule de Noël au nom de l'équipe", "Pour décorer le bureau et garder un souvenir de l'année."],
      { carnet: "Pour un cadeau commun de l'équipe plutôt qu'un Secret Santa : chaque collègue propose un mot ou une définition (le surnom du chef, la machine à café, les réunions du lundi) et tout le monde se retrouve dans les grilles." },
      ["Des chocolats avec une étiquette personnalisée", "Une valeur sûre, avec un mot pour chacun."],
      ["Une carte signée par toute l'équipe", "Simple, mais toujours gardée."],
    ],
    tipsTitle: "Comment choisir un cadeau de Noël personnalisé pour un collègue",
    tips: [
      "Respectez le budget fixé par l'équipe : en Secret Santa, une attention bien trouvée vaut mieux qu'un cadeau cher.",
      "Gardez un humour bienveillant. Les private jokes du bureau font mouche tant que la personne peut en rire aussi.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de Noël pour un collègue",
    wordsIntro: "Les clins d'œil qui font rire toute l'équipe :",
    words: [
      "Le surnom de l'équipe ou du projet",
      "La machine à café capricieuse",
      "Le resto du midi",
      "Sa phrase favorite en réunion",
      "Le pot de fin d'année",
    ],
    faqs: [
      ["Quel cadeau de Noël personnalisé offrir à un collègue ?", "Pour un collègue à Noël, un cadeau personnalisé et drôle fonctionne bien : un mug avec une phrase culte du bureau, une plante dans un pot gravé, une boule de Noël au nom de l'équipe ou des chocolats étiquetés. Pour un cadeau commun d'équipe, un carnet de mots fléchés où chaque collègue a proposé un mot rassemble tout le monde."],
      ["Quelle idée de cadeau personnalisé pour un Secret Santa ?", "Pour un Secret Santa, restez dans le budget de l'équipe et misez sur un clin d'œil personnel : un mug avec une réplique culte, une plante gravée, une bougie ou des chocolats avec un mot. Une attention bien trouvée compte plus qu'un objet cher."],
    ],
    related: ["idees-cadeaux-noel-personnalises", "cadeau-personnalise-collegue", "cadeau-noel-personnalise-derniere-minute"],
  },
  {
    slug: "cadeau-noel-personnalise-famille",
    occasion: "Noël, à partager en famille",
    title: "Idées de cadeaux de Noël personnalisés à partager en famille",
    intro:
      "Certains cadeaux de Noël se partagent : un jeu de société sur la famille, un album à feuilleter ensemble, un carnet de mots fléchés à résoudre tous ensemble le 25, une boule par membre de la famille ou une sortie commune. Des idées pour toute la tribu.",
    seoTitle: "Cadeau de Noël personnalisé à partager en famille | Les Flèches",
    seoDescription:
      "Idées de cadeaux de Noël personnalisés à partager en famille : jeu de société sur mesure, album, mots fléchés à résoudre ensemble, boules gravées, sortie commune.",
    items: [
      ["Un quiz ou un jeu de société sur la famille", "Des questions sur chacun, à sortir après le repas du réveillon."],
      ["Un album de l'année à feuilleter ensemble", "Chacun y retrouve ses moments, et tout le monde se souvient."],
      { carnet: "Une activité pour l'après-midi du 25 : des grilles où les réponses sont les prénoms, les souvenirs et les private jokes de la famille. Petits et grands résolvent ensemble, et le message caché se dévoile à la dernière grille." },
      ["Une boule de Noël par membre de la famille", "Chacun la sienne, à accrocher ensemble chaque année."],
      ["Un arbre généalogique illustré", "Toute la famille sur une affiche, à compléter au fil des naissances."],
      ["Une sortie commune", "Un spectacle, une patinoire ou un marché de Noël, offerts à tous."],
    ],
    tipsTitle: "Comment choisir un cadeau de Noël à partager en famille",
    tips: [
      "Pensez à un cadeau qui se vit ensemble pendant les fêtes, pas seulement à un objet de plus sous le sapin.",
      "Prévoyez des niveaux pour tous les âges : des questions faciles pour les enfants, des souvenirs anciens pour les grands-parents.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de Noël familial",
    wordsIntro: "De quoi faire participer toute la famille :",
    words: [
      "Les prénoms et surnoms de chacun",
      "Les traditions du réveillon",
      "Les animaux de la famille",
      "Les vacances de l'année",
      "Les phrases cultes des repas de famille",
    ],
    faqs: [
      ["Quel cadeau de Noël offrir à toute la famille ?", "Pour toute la famille, choisissez un cadeau qui se partage : un quiz ou un jeu de société sur la famille, un album de l'année, une boule de Noël par personne, une sortie commune ou un carnet de mots fléchés personnalisé à résoudre ensemble le 25. Ce sont des cadeaux qui créent un moment plutôt qu'un objet de plus."],
      ["Quelle activité faire en famille le jour de Noël ?", "Le jour de Noël, les jeux qui parlent de la famille rassemblent toutes les générations : un quiz sur chacun, un album à commenter ou des mots fléchés personnalisés dont les réponses sont vos souvenirs communs. Les enfants cherchent les prénoms, les grands-parents racontent les anecdotes."],
    ],
    related: ["idees-cadeaux-noel-personnalises", "calendrier-avent-personnalise", "cadeaux-personnalises-parents"],
  },
  {
    slug: "calendrier-avent-personnalise",
    occasion: "Calendrier de l'Avent",
    title: "Idées de calendriers de l'Avent personnalisés",
    intro:
      "Un calendrier de l'Avent personnalisé transforme décembre en 24 petites surprises : des mots doux, des photos, des défis, ou une grille de mots fléchés par jour dont les mots cachés forment un message le 24. Des idées pour un couple, un enfant, des parents ou des amis.",
    seoTitle: "Calendrier de l'Avent personnalisé : idées originales | Les Flèches",
    seoDescription:
      "Idées de calendriers de l'Avent personnalisés : 24 mots doux, photos, défis, mots fléchés avec un message le 24 décembre, petits cadeaux. À préparer avant le 1er décembre.",
    items: [
      ["24 mots doux dans des enveloppes", "Un souvenir, un compliment ou un « tu te rappelles ? » par jour."],
      ["24 photos de votre année", "Une photo à découvrir chaque matin, avec une légende écrite à la main."],
      ["24 petits défis ou rendez-vous", "Un chocolat chaud, un film, une balade : un moment à vivre chaque jour."],
      { carnet: "Un carnet de 24 grilles, une par jour du 1er au 24 décembre. Chaque grille parle de vous et cache un mot, et le 24 au soir les mots réunis forment votre message de Noël." },
      ["24 petits objets de son quotidien", "Son thé préféré, une carte, un stylo : des petites choses choisies pour lui ou pour elle."],
      ["24 recettes de famille", "Une recette par jour, pour cuisiner ensemble jusqu'à Noël."],
    ],
    tipsTitle: "Comment préparer un calendrier de l'Avent personnalisé",
    tips: [
      "Commencez tôt : un calendrier de l'Avent doit être prêt le 1er décembre. Pour un objet imprimé ou fabriqué, commandez dès la première quinzaine de novembre.",
      "Construisez une progression : des petites surprises au début, et quelque chose de plus fort le 24 (un message, un dernier cadeau, une révélation).",
    ],
    wordsTitle: "Quels mots et messages cacher dans un calendrier de l'Avent",
    wordsIntro: "Des idées de messages qui se dévoilent jour après jour :",
    words: [
      "« Joyeux Noël mon amour » ou « Merci pour cette année »",
      "Les prénoms de la famille, un par semaine",
      "Les étapes de votre histoire",
      "Une destination de voyage révélée le 24",
      "Une grande nouvelle à annoncer",
    ],
    faqs: [
      ["Comment faire un calendrier de l'Avent personnalisé original ?", "Pour un calendrier de l'Avent original, remplacez les chocolats par des surprises qui parlent de la personne : 24 mots doux, 24 photos de l'année, 24 petits défis ou un carnet de 24 grilles de mots fléchés dont les mots cachés forment un message le 24 décembre. Prévoyez une progression jusqu'à une dernière surprise plus forte."],
      ["Quand préparer un calendrier de l'Avent personnalisé ?", "Un calendrier de l'Avent doit être prêt le 1er décembre. Pour un calendrier fait maison, commencez mi-novembre ; pour un objet imprimé ou fabriqué, commandez dès la première quinzaine de novembre pour tenir compte des délais de fabrication et de livraison."],
    ],
    related: ["idees-cadeaux-noel-personnalises", "cadeau-noel-personnalise-couple", "cadeau-noel-personnalise-famille"],
  },
  {
    slug: "cadeau-noel-personnalise-derniere-minute",
    occasion: "Noël, dernière minute",
    title: "Idées de cadeaux de Noël personnalisés de dernière minute",
    intro:
      "Un cadeau de Noël personnalisé de dernière minute reste possible : une lettre manuscrite, un bon pour une expérience, une grille de mots fléchés personnalisée à imprimer chez soi, une carte cadeau avec un mot ou un album numérique. Des idées prêtes en quelques heures.",
    seoTitle: "Cadeau de Noël personnalisé de dernière minute | Les Flèches",
    seoDescription:
      "Idées de cadeaux de Noël personnalisés de dernière minute : lettre, bon pour une expérience, grille de mots fléchés personnalisée à imprimer, album numérique.",
    items: [
      ["Une lettre manuscrite", "Ce que vous n'avez jamais dit, sur un beau papier. Le cadeau le plus rapide et souvent le plus gardé."],
      ["Un bon pour une expérience", "Un restaurant, un spa ou une sortie, à imprimer et glisser dans une carte."],
      { ours: { name: "Une grille de mots fléchés personnalisée à imprimer", description: "Composée en quelques minutes avec vos mots (prénoms, souvenirs, private jokes), elle s'imprime tout de suite chez vous, gratuitement. Glissée dans une carte ou sous une assiette le soir du réveillon, c'est un cadeau de dernière minute qui ne fait pas dernière minute.", href: "/fleche" } },
      ["Un album photo numérique", "Une sélection de vos photos de l'année, partagée le 25 au matin."],
      ["Un bon « fait maison »", "Un dîner cuisiné, une journée de baby-sitting, une balade : à offrir sous forme de coupon."],
      ["Une carte cadeau avec un vrai mot", "Rendue personnelle par quelques lignes écrites à la main."],
    ],
    tipsTitle: "Comment trouver un cadeau personnalisé de dernière minute",
    tips: [
      "À quelques jours de Noël, privilégiez ce qui ne dépend pas d'une livraison : ce que vous écrivez, imprimez ou organisez vous-même.",
      "Un bon ou une promesse (un voyage, un objet commandé après les fêtes) est un vrai cadeau s'il est accompagné d'un mot personnel.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau de dernière minute",
    wordsIntro: "Pour personnaliser en un rien de temps :",
    words: [
      "Son prénom et son surnom",
      "Un souvenir de l'année",
      "Une phrase qu'il ou elle répète souvent",
      "Le lieu de vos prochaines vacances",
      "Un « Joyeux Noël » caché",
    ],
    faqs: [
      ["Quel cadeau personnalisé de dernière minute pour Noël ?", "À la dernière minute, choisissez un cadeau personnalisé qui ne dépend pas d'une livraison : une lettre manuscrite, un bon pour une expérience, un album photo numérique, un coupon fait maison ou une grille de mots fléchés personnalisée à imprimer chez soi. Quelques lignes écrites à la main rendent n'importe quel bon personnel."],
      ["Peut-on créer des mots fléchés personnalisés à imprimer soi-même ?", "Oui. Avec un générateur en ligne comme celui des Flèches, vous choisissez vos mots (prénoms, lieux, souvenirs), la grille se construit autour et vous l'imprimez gratuitement chez vous en quelques minutes. C'est une idée de cadeau de dernière minute qui reste très personnelle."],
    ],
    related: ["idees-cadeaux-noel-personnalises", "cadeau-noel-personnalise-collegue", "cadeau-noel-personnalise-famille"],
  },
];
