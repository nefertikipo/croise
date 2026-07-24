// Shared difficulty copy + real corpus examples, so every fléchés composer (the
// standalone /fleche generator and the in-book grid creator) teaches difficulty
// identically.

// Example clues at each level — same answer (AVOCAT), increasingly indirect — to
// show the *style* difference, not just a label. These are REAL clues from the
// corpus at difficulty 1 / 2 / 3 (see the `clues` table), not invented ones.
// AVOCAT is chosen because it genuinely spans all three: a direct definition, the
// lawyer/avocado misdirection, then a cultural leap (Thémis = déesse de la justice).
export const CLUE_EXAMPLES = {
  facile: { label: "Facile", clue: "Il plaide", answer: "AVOCAT" },
  moyen: { label: "Moyen", clue: "Base du guacamole", answer: "AVOCAT" },
  difficile: { label: "Difficile", clue: "Champion de Thémis", answer: "AVOCAT" },
} as const;

export type ExampleLevel = keyof typeof CLUE_EXAMPLES;

// What each difficulty entails + the actual clue mix. "balanced" realizes
// ~50/35/15 in generated grids (see pickClue() in fleche-vector-gen.ts).
export const DIFFICULTY_INFO: Record<
  string,
  { help: string; mix: string; show: ExampleLevel[] }
> = {
  facile: {
    help: "Mots courants et définitions directes, parfait pour débuter ou pour offrir aux plus jeunes.",
    mix: "Que des définitions faciles",
    show: ["facile"],
  },
  balanced: {
    help: "Un mélange de mots familiers et de quelques défis : le bon équilibre pour une grille à offrir.",
    mix: "≈ 50 % faciles · 35 % moyennes · 15 % difficiles",
    show: ["facile", "moyen", "difficile"],
  },
  moyen: {
    help: "Vocabulaire plus riche et définitions moins évidentes, pour les amateurs réguliers.",
    mix: "Que des définitions de niveau moyen",
    show: ["moyen"],
  },
  difficile: {
    help: "Mots rares et définitions retorses, réservé aux cruciverbistes aguerris.",
    mix: "Que des définitions difficiles",
    show: ["difficile"],
  },
};
