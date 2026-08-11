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
  /** Names credited on the back cover ("Imaginé avec amour par …"). Free text
   * (e.g. "Louise, Théo et Max"); when non-empty it overrides the contributor
   * names auto-derived from the clue-idea notepad. */
  backCoverNames?: string;
  /** Optional short personal line printed on the back cover, below the credit. */
  backCoverMessage?: string;
}

export type GridDifficulty = "facile" | "moyen" | "difficile" | "balanced";

/**
 * A photo embedded inside a grid: a rectangular block of cells (see
 * `photo-presets.ts`) is reserved for the picture and the grid fills around it.
 * The block only takes effect on the NEXT regeneration; until then the editor
 * overlays it at the preset position as a preview.
 */
export interface GridPhoto {
  /** Preset position id (see PhotoPresetId). */
  preset: string;
  /** Storage ref for the full-res original (see photo-store.ts). */
  photoRef?: string;
  /** Small preview data URL for the editor. NOT for print. */
  imageUrl?: string;
  /** Maker's crop of the original, as fractions (0..1). */
  crop?: { x: number; y: number; w: number; h: number };
}

/** Persisted shape of a grid page's `config`. */
export interface GridPageConfig {
  /** Custom name for this grid; falls back to "Grille N" when unset. */
  title?: string;
  gridColor?: string;
  hiddenWord?: string;
  /** Clue difficulty used when (re)generating this grid. Default "balanced". */
  difficulty?: GridDifficulty;
  /** A photo reserved inside the grid, or absent for a plain grid. */
  photo?: GridPhoto;
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

/**
 * One entry in a book's clue-idea notepad: a brainstormed answer + its clue that
 * the maker can drop into any grid. Stored on `books.clueIdeas` (jsonb array).
 * `id` is a stable client-generated key; `answer` may be empty while jotting.
 * `category` is an optional free-text grouping (a friend group, a situation, or
 * "Général") used to sort the notepad and to suggest a themed grid fill.
 * `author` is who contributed the idea — a group gift is crowdsourced, so this
 * records the friend behind each joke (and could surface as a printed credit).
 */
export interface ClueIdea {
  id: string;
  answer: string;
  clue: string;
  category?: string;
  author?: string;
}

export interface BookWord {
  answer: string;
  clue: string;
  direction: string;
  isCustom: boolean;
  /** Chosen clue's difficulty: 1 = facile, 2 = moyen, 3 = difficile. Null for
   * custom/unscored clues or grids generated before difficulty was persisted. */
  difficulty?: number | null;
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

/** One length-group of the word index: all words of a given length, alphabetical. */
export interface WordIndexEntry {
  length: number;
  words: string[];
}

/** Full book payload from `GET /api/books/[code]`. */
export interface BookData {
  id: string;
  code: string;
  title: string;
  description: string | null;
  dedicationText: string | null;
  /** Maker's chosen dedication typeface (a DedicationFontKey); null = default. */
  dedicationFont: string | null;
  /** Free-text opening-page signature; null/empty falls back to the clue-idea
   * notepad contributors. */
  dedicationSignature: string | null;
  /** Free-text sign-off line above the signature ("Avec tout notre amour,");
   * null/empty falls back to a default keyed on the number of contributors. */
  dedicationSignoff: string | null;
  coverConfig: CoverConfig | null;
  /** Design-time clue-idea notepad (not printed). Empty when never used. */
  clueIdeas: ClueIdea[];
  language: string;
  status: string;
  pages: BookPageData[];
  wordIndex: WordIndexEntry[];
}
