import { BookPageFrame } from "@/components/book/book-page-frame";
import { formatAuthorList } from "@/lib/books/authors";
import { resolveDedicationFont } from "@/lib/books/dedication-fonts";

interface DedicationPageProps {
  text: string | null;
  /** Maker's chosen typeface for the message (a DedicationFontKey); null = default. */
  font?: string | null;
  /** Book title, shown on the default opening page when there's no message. */
  title?: string;
  /** Contributor names credited on the default opening page. */
  authors?: string[];
}

/**
 * The book's opening page (always page 1, so a grid is never the lonely first
 * recto). With a personal message it's the dedication; without one it falls back
 * to a title page — the book title and a warm sign-off from the contributors.
 */
export function DedicationPage({ text, font, title, authors = [] }: DedicationPageProps) {
  if (text) {
    const { className } = resolveDedicationFont(font);
    return (
      <BookPageFrame>
        <div className="flex-1 flex flex-col items-center justify-center px-14 py-20 text-center">
          <p className={`${className} text-2xl leading-relaxed text-foreground whitespace-pre-wrap`}>
            {text}
          </p>
          <div className="mt-10 h-px w-16 bg-primary" />
        </div>
      </BookPageFrame>
    );
  }

  const love = authors.length > 1 ? "Avec tout notre amour," : "Avec tout mon amour,";
  return (
    <BookPageFrame>
      <div className="flex-1 flex flex-col items-center justify-center px-14 py-20 text-center">
        <h1 className="font-heading text-4xl uppercase leading-tight text-foreground">
          {title}
        </h1>
        <div className="mt-8 h-px w-16 bg-primary" />
        {authors.length > 0 && (
          <div className="mt-10">
            <p className="font-serif-accent text-lg italic text-foreground">{love}</p>
            <p className="mt-1 font-serif-accent text-lg text-foreground">
              {formatAuthorList(authors)}
            </p>
          </div>
        )}
      </div>
    </BookPageFrame>
  );
}
