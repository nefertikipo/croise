import { BookPageFrame } from "@/components/book/book-page-frame";
import { CoverPreview } from "@/components/book/cover-preview";
import type { CoverConfig } from "@/types/book";

interface CoverPageProps {
  title: string;
  cover: CoverConfig | null;
}

/** The front cover of the book: deep-blue page, gridified photo, accent title.
 * Same design as the print engine — shared via CoverPreview. */
export function CoverPage({ title, cover }: CoverPageProps) {
  return (
    <BookPageFrame>
      <CoverPreview
        coverColor={cover?.coverColor}
        title={title}
        imageUrl={cover?.design?.imageUrl}
        titleFont={cover?.titleFont}
        titleBold={cover?.titleBold}
      />
    </BookPageFrame>
  );
}
