import { BookPageFrame } from "@/components/book/book-page-frame";
import { dedicationSignoffLine, formatAuthorList } from "@/lib/books/authors";
import { resolveDedicationFont } from "@/lib/books/dedication-fonts";

interface DedicationPageProps {
  text: string | null;
  /** Maker's chosen typeface for the message (a DedicationFontKey); null = default. */
  font?: string | null;
  /** Book title, shown on the default opening page when there's no message. */
  title?: string;
  /** Contributor names credited on the default opening page. */
  authors?: string[];
  /** Maker's sign-off line; null/empty falls back to the default. */
  signoff?: string | null;
}

/**
 * The book's opening page (always page 1, so a grid is never the lonely first
 * recto). With a personal message it's the dedication; without one it falls back
 * to a title page — the book title and a warm sign-off from the contributors.
 */
export function DedicationPage({ text, font, title, authors = [], signoff }: DedicationPageProps) {
  const love = dedicationSignoffLine(signoff, authors);

  if (text) {
    // Framed like the printed page (compose-content-page.ts): a title overline,
    // the message, a rule, then a maker sign-off — so it never reads as one
    // lonely line and matches what actually prints.
    const { className } = resolveDedicationFont(font);
    return (
      <BookPageFrame>
        <div className="flex-1 flex flex-col items-center justify-center px-14 py-20 text-center">
          {title && (
            <p className="font-heading text-xs uppercase tracking-[0.25em] text-primary">
              {title}
            </p>
          )}
          <p className={`${className} mt-6 text-2xl leading-relaxed text-foreground whitespace-pre-wrap`}>
            {text}
          </p>
          <div className="mt-8 h-px w-16 bg-primary" />
          {authors.length > 0 && (
            <div className="mt-8">
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
