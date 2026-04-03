import { notFound } from "next/navigation";
import { db } from "@/db";
import { crosswords } from "@/db/schema/crosswords";
import { placedWords } from "@/db/schema/placed-words";
import { eq } from "drizzle-orm";
import { CrosswordView } from "@/components/crossword/crossword-view";

export default async function CrosswordPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const result = await db
    .select()
    .from(crosswords)
    .where(eq(crosswords.code, code))
    .limit(1);

  if (result.length === 0) notFound();

  const crossword = result[0];
  const words = await db
    .select()
    .from(placedWords)
    .where(eq(placedWords.crosswordId, crossword.id));

  const width = crossword.width;
  const height = crossword.height;
  const solution = crossword.gridSolution;

  const grid: string[] = [];
  for (let r = 0; r < height; r++) {
    grid.push(solution.slice(r * width, (r + 1) * width));
  }

  const wordList = words.map((w) => ({
    answer: w.answer,
    clue: w.clueText,
    direction: w.direction as "across" | "down",
    number: w.number,
    startRow: w.startRow,
    startCol: w.startCol,
    length: w.length,
    isCustom: w.isCustom,
  }));

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {crossword.title ?? "Crossword"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Code: {crossword.code}
            </p>
          </div>
        </div>

        <CrosswordView
          grid={grid}
          words={wordList}
          code={crossword.code}
        />
      </div>
    </main>
  );
}
