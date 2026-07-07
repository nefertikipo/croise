import { BookPageFrame } from "@/components/book/book-page-frame";

interface DedicationPageProps {
  text: string | null;
}

/** The dedication / personal message page, set in from the fore-edge. */
export function DedicationPage({ text }: DedicationPageProps) {
  return (
    <BookPageFrame>
      <div className="flex-1 flex flex-col items-center justify-center px-14 py-20 text-center">
        {text ? (
          <p className="font-heading text-2xl italic leading-relaxed text-foreground whitespace-pre-wrap">
            {text}
          </p>
        ) : (
          <p className="text-muted-foreground italic">Aucune dédicace</p>
        )}
        <div className="mt-10 h-px w-16 bg-primary" />
      </div>
    </BookPageFrame>
  );
}
