import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          Croise
        </h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Create personalized crossword puzzles. Add your own words, pick a
          vibe, and export print-ready PDFs.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/create"
            className={cn(buttonVariants({ size: "lg" }), "text-lg px-8")}
          >
            Create a crossword
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-8 text-left max-w-lg mx-auto">
          <div>
            <div className="font-bold text-2xl">5x5 to 15x15</div>
            <div className="text-sm text-muted-foreground">
              Quick puzzles to full NYT-size grids
            </div>
          </div>
          <div>
            <div className="font-bold text-2xl">Your words</div>
            <div className="text-sm text-muted-foreground">
              Weave in names, inside jokes, memories
            </div>
          </div>
          <div>
            <div className="font-bold text-2xl">Print-ready</div>
            <div className="text-sm text-muted-foreground">
              Export clean PDFs for gifting
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
