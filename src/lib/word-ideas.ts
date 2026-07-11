// Word-inspiration prompts to solve the blank-page problem: what to put in a
// personalized grid for a given recipient. These are PROMPTS (the actual words
// are the user's own), grouped by theme. One source of truth for the
// /idees-de-mots pages and the in-flow helper on /fleche. No em dashes.

export type WordIdeaGroup = { theme: string; ideas: string[] };

export type RecipientIdeas = {
  slug: string;
  /** For nav/labels, e.g. "sa grand-mère". */
  label: string;
  /** Page H1. */
  title: string;
  /** Meta + intro. */
  description: string;
  intro: string;
  groups: WordIdeaGroup[];
  /** Short hidden-message ideas (one word per grid, composed across the book). */
  hiddenMessages: string[];
};

export const WORD_IDEAS: RecipientIdeas[] = [
  {
    slug: "grand-mere",
    label: "sa grand-mère",
    title: "Quels mots mettre dans un mot fléché pour sa grand-mère",
    description:
      "À court d'inspiration pour une grille destinée à votre grand-mère ? Voici des idées de mots à glisser dans le livre, par thème.",
    intro:
      "Une grille pour une grand-mère touche d'autant plus qu'elle rassemble la famille et les petits souvenirs du quotidien. Voici des pistes pour trouver vos mots.",
    groups: [
      {
        theme: "La famille",
        ideas: [
          "Le prénom de grand-père",
          "Les prénoms de ses enfants",
          "Les prénoms de ses petits-enfants",
          "Le nom de famille",
          "Un surnom qu'on lui donne (Mamie, Mémé, Nany)",
        ],
      },
      {
        theme: "Ses lieux",
        ideas: [
          "Son village ou sa ville natale",
          "La région où elle a grandi",
          "Le lieu de ses vacances en famille",
          "Le nom de sa maison ou de son jardin",
        ],
      },
      {
        theme: "Son quotidien",
        ideas: [
          "Le plat qu'elle cuisine le mieux",
          "Sa fleur préférée",
          "Son émission ou son feuilleton favori",
          "Un objet qui la caractérise (tricot, mots croisés, radio)",
          "Son animal de compagnie",
        ],
      },
      {
        theme: "Dates et souvenirs",
        ideas: [
          "L'année de son mariage",
          "Son mois de naissance",
          "Une expression qu'elle répète tout le temps",
          "Un souvenir d'enfance qu'elle raconte souvent",
        ],
      },
    ],
    hiddenMessages: ["JE T'AIME MAMIE", "MERCI POUR TOUT", "ON T'ADORE"],
  },
  {
    slug: "couple",
    label: "un couple",
    title: "Quels mots mettre dans un mot fléché pour son copain ou sa copine",
    description:
      "Des idées de mots à cacher dans une grille pour l'être aimé : vos souvenirs, vos surnoms et vos moments à deux.",
    intro:
      "Une grille pour son amoureux ou son amoureuse se remplit de votre histoire commune. Voici des pistes pour la rendre unique.",
    groups: [
      {
        theme: "Vous deux",
        ideas: [
          "Vos surnoms l'un pour l'autre",
          "Le lieu de votre rencontre",
          "La date de votre premier baiser",
          "Le thème de votre premier rendez-vous",
          "Votre chanson",
        ],
      },
      {
        theme: "Vos souvenirs",
        ideas: [
          "Votre premier voyage ensemble",
          "Le nom de votre animal",
          "Votre restaurant préféré",
          "Une private joke entre vous",
          "Le prénom de vos enfants, s'il y en a",
        ],
      },
      {
        theme: "Ses petites manies",
        ideas: [
          "Sa passion ou son sport",
          "Son plat ou son dessert préféré",
          "Un défaut adorable",
          "Un mot qu'il ou elle emploie tout le temps",
        ],
      },
    ],
    hiddenMessages: ["JE T'AIME", "POUR TOUJOURS", "VEUX-TU M'EPOUSER"],
  },
  {
    slug: "meilleur-ami",
    label: "son meilleur ami",
    title: "Quels mots mettre dans un mot fléché pour un meilleur ami",
    description:
      "Des idées de mots pour une grille entre amis : private jokes, souvenirs et petites manies qui n'appartiennent qu'à vous.",
    intro:
      "Une grille pour un meilleur ami ou une meilleure amie brille par ce que vous êtes seuls à comprendre. Voici des pistes.",
    groups: [
      {
        theme: "Votre amitié",
        ideas: [
          "Vos surnoms",
          "Le lieu de votre rencontre",
          "L'année où vous vous êtes connus",
          "Votre bande ou votre groupe",
        ],
      },
      {
        theme: "Vos private jokes",
        ideas: [
          "Une réplique culte entre vous",
          "Un fou rire mémorable",
          "Un voyage ou une soirée légendaire",
          "Un surnom absurde que vous seuls comprenez",
        ],
      },
      {
        theme: "Ses passions",
        ideas: [
          "Son sport ou son loisir",
          "Sa série ou son film préféré",
          "Sa boisson favorite",
          "Un talent ou une obsession qui la caractérise",
        ],
      },
    ],
    hiddenMessages: ["MEILLEURS AMIS", "MERCI L'AMI", "A LA VIE"],
  },
  {
    slug: "parents",
    label: "ses parents",
    title: "Quels mots mettre dans un mot fléché pour ses parents",
    description:
      "Des idées de mots pour remercier ses parents dans une grille : prénoms, souvenirs de famille et petites habitudes.",
    intro:
      "Une grille pour ses parents célèbre toute une famille. Voici des pistes pour trouver les mots qui les toucheront.",
    groups: [
      {
        theme: "La famille",
        ideas: [
          "Les prénoms de la fratrie",
          "Le prénom de vos parents",
          "Les prénoms des petits-enfants",
          "Le nom de famille",
          "Le lieu de la maison de famille",
        ],
      },
      {
        theme: "Souvenirs d'enfance",
        ideas: [
          "Le lieu de vos vacances en famille",
          "Un plat du dimanche",
          "Une expression de votre enfance",
          "La voiture familiale",
          "Un jeu ou un rituel du soir",
        ],
      },
      {
        theme: "Leurs passions",
        ideas: [
          "Le jardin, le bricolage ou la cuisine",
          "Leur destination de rêve",
          "Leur film ou leur musique préférés",
          "Un objet qui les caractérise",
        ],
      },
    ],
    hiddenMessages: ["MERCI PAPA MAMAN", "JE VOUS AIME", "MERCI POUR TOUT"],
  },
];

export function getRecipientIdeas(slug: string): RecipientIdeas | undefined {
  return WORD_IDEAS.find((r) => r.slug === slug);
}
