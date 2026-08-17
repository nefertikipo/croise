"use client";

import { COVER_COLORS, DEFAULT_COVER_COLOR, resolveCoverFont } from "@/lib/book-pdf/cover-templates";
import { formatAuthorList, parseNameList } from "@/lib/books/authors";

interface BackCoverPreviewProps {
  coverColor?: string;
  title: string;
  titleFont?: string;
  /** Free-text names typed by the maker; overrides `authors` when non-empty. */
  names?: string;
  /** Optional personal line under the credit. */
  message?: string;
  /** Contributor names auto-derived from the clue-idea notepad (the fallback). */
  authors?: string[];
}

/** A small mots-fléchés arrow motif (down-then-right elbow), the brand glyph. */
function ArrowMotif({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path
        d="M4 3 V15 H17 M17 15 L13 11 M17 15 L13 19"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="square"
      />
    </svg>
  );
}

/**
 * On-screen WYSIWYG preview of the printed back cover (mirrors
 * compose-back-cover.ts): the brand arrow motif, the "LES FLÈCHES" imprint, the
 * book title as the hero, an "imaginé avec amour par …" credit, an optional
 * personal line, and a discreet site footer — all in the chosen cover face and
 * colour so it reads as one object with the front.
 */
export function BackCoverPreview({ coverColor, title, titleFont, names, message, authors = [] }: BackCoverPreviewProps) {
  const c = COVER_COLORS[coverColor ?? ""] ?? COVER_COLORS[DEFAULT_COVER_COLOR];
  const font = resolveCoverFont(titleFont);
  const ink = c.border;

  const credited = parseNameList(names);
  const shownNames = credited.length > 0 ? credited : authors;
  const creditText = formatAuthorList(shownNames);
  const messageText = (message ?? "").trim();

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ backgroundColor: c.bg, fontFamily: `var(${font.cssVar})`, color: ink }}
    >
      {/* Keyline frame */}
      <div className="pointer-events-none absolute inset-[4%] border" style={{ borderColor: ink, opacity: 0.4 }} />

      {/* Centred credit block, biased slightly above the middle. */}
      <div className="flex w-[82%] -translate-y-[4%] flex-col items-center text-center">
        <ArrowMotif color={ink} />
        <p className="mt-4 text-[11px] uppercase tracking-[0.35em]" style={{ opacity: 0.82 }}>
          Les Flèches
        </p>
        <div className="mt-3 h-px w-10" style={{ backgroundColor: ink, opacity: 0.5 }} />
        <p
          className={`mt-6 uppercase leading-tight [overflow-wrap:break-word] ${
            shownNames.length >= 8 ? "text-xl" : "text-2xl"
          }`}
        >
          {title || "Titre"}
        </p>
        {creditText && (
          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.25em]" style={{ opacity: 0.55 }}>
              Imaginé avec amour par
            </p>
            <p
              className={`mt-2 leading-relaxed [overflow-wrap:break-word] ${
                creditText.length > 90 ? "text-xs" : "text-sm"
              }`}
              style={{ opacity: 0.82 }}
            >
              {creditText}
            </p>
          </div>
        )}
        {messageText && (
          <p className="mt-6 max-w-[90%] text-sm leading-relaxed [overflow-wrap:break-word]" style={{ opacity: 0.82 }}>
            {messageText}
          </p>
        )}
      </div>

      {/* Discreet footer */}
      <p className="absolute bottom-[5%] text-[9px] tracking-[0.15em]" style={{ opacity: 0.5 }}>
        lesfleches.com
      </p>
    </div>
  );
}
