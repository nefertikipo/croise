import { generateText, Output } from "ai";
import { gateway } from "@/lib/gateway";
import { z } from "zod";
import type { Vibe, Language, Difficulty } from "@/types";

const VIBE_DESCRIPTIONS: Record<Vibe, string> = {
  classic: "Traditional crossword style with wordplay, puns, and misdirection. Think classic NYT Wednesday.",
  "easy-monday": "Simple, straightforward definitions. No tricks or obscure references. Accessible to beginners.",
  "hard-saturday": "Devious misdirection, multi-layered wordplay, cryptic-style cluing. Expert level.",
  millennial: "References to 2000s-2020s pop culture, internet culture, memes, social media, streaming shows.",
  "pop-culture": "Heavy on movies, TV, music, celebrities, and current events.",
  literary: "References to literature, poetry, philosophy, mythology, and classical arts.",
};

export async function personalizeClues(
  clues: { answer: string; originalClue: string }[],
  options: {
    vibe: Vibe;
    difficulty: Difficulty;
    language: Language;
    theme?: string;
    personalizationNotes?: string;
  }
) {
  const vibeDesc = VIBE_DESCRIPTIONS[options.vibe];

  const systemPrompt = [
    "You are an expert crossword constructor who writes clues in the style of top-tier publications.",
    `Style: ${vibeDesc}`,
    `Difficulty: ${options.difficulty}/5 (1=straightforward, 5=cryptic/devious)`,
    `Language: ${options.language === "fr" ? "French (mots croisés style, definition-based)" : "English (American crossword style)"}`,
    options.theme ? `Theme to weave in: ${options.theme}` : "",
    options.personalizationNotes ? `Personal context: ${options.personalizationNotes}` : "",
    "",
    "Rules:",
    "- Each clue must be concise (one line, under 100 characters)",
    "- The clue must be fair: the answer should be the best/only reasonable answer",
    "- Preserve the answer exactly as given",
    "- Match the requested vibe and difficulty consistently",
  ]
    .filter(Boolean)
    .join("\n");

  const { output } = await generateText({
    model: gateway("anthropic/claude-sonnet-4.6"),
    output: Output.array({
      element: z.object({
        answer: z.string(),
        clue: z.string(),
      }),
    }),
    system: systemPrompt,
    prompt: `Rewrite these crossword clues:\n${JSON.stringify(clues.map((c) => ({ answer: c.answer, currentClue: c.originalClue })))}`,
  });

  return output ?? [];
}
