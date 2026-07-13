/**
 * Shared types for the book creation flow (photo-book style editor).
 * The book spine is an ordered list of grid + content pages (see `bookPages`
 * schema). Cover, dedication, word index and solutions are derived sections.
 */

/** Decorative treatment of a page: an SVG motif, a frame style, or an uploaded image. */
export interface PageDesign {
  /** Id of a programmatic SVG motif (see src/lib/design/patterns.tsx). */
  motif?: string;
  /** Id of a frame style drawn inside the page edges. */
  frame?: string;
  /** Small preview data URL for the editor. NOT for print — see `photoRef`. */
  imageUrl?: string;
  /** Storage ref for the full-resolution original used by the print engine
   * (see src/lib/book-pdf/photo-store.ts). */
  photoRef?: string;
  /** User's crop of the original, as fractions (0..1) of its width/height. The
   * print engine extracts this region from the full-res original. */
  crop?: { x: number; y: number; w: number; h: number };
}

/** Persisted shape of `books.coverConfig`. */
export interface CoverConfig {
  recipientName?: string;
  subtitle?: string;
  occasion?: string;
  themeColor?: string;
  design?: PageDesign;
  /** Id of the chosen print cover template (see src/lib/book-pdf/cover-templates.ts). */
  coverTemplate?: string;
  /** Chosen page-colour key (see COVER_COLORS in cover-templates.ts). */
  coverColor?: string;
  /** Chosen title font key: "serif" | "sans" | "display" (see COVER_FONTS). */
  titleFont?: string;
  /** Render the title bold (synthetic — the fonts ship a single weight). */
  titleBold?: boolean;
}

export type GridDifficulty = "facile" | "moyen" | "difficile" | "balanced";

/** Persisted shape of a grid page's `config`. */
export interface GridPageConfig {
  gridColor?: string;
  hiddenWord?: string;
  /** Clue difficulty used when (re)generating this grid. Default "balanced". */
  difficulty?: GridDifficulty;
}

export type ContentLayout = "note" | "quote" | "photo";

/** Persisted shape of a content page's `config`. */
export interface ContentPageConfig {
  layout: ContentLayout;
  title?: string;
  body?: string;
  quote?: string;
  backgroundColor?: string;
  design?: PageDesign;
  /** Photo page: chosen layout template id (see photo-layouts.ts). */
  photoLayout?: string;
  /** Photo page: fills for the layout's PHOTO slots, in order. */
  photos?: PageDesign[];
}

export interface ClueInCell {
  text: string;
  direction: "right" | "down";
  answerRow: number;
  answerCol: number;
  answerLength: number;
  answer: string;
  isCustom?: boolean;
}

export interface FlecheCell {
  type: "letter" | "clue" | "empty";
  letter?: string;
  clues?: ClueInCell[];
  /** Right/bottom edge marks a multi-word break → render a dotted rule. */
  breakRight?: boolean;
  breakBottom?: boolean;
}

export interface BookWord {
  answer: string;
  clue: string;
  direction: string;
  isCustom: boolean;
}

/** A grid page as returned by the book API and rendered in the editor. */
export interface GridPage {
  kind: "grid";
  pageId: string;
  gridId: string;
  code: string;
  position: number;
  width: number;
  height: number;
  cells: FlecheCell[][];
  words: BookWord[];
  config: GridPageConfig;
}

/** A content page as returned by the book API and rendered in the editor. */
export interface ContentPage {
  kind: "content";
  pageId: string;
  position: number;
  config: ContentPageConfig;
}

export type BookPageData = GridPage | ContentPage;

/** One grid's contribution to the word index. */
export interface WordIndexEntry {
  grid: number;
  words: string[];
}

/** Full book payload from `GET /api/books/[code]`. */
export interface BookData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  dedicationText: string | null;
  coverConfig: CoverConfig | null;
  language: string;
  status: string;
  pages: BookPageData[];
  wordIndex: WordIndexEntry[];
}
