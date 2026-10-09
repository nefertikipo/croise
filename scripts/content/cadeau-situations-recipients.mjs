// Recipient-based "cadeau personnalisé" guides. Consumed by
// scripts/seed-cadeau-situations.mjs. Items are [name, description] or
// { carnet: pitch } for our own item (exactly once, never first or last).

export const RECIPIENTS = [
  {
    slug: "cadeau-personnalise-maman",
    occasion: "Pour sa maman",
    title: "Idées de cadeaux personnalisés pour sa maman",
    intro:
      "Un cadeau personnalisé réussi pour une maman raconte votre histoire commune : un album de famille, un bijou gravé aux initiales de ses enfants, un carnet de recettes ou des mots fléchés écrits autour de ses souvenirs. Des idées qui changent du bouquet de fleurs.",
    seoTitle: "Cadeau personnalisé pour maman : idées qui touchent | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour sa maman : album photo de famille, bijou gravé, carnet de recettes, mots fléchés personnalisés, expérience à deux.",
    items: [
      ["Un album photo de famille", "Les photos qui dorment dans les téléphones, enfin réunies dans un album qu'elle peut feuilleter et montrer."],
      ["Un bijou gravé", "Un collier ou un bracelet avec les initiales de ses enfants ou une date qui compte. Discret, et porté tous les jours."],
      ["Un carnet de recettes de famille", "Ses plats signature et ceux de sa propre mère, rassemblés et imprimés pour qu'ils ne se perdent pas."],
      { carnet: "Si votre maman fait des mots fléchés le dimanche, offrez-lui des grilles où les réponses parlent d'elle : vos prénoms, la maison de vacances, ses expressions favorites." },
      ["Un recueil de mots des enfants", "Chaque enfant écrit un souvenir ou un merci, et vous les réunissez dans une jolie boîte ou un petit livret."],
      ["Une affiche de la carte du ciel", "Le ciel du jour de votre naissance, accompagné d'une phrase qui n'appartient qu'à vous deux."],
      ["Une journée à deux", "Un atelier poterie, un spa ou un restaurant qu'elle ne s'offrirait pas. Le vrai cadeau, c'est le temps passé ensemble."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour sa maman",
    tips: [
      "Partez d'un souvenir précis plutôt que d'un objet. Une maman se lasse vite de la décoration, mais elle garde tout ce qui parle de ses enfants.",
      "Regardez aussi ses habitudes : si elle lit, jardine ou fait des jeux de lettres, le cadeau peut prolonger un plaisir qu'elle a déjà.",
    ],
    wordsTitle: "Quels mots et souvenirs glisser dans un cadeau pour maman",
    wordsIntro: "Pour une gravure, une lettre ou une grille de mots fléchés, ces pistes marchent presque toujours :",
    words: [
      "Les prénoms et surnoms de ses enfants",
      "La ville ou la maison où vous avez grandi",
      "Le plat que toute la famille lui réclame",
      "Une expression qu'elle répète tout le temps",
      "Le lieu des vacances en famille",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à sa maman ?", "Les cadeaux personnalisés qui touchent le plus une maman parlent de sa famille : un album photo, un bijou gravé aux initiales de ses enfants, un carnet de recettes familiales ou un carnet de mots fléchés dont les réponses sont vos prénoms et vos souvenirs. Choisissez selon ses goûts : une maman qui aime les jeux de lettres appréciera les grilles, une autre préférera un bijou."],
      ["Quel cadeau personnalisé pour une maman qui a déjà tout ?", "Quand elle a déjà tout, offrez ce qui ne s'achète pas tel quel : des souvenirs mis en forme. Un recueil de mots des enfants, un album de photos oubliées ou des mots fléchés construits autour de votre histoire ont une valeur qu'aucun objet n'a. Une expérience partagée fonctionne aussi très bien."],
    ],
    related: ["cadeau-personnalise-fete-des-meres", "cadeaux-personnalises-parents", "cadeaux-personnalises-grand-mere"],
  },
  {
    slug: "cadeau-personnalise-papa",
    occasion: "Pour son papa",
    title: "Idées de cadeaux personnalisés pour son papa",
    intro:
      "Pour un papa, un cadeau personnalisé fonctionne quand il colle à ses passions : un objet gravé qu'il utilisera, un livre de ses anecdotes, une affiche de son club ou des mots fléchés remplis de souvenirs de famille. Des idées pour éviter la cravate.",
    seoTitle: "Cadeau personnalisé pour papa : idées originales | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour son papa : couteau ou outil gravé, livre d'anecdotes, mots fléchés personnalisés, affiche, expérience à partager.",
    items: [
      ["Un couteau ou un outil gravé", "Un bel objet du quotidien avec son prénom ou une date. Il le gardera des années."],
      ["Un livre « Papa, raconte-moi »", "Un livre de questions à remplir sur sa vie. Il écrit, et vous gardez ses histoires pour toujours."],
      ["Une affiche de son club ou de son coin préféré", "Le stade de son équipe, la carte de son lieu de pêche ou la route de ses vacances, en grand format."],
      { carnet: "Beaucoup de papas font leur grille de mots fléchés dans le journal. Remplacez les définitions habituelles par ses anecdotes, ses surnoms et les blagues de famille qu'il raconte depuis trente ans." },
      ["Un coffret dégustation", "Bières, vins ou cafés de sa région préférée, avec une étiquette à son nom."],
      ["Un mug ou un tablier personnalisé", "Petit budget, mais une phrase bien trouvée (sa réplique culte, par exemple) le rend précieux."],
      ["Une sortie père et enfant", "Un match, une balade en voilier ou un atelier barbecue. Un souvenir de plus à raconter."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour son papa",
    tips: [
      "Les papas disent souvent qu'ils n'ont besoin de rien. Visez un objet qu'il utilisera vraiment ou un souvenir qui le fera rire, plutôt qu'un gadget.",
      "L'humour fonctionne bien : une réplique culte, un surnom ou une anecdote de famille rendent le cadeau unique sans en faire trop.",
    ],
    wordsTitle: "Quels mots et souvenirs glisser dans un cadeau pour papa",
    wordsIntro: "Quelques pistes de mots à graver, écrire ou cacher dans une grille :",
    words: [
      "Sa réplique ou sa blague fétiche",
      "Le nom de son équipe ou de son sport",
      "Sa première voiture",
      "Le surnom que lui donnent ses enfants",
      "Le lieu des vacances d'enfance",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à son papa ?", "Un bon cadeau personnalisé pour un papa colle à ses passions ou à vos souvenirs communs : un outil ou un couteau gravé, un livre de questions sur sa vie, une affiche de son club ou un carnet de mots fléchés dont les réponses sont ses anecdotes et vos surnoms. Choisissez un objet qu'il utilisera ou un souvenir qui le fera rire."],
      ["Quel cadeau original pour un papa qui ne veut rien ?", "Pour un papa qui ne veut rien, misez sur l'expérience ou le souvenir plutôt que l'objet : une sortie à deux, un livre où il raconte sa vie, ou des grilles de mots fléchés construites autour de vos histoires de famille. Ces cadeaux ne s'empilent pas dans un placard."],
    ],
    related: ["cadeau-personnalise-fete-des-peres", "cadeaux-personnalises-parents", "cadeau-personnalise-homme"],
  },
  {
    slug: "cadeau-personnalise-grand-pere",
    occasion: "Pour un grand-père",
    title: "Idées de cadeaux personnalisés pour un grand-père",
    intro:
      "Un grand-père est souvent touché par un cadeau qui rassemble la famille : un album des petits-enfants, un arbre généalogique illustré, un livre de ses souvenirs ou des mots fléchés aux prénoms de toute la tribu. Des idées simples, pensées pour lui.",
    seoTitle: "Cadeau personnalisé pour grand-père : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour un grand-père : album des petits-enfants, arbre généalogique, mots fléchés personnalisés, livre de souvenirs, objet gravé.",
    items: [
      ["Un album des petits-enfants", "Les photos de l'année, avec un petit mot de chacun. Il le montrera à tous ses amis."],
      ["Un arbre généalogique illustré", "Toute la famille sur une affiche, des arrière-grands-parents aux derniers nés."],
      { carnet: "Les mots fléchés sont souvent le rendez-vous quotidien des grands-pères. Des grilles où il retrouve les prénoms de ses petits-enfants, son village et ses histoires de jeunesse en font un jeu qu'il gardera précieusement." },
      ["Un livre de ses souvenirs", "Un livre à questions qu'il remplit, ou une interview enregistrée puis mise en page par vos soins."],
      ["Un objet gravé", "Une montre, un porte-clés ou un couteau avec une date ou les initiales de ses petits-enfants."],
      ["Un calendrier photo familial", "Chaque mois une photo et les anniversaires de la famille. Utile et affectueux."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour un grand-père",
    tips: [
      "Pensez lisible et durable : gros caractères, belles photos, objets solides. Un cadeau qu'il peut sortir et montrer vaut mieux qu'un gadget.",
      "Impliquez les petits-enfants : un dessin, un mot ou une idée de définition de chacun donne au cadeau toute sa valeur.",
    ],
    wordsTitle: "Quels mots et souvenirs glisser dans un cadeau pour grand-père",
    wordsIntro: "Les mots qui le feront sourire, à écrire, graver ou cacher dans une grille :",
    words: [
      "Les prénoms de tous ses petits-enfants",
      "Son village ou sa ville natale",
      "Son ancien métier",
      "Le surnom que lui donnent les petits (Papi, Papy, Pépé…)",
      "Sa passion : jardin, pêche, pétanque, bricolage",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à un grand-père ?", "Les grands-pères apprécient les cadeaux qui réunissent la famille : un album des petits-enfants, un arbre généalogique illustré, un objet gravé ou un carnet de mots fléchés où les réponses sont les prénoms et souvenirs de la famille. Impliquer les petits-enfants (un dessin, un mot, une idée) rend le cadeau encore plus touchant."],
      ["Quel cadeau pour un grand-père qui aime les mots fléchés ?", "Pour un grand-père amateur de mots fléchés, offrez des grilles personnalisées : les définitions renvoient à sa vie, ses petits-enfants et ses souvenirs, et elles sont imprimées et reliées comme un vrai carnet de jeux. Un gros stylo et une loupe élégante complètent bien le cadeau."],
    ],
    related: ["cadeaux-personnalises-grand-mere", "cadeau-personnalise-anniversaire-80-ans", "cadeau-personnalise-papa"],
  },
  {
    slug: "cadeau-personnalise-soeur",
    occasion: "Pour sa sœur",
    title: "Idées de cadeaux personnalisés pour sa sœur",
    intro:
      "Entre sœurs, le cadeau personnalisé idéal joue sur la complicité : un bijou assorti, un album de vos années d'enfance, des mots fléchés remplis de vos private jokes ou une expérience à deux. Des idées qui disent « on se connaît par cœur ».",
    seoTitle: "Cadeau personnalisé pour sa sœur : idées complices | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour sa sœur : bijoux assortis, album d'enfance, mots fléchés personnalisés, playlist, week-end entre sœurs.",
    items: [
      ["Des bijoux assortis", "Deux bracelets ou colliers identiques, un pour chacune. Simple et très parlant."],
      ["Un album de vos années d'enfance", "Les photos de famille où vous êtes ensemble, des déguisements aux premières vacances."],
      ["Un coussin ou un plaid brodé", "Un mot que vous seules comprenez, brodé sur un objet doux."],
      { carnet: "Vos private jokes, vos surnoms d'enfance, la chanson que vous chantiez en voiture : en mots fléchés, tous vos souvenirs deviennent un jeu qu'elle sera la seule à pouvoir résoudre." },
      ["Une playlist gravée sur une plaque", "Votre chanson d'adolescence, façon pochette de disque, à accrocher au mur."],
      ["Un week-end entre sœurs", "Deux jours rien que vous deux. Le cadeau idéal quand la vie vous a éloignées."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour sa sœur",
    tips: [
      "Misez sur ce que vous seules partagez. Un cadeau qui fait rire parce qu'il rappelle un souvenir commun vaut plus qu'un bel objet neutre.",
      "Si vous vivez loin l'une de l'autre, un cadeau qui se garde et se feuillette (album, carnet, lettres) entretient le lien au quotidien.",
    ],
    wordsTitle: "Quels mots et souvenirs glisser dans un cadeau pour sa sœur",
    wordsIntro: "Les ingrédients d'un cadeau vraiment complice :",
    words: [
      "Vos surnoms d'enfance",
      "La chanson de vos trajets en voiture",
      "Le prénom de votre premier animal",
      "Une bêtise que vos parents n'ont jamais sue",
      "La ville de vos vacances d'été",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à sa sœur ?", "Un cadeau personnalisé pour sa sœur doit jouer sur votre complicité : des bijoux assortis, un album de vos années d'enfance, un objet brodé d'un mot que vous seules comprenez ou un carnet de mots fléchés rempli de vos private jokes. Les cadeaux qui rappellent un souvenir commun touchent plus que les beaux objets neutres."],
      ["Quel cadeau original pour sa sœur qui habite loin ?", "Pour une sœur éloignée, choisissez un cadeau qui se garde et se reprend : un album, des lettres, des grilles de mots fléchés construites sur vos souvenirs ou un week-end à planifier ensemble. L'idée est de lui offrir un morceau de votre histoire commune."],
    ],
    related: ["cadeau-personnalise-frere", "cadeaux-personnalises-meilleur-ami", "cadeau-personnalise-anniversaire"],
  },
  {
    slug: "cadeau-personnalise-frere",
    occasion: "Pour son frère",
    title: "Idées de cadeaux personnalisés pour son frère",
    intro:
      "Pour un frère, le cadeau personnalisé qui marche mêle humour et souvenirs : un objet gravé d'une blague de famille, un maillot floqué, des mots fléchés pleins de vos histoires d'enfance ou une sortie à deux. De quoi le faire rire et le toucher en même temps.",
    seoTitle: "Cadeau personnalisé pour son frère : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour son frère : maillot floqué, objet gravé, mots fléchés personnalisés, jeu de société sur mesure, sortie entre frères et sœurs.",
    items: [
      ["Un maillot floqué", "Le maillot de son équipe avec un surnom de famille à la place du nom du joueur."],
      ["Un objet gravé avec humour", "Une flasque, un décapsuleur ou une planche à découper avec votre blague de toujours."],
      { carnet: "Votre frère a oublié la moitié de vos bêtises d'enfance ? Les mots fléchés vont les lui rappeler, une définition à la fois, avec vos surnoms et vos souvenirs comme réponses." },
      ["Un jeu de société sur mesure", "Un quiz ou un jeu de cartes avec des questions sur lui et la famille, à sortir aux repas."],
      ["Une photo d'enfance détournée", "Votre pire photo de vacances, encadrée façon œuvre d'art. Effet garanti."],
      ["Une sortie entre frères et sœurs", "Karting, escape game ou concert : un moment ensemble plutôt qu'un objet."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour son frère",
    tips: [
      "L'humour est votre meilleur allié : un frère sera plus touché par une blague bien placée que par un message trop sérieux.",
      "Pensez à ce qu'il utilise vraiment (sport, cuisine, jeux) et ajoutez-y une touche personnelle plutôt que d'acheter un objet décoratif.",
    ],
    wordsTitle: "Quels mots et souvenirs glisser dans un cadeau pour son frère",
    wordsIntro: "Quelques idées de mots qui le feront réagir :",
    words: [
      "Son surnom d'enfance (même celui qu'il déteste)",
      "Votre jeu vidéo ou dessin animé fétiche",
      "Le nom de la rue de la maison familiale",
      "Sa plus grosse bêtise",
      "Son équipe ou son sport",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à son frère ?", "Un cadeau personnalisé pour un frère mêle souvent humour et souvenirs : un maillot floqué d'un surnom de famille, un objet gravé avec votre blague de toujours, un jeu de société sur mesure ou un carnet de mots fléchés rempli de vos histoires d'enfance. Une sortie ensemble est aussi une valeur sûre."],
      ["Quel cadeau drôle et personnalisé pour son frère ?", "Pour faire rire son frère, détournez vos souvenirs : une photo d'enfance gênante encadrée comme une œuvre, un objet gravé de sa pire réplique ou des grilles de mots fléchés dont les définitions racontent ses bêtises. L'humour fonctionne parce qu'il n'y a que vous qui pouvez le faire."],
    ],
    related: ["cadeau-personnalise-soeur", "cadeau-personnalise-homme", "cadeaux-personnalises-meilleur-ami"],
  },
  {
    slug: "cadeau-personnalise-homme",
    occasion: "Pour un homme",
    title: "Idées de cadeaux personnalisés pour un homme",
    intro:
      "Un cadeau personnalisé pour un homme fonctionne quand il est utile ou qu'il le fait sourire : un portefeuille gravé, une planche à découper, un coffret dégustation, des mots fléchés sur ses souvenirs ou une expérience. Des idées pour un mari, un ami ou un proche.",
    seoTitle: "Cadeau personnalisé pour homme : idées originales | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour un homme : portefeuille gravé, planche à découper, mots fléchés personnalisés, coffret dégustation, carte de ses voyages.",
    items: [
      ["Un portefeuille ou porte-cartes gravé", "Un objet qu'il a sur lui tous les jours, marqué de ses initiales ou d'une date."],
      ["Une planche à découper gravée", "Pour l'homme qui cuisine ou qui règne sur le barbecue, avec une phrase bien à lui."],
      ["Une carte de ses voyages", "Une carte à gratter ou une affiche où sont marqués les lieux qu'il a visités."],
      { carnet: "Pour un homme qui aime les jeux de lettres ou les casse-tête, des grilles personnalisées changent du gadget : chaque réponse renvoie à sa vie, ses passions et vos souvenirs communs." },
      ["Un coffret dégustation", "Bières artisanales, whisky, café ou chocolat, avec une étiquette personnalisée."],
      ["Une expérience", "Un cours de cuisine, un baptême de plongée ou une session de pilotage. Un souvenir plutôt qu'un objet."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour un homme",
    tips: [
      "Partez de ce qu'il fait, pas de ce qu'il est censé aimer : son sport, sa cuisine, ses jeux ou ses voyages disent plus que les rayons « cadeaux pour homme ».",
      "La personnalisation doit rester sobre. Une date, des initiales ou une phrase courte suffisent souvent.",
    ],
    wordsTitle: "Quels mots et souvenirs glisser dans un cadeau pour un homme",
    wordsIntro: "Des pistes de mots à graver ou à cacher dans une grille :",
    words: [
      "Ses initiales ou une date clé",
      "Le nom de son équipe ou de son sport",
      "Une ville où vous avez voyagé",
      "Sa recette signature",
      "Un surnom ou une réplique culte",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à un homme ?", "Un bon cadeau personnalisé pour un homme est utile ou le fait sourire : un portefeuille gravé, une planche à découper, une carte de ses voyages, un coffret dégustation ou un carnet de mots fléchés dont les réponses parlent de lui. Partez de ses activités réelles plutôt que des rayons « cadeaux pour homme »."],
      ["Quel cadeau personnalisé pour un homme qui a tout ?", "Pour un homme qui a tout, offrez quelque chose qu'il ne peut pas acheter lui-même : une expérience, un objet gravé d'un souvenir précis ou des grilles de mots fléchés construites autour de sa vie. La valeur vient de l'attention, pas du prix."],
    ],
    related: ["cadeau-personnalise-papa", "cadeaux-personnalises-couple", "cadeau-personnalise-femme"],
  },
  {
    slug: "cadeau-personnalise-femme",
    occasion: "Pour une femme",
    title: "Idées de cadeaux personnalisés pour une femme",
    intro:
      "Un cadeau personnalisé pour une femme touche quand il montre qu'on la connaît : un bijou gravé, une affiche d'un lieu qui compte, un carnet de mots fléchés écrit pour elle, un parfum sur mesure ou une expérience. Des idées pour une compagne, une amie ou une proche.",
    seoTitle: "Cadeau personnalisé pour femme : idées qui touchent | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour une femme : bijou gravé, affiche d'un lieu, mots fléchés personnalisés, atelier parfum, livre de lettres.",
    items: [
      ["Un bijou gravé", "Une date, des coordonnées GPS ou un mot à vous, sur un bijou fin qu'elle portera tous les jours."],
      ["Une affiche d'un lieu qui compte", "Le plan de la ville de votre rencontre ou de son enfance, en version graphique."],
      ["Un atelier parfum", "Elle compose sa propre fragrance, avec un nom qu'elle choisit."],
      { carnet: "Si elle aime les jeux de lettres, offrez-lui des grilles écrites pour elle : ses amis, ses voyages, ses phrases cultes deviennent les réponses." },
      ["Un livre de lettres", "Plusieurs proches lui écrivent un mot, réunis dans un joli recueil."],
      ["Une trousse ou un sac brodé", "Ses initiales ou un mot doux, sur un objet qu'elle utilise vraiment."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour une femme",
    tips: [
      "Le cadeau le plus apprécié est souvent celui qui prouve qu'on a écouté : un lieu dont elle parle, une passion qu'elle a mentionnée, un souvenir précis.",
      "Évitez les objets génériques simplement marqués d'un prénom. Une date ou un mot qui a du sens pour elle fait toute la différence.",
    ],
    wordsTitle: "Quels mots et souvenirs glisser dans un cadeau pour une femme",
    wordsIntro: "Quelques pistes pour personnaliser sans tomber dans le cliché :",
    words: [
      "La ville de votre rencontre ou de son enfance",
      "Le prénom de ses proches",
      "Son livre ou son film préféré",
      "Un voyage qui l'a marquée",
      "Une phrase qu'elle dit souvent",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à une femme ?", "Un cadeau personnalisé pour une femme touche quand il montre qu'on la connaît : un bijou gravé d'une date qui compte, une affiche d'un lieu important, un atelier parfum, un livre de lettres de ses proches ou un carnet de mots fléchés construit autour de sa vie. Le détail personnel compte plus que l'objet."],
      ["Quel cadeau personnalisé original pour une femme ?", "Pour sortir des classiques, pensez aux cadeaux qui font participer : un parfum qu'elle compose, des lettres de ses amis réunies en recueil, ou des grilles de mots fléchés dont chaque réponse est un souvenir. Ce sont des cadeaux qu'on ne trouve pas en magasin."],
    ],
    related: ["cadeau-personnalise-maman", "cadeaux-personnalises-couple", "cadeau-personnalise-homme"],
  },
  {
    slug: "cadeau-personnalise-belle-mere",
    occasion: "Pour sa belle-mère",
    title: "Idées de cadeaux personnalisés pour sa belle-mère",
    intro:
      "Pour une belle-mère, le bon cadeau personnalisé est chaleureux sans être trop intime : un album des petits-enfants, une plante avec un pot gravé, un carnet de recettes à compléter ou des mots fléchés sur la famille. Des idées pour faire plaisir sans se tromper.",
    seoTitle: "Cadeau personnalisé pour belle-mère : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour sa belle-mère : album des petits-enfants, plante en pot gravé, carnet de recettes, mots fléchés personnalisés, panier gourmand.",
    items: [
      ["Un album des petits-enfants", "Rien ne fait plus plaisir à une belle-mère que les photos de ses petits-enfants."],
      ["Une plante dans un pot gravé", "Une jolie plante avec un pot à son nom ou à celui de la maison familiale."],
      { carnet: "Si votre belle-mère aime les mots fléchés, des grilles autour de la famille montrent que vous connaissez son univers : prénoms, maison de famille, recettes et traditions." },
      ["Un carnet de recettes à compléter", "Un beau carnet où elle peut transmettre ses recettes, avec une première page écrite par vous."],
      ["Un panier gourmand de votre région", "Des produits que vous aimez, avec une étiquette personnalisée. Une attention sûre."],
      ["Un cadre photo de famille", "Une photo de toute la famille élargie, prise lors d'un repas ou d'une fête."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour sa belle-mère",
    tips: [
      "Visez un cadeau qui parle de la famille qu'elle partage avec vous : petits-enfants, maison de famille, traditions. C'est la façon la plus sûre de toucher juste.",
      "En cas de doute, demandez à votre conjoint ses passions et ses petites habitudes. Un détail bien choisi vaut mieux qu'un grand geste.",
    ],
    wordsTitle: "Quels mots et souvenirs glisser dans un cadeau pour sa belle-mère",
    wordsIntro: "Des mots à la fois personnels et rassembleurs :",
    words: [
      "Les prénoms de ses enfants et petits-enfants",
      "La maison ou la région de famille",
      "Sa spécialité culinaire",
      "Une tradition familiale (le repas du dimanche, Noël chez elle)",
      "Son jardin ou ses fleurs préférées",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à sa belle-mère ?", "Un cadeau personnalisé pour sa belle-mère doit être chaleureux sans être trop intime : un album des petits-enfants, une plante dans un pot gravé, un carnet de recettes à compléter, un panier gourmand ou un carnet de mots fléchés sur la famille. Les cadeaux qui parlent des petits-enfants et des traditions familiales sont les plus sûrs."],
      ["Comment faire plaisir à sa belle-mère sans se tromper ?", "Demandez à votre conjoint ce qu'elle aime vraiment, puis ajoutez une touche personnelle liée à la famille : une photo, un prénom, une tradition. Un cadeau simple mais attentionné plaît plus qu'un cadeau cher et impersonnel."],
    ],
    related: ["cadeaux-personnalises-parents", "cadeau-personnalise-maman", "idees-cadeaux-noel-personnalises"],
  },
  {
    slug: "cadeau-personnalise-collegue",
    occasion: "Pour un ou une collègue",
    title: "Idées de cadeaux personnalisés pour un collègue",
    intro:
      "Pour un collègue, le cadeau personnalisé réussi rassemble l'équipe : un livre d'or de l'équipe, des mots fléchés pleins de private jokes du bureau, une illustration de l'équipe ou un mug bien trouvé. Idéal pour un départ, un anniversaire ou une naissance.",
    seoTitle: "Cadeau personnalisé pour collègue : idées de pot | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour un collègue : livre d'or d'équipe, mots fléchés du bureau, illustration de l'équipe, mug, cagnotte expérience.",
    items: [
      ["Un livre d'or de l'équipe", "Chacun écrit un mot ou un souvenir. Le classique des pots de départ, toujours apprécié."],
      ["Une illustration de l'équipe", "Un illustrateur dessine toute l'équipe, avec les détails que tout le monde reconnaîtra."],
      { carnet: "Le cadeau collectif par excellence : chaque collègue propose un mot ou une définition (le surnom du chef, la machine à café capricieuse, les réunions du lundi) et tout le monde se retrouve dans les grilles." },
      ["Un mug ou une gourde personnalisés", "Petit budget, mais une phrase culte du bureau le rend drôle et utile."],
      ["Une cagnotte pour une expérience", "Un cours, un restaurant ou un week-end, financé par toute l'équipe."],
      ["Une plante de bureau avec un pot gravé", "Pour un arrivant ou un collègue qui change de poste, un souvenir vivant."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour un collègue",
    tips: [
      "Les meilleurs cadeaux de collègues sont collectifs : faire participer toute l'équipe rend le cadeau plus fort et le budget plus léger.",
      "Gardez l'humour bienveillant. Les private jokes du bureau font mouche tant que tout le monde peut en rire, y compris la personne fêtée.",
    ],
    wordsTitle: "Quels mots et private jokes glisser dans un cadeau pour un collègue",
    wordsIntro: "Les classiques qui font rire toute l'équipe :",
    words: [
      "Le surnom de l'équipe ou du projet",
      "La salle de réunion où tout se passe",
      "Son expression favorite en réunion",
      "Le resto du midi de l'équipe",
      "L'outil ou le logiciel qui plante toujours",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à un collègue ?", "Pour un collègue, privilégiez un cadeau collectif et personnalisé : un livre d'or de l'équipe, une illustration de tout le service, un mug avec une phrase culte du bureau ou un carnet de mots fléchés où chaque collègue a proposé un mot. Ces cadeaux rassemblent l'équipe et restent dans un budget raisonnable."],
      ["Quel cadeau collectif original pour un pot de départ ?", "Pour un pot de départ, un cadeau collectif original fait participer chacun : des mots fléchés dont les définitions sont les private jokes du bureau, un livre d'or illustré ou une cagnotte pour une expérience. L'important est que la personne retrouve toute l'équipe dans son cadeau."],
    ],
    related: ["cadeau-personnalise-depart-retraite", "cadeau-personnalise-anniversaire", "cadeaux-personnalises-meilleur-ami"],
  },
  {
    slug: "cadeau-personnalise-maitresse",
    occasion: "Pour la maîtresse ou le maître",
    title: "Idées de cadeaux personnalisés pour la maîtresse",
    intro:
      "En fin d'année, le cadeau personnalisé qui touche le plus une maîtresse ou un maître vient de la classe : un livre de dessins des élèves, un tote bag signé, des mots fléchés avec les prénoms de la classe ou une plante. Des idées simples à organiser entre parents.",
    seoTitle: "Cadeau personnalisé maîtresse fin d'année : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour la maîtresse ou le maître en fin d'année : livre de dessins, tote bag signé, mots fléchés de la classe, plante, carte collective.",
    items: [
      ["Un livre de dessins de la classe", "Chaque élève dessine un souvenir de l'année, réunis dans un petit livre."],
      ["Un tote bag ou une trousse signés", "Les prénoms ou les empreintes des élèves, sur un objet qu'elle utilisera en classe."],
      { carnet: "De quoi occuper l'été : des grilles dont les réponses sont les prénoms des élèves, les sorties scolaires et les moments forts de l'année. Un cadeau de classe qui se garde." },
      ["Une plante et un pot décoré par les enfants", "Les élèves décorent le pot, la plante grandit après leur départ."],
      ["Une carte géante collective", "Un mot de chaque enfant et de chaque parent sur une grande carte."],
      ["Un bon pour une librairie ou un musée", "Avec un petit mot de la classe, pour qu'elle se fasse plaisir."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour la maîtresse",
    tips: [
      "Les enseignants gardent surtout ce que les enfants ont fait eux-mêmes : dessins, mots, prénoms. Un objet coûteux compte moins qu'un souvenir de la classe.",
      "Organisez-vous tôt entre parents (cagnotte, collecte des dessins) pour que chaque enfant puisse participer avant la fin de l'année.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau pour la maîtresse",
    wordsIntro: "Les souvenirs de l'année qui la feront sourire :",
    words: [
      "Les prénoms de tous les élèves",
      "La sortie scolaire de l'année",
      "Le nom de la classe ou de l'école",
      "Le spectacle ou le projet de fin d'année",
      "La mascotte ou l'animal de la classe",
    ],
    faqs: [
      ["Quel cadeau personnalisé offrir à la maîtresse en fin d'année ?", "Le cadeau de fin d'année qui touche le plus une maîtresse vient des élèves : un livre de leurs dessins, un tote bag signé, une plante dans un pot décoré par la classe ou un carnet de mots fléchés dont les réponses sont les prénoms et souvenirs de l'année. Organiser une petite cagnotte entre parents permet à tout le monde de participer."],
      ["Quel cadeau collectif pour une maîtresse ?", "Un bon cadeau collectif pour une maîtresse fait participer chaque enfant : dessin, mot, prénom. Livre de dessins, carte géante, objet signé ou grilles de mots fléchés construites avec les souvenirs de la classe sont des choix sûrs et durables."],
    ],
    related: ["cadeau-personnalise-collegue", "cadeau-personnalise-anniversaire", "meilleures-idees-cadeaux-personnalises"],
  },
  {
    slug: "cadeau-personnalise-marraine",
    occasion: "Pour sa marraine ou son parrain",
    title: "Idées de cadeaux personnalisés pour une marraine ou un parrain",
    intro:
      "Pour demander à quelqu'un d'être marraine ou parrain, ou pour le remercier, un cadeau personnalisé donne du sens au lien : un bijou gravé, un livre de naissance, une boîte à souvenirs ou des mots fléchés qui cachent la grande question. Des idées pour chaque étape.",
    seoTitle: "Cadeau personnalisé marraine ou parrain : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour une marraine ou un parrain : demande originale en mots fléchés, bijou gravé, boîte à souvenirs, album, cadre photo.",
    items: [
      ["Un bijou gravé", "Les initiales de l'enfant et de la marraine ou du parrain, pour sceller le lien."],
      ["Une boîte à souvenirs", "Une jolie boîte gravée où ranger les dessins, lettres et photos des années à venir."],
      { carnet: "Une demande originale : les grilles se résolvent une à une, et le message caché, mot après mot, pose la question « Veux-tu être ma marraine ? ». Ça marche aussi pour un parrain ou pour dire merci." },
      ["Un cadre photo du baptême", "La plus belle photo du jour, avec la date et le prénom de l'enfant."],
      ["Un album de l'enfant à compléter", "Un album où la marraine ou le parrain collera les souvenirs partagés au fil des années."],
      ["Une lettre de l'enfant pour plus tard", "Une lettre écrite par les parents au nom de l'enfant, à ouvrir à ses 18 ans."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour une marraine ou un parrain",
    tips: [
      "Pour une demande, l'effet de surprise compte autant que l'objet. Un cadeau qui se découvre petit à petit (une énigme, une grille, une boîte) rend le moment mémorable.",
      "Pour un remerciement, misez sur un cadeau qui accompagnera le lien dans le temps : une boîte à souvenirs, un album à compléter.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau pour une marraine ou un parrain",
    wordsIntro: "Les mots qui racontent ce nouveau lien :",
    words: [
      "Le prénom de l'enfant",
      "La date de naissance ou du baptême",
      "Le surnom que l'enfant lui donnera",
      "Un souvenir que vous partagez avec elle ou lui",
      "La question : « Veux-tu être ma marraine ? »",
    ],
    faqs: [
      ["Comment demander à quelqu'un d'être marraine de façon originale ?", "Pour une demande de marraine originale, choisissez un cadeau qui se découvre : une boîte avec une surprise, un body imprimé ou un carnet de mots fléchés dont le message caché, mot après mot, révèle « Veux-tu être ma marraine ? ». L'effet de surprise rend le moment inoubliable, et la même idée fonctionne pour un parrain."],
      ["Quel cadeau personnalisé offrir à une marraine ?", "Pour une marraine, un cadeau personnalisé qui dure est idéal : un bijou gravé aux initiales de l'enfant, une boîte à souvenirs, un cadre photo du baptême ou un album à compléter au fil des ans. Ce sont des objets qui accompagnent le lien avec l'enfant."],
    ],
    related: ["cadeau-personnalise-temoin-mariage", "cadeaux-personnalises-meilleur-ami", "cadeau-personnalise-soeur"],
  },
  {
    slug: "cadeau-personnalise-temoin-mariage",
    occasion: "Pour son témoin de mariage",
    title: "Idées de cadeaux personnalisés pour son témoin de mariage",
    intro:
      "Pour demander à un ami d'être témoin ou le remercier après le mariage, un cadeau personnalisé marque le coup : une boîte de demande, un objet gravé, des mots fléchés qui cachent la question ou un album de vos années d'amitié. Des idées pour témoins femmes et hommes.",
    seoTitle: "Cadeau personnalisé témoin de mariage : idées | Les Flèches",
    seoDescription:
      "Idées de cadeaux personnalisés pour son témoin de mariage : demande originale en mots fléchés, boîte de demande, objet gravé, album d'amitié, expérience.",
    items: [
      ["Une boîte de demande", "Une boîte avec une petite surprise et la question écrite à l'intérieur du couvercle."],
      ["Un objet gravé", "Une flasque, un bijou ou une montre avec la date du mariage."],
      ["Un album de votre amitié", "Les photos de vos années ensemble, des premières soirées à la préparation du mariage."],
      { carnet: "Pour une demande qui se mérite : votre témoin résout les grilles, et les mots cachés finissent par former « Veux-tu être mon témoin ? ». Les définitions racontent votre amitié, de la rencontre aux souvenirs qui vous font encore rire." },
      ["Une tenue ou un accessoire assorti", "Une cravate, un nœud papillon ou un bijou assorti à la décoration du mariage."],
      ["Une expérience à deux après le mariage", "Un dîner ou une journée pour le remercier quand la pression sera retombée."],
    ],
    tipsTitle: "Comment choisir un cadeau personnalisé pour son témoin",
    tips: [
      "Il y a deux moments : la demande, où l'effet de surprise compte le plus, et le remerciement, où le souvenir doit durer. Choisissez le cadeau selon l'étape.",
      "Puisez dans votre histoire d'amitié : un témoin est choisi pour ce que vous avez vécu ensemble, et c'est ce que le cadeau doit raconter.",
    ],
    wordsTitle: "Quels mots glisser dans un cadeau pour son témoin",
    wordsIntro: "Les souvenirs d'amitié qui donnent au cadeau toute sa valeur :",
    words: [
      "Le lieu de votre rencontre",
      "Votre surnom l'un pour l'autre",
      "Un voyage ou une soirée mémorable",
      "La date du mariage",
      "La question : « Veux-tu être mon témoin ? »",
    ],
    faqs: [
      ["Comment demander à quelqu'un d'être son témoin de façon originale ?", "Pour une demande de témoin originale, misez sur un cadeau qui se découvre : une boîte surprise, une bouteille avec une étiquette personnalisée ou un carnet de mots fléchés dont les mots cachés forment « Veux-tu être mon témoin ? ». Les définitions peuvent raconter votre amitié pour rendre la demande encore plus touchante."],
      ["Quel cadeau offrir à son témoin pour le remercier ?", "Pour remercier son témoin après le mariage, choisissez un souvenir durable : un objet gravé de la date, un album de votre amitié ou une expérience à partager. L'essentiel est de reconnaître le rôle qu'il ou elle a joué dans votre journée."],
    ],
    related: ["cadeau-personnalise-mariage", "cadeaux-personnalises-meilleur-ami", "cadeau-personnalise-marraine"],
  },
];
