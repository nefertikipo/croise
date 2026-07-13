/**
 * Cover template catalog — templates are DATA (see template-spec.ts). The
 * customer picks one; the print engine composes it. Add a template = add an
 * entry here.
 */

import type { CoverTemplate } from "@/lib/book-pdf/template-spec";

const DEEP_BLUE = "#0f4c81"; // aperitivo azzurro — the main colour
const CREAM = "#ffefe1"; // warm paper

/**
 * Cover colours: the customer picks the PAGE background (`bg`) from the brand
 * palette (deep blue is the main/default). The title (`border`) is auto-set to
 * cream or deep-blue — whichever reads on that background.
 */
export const COVER_COLORS: Record<string, { label: string; bg: string; border: string }> = {
  bleu: { label: "Bleu", bg: DEEP_BLUE, border: CREAM },
  rouge: { label: "Rouge", bg: "#cc3a2f", border: CREAM },
  turquoise: { label: "Turquoise", bg: "#108474", border: CREAM },
  blueprint: { label: "Bleu ciel", bg: "#0c7fb5", border: CREAM },
  or: { label: "Doré", bg: "#bb9a62", border: DEEP_BLUE },
  soleil: { label: "Soleil", bg: "#f1d879", border: DEEP_BLUE },
  rose: { label: "Rose", bg: "#f07898", border: DEEP_BLUE },
  // From the reference covers:
  electrique: { label: "Électrique", bg: "#1f24d6", border: CREAM }, // Fisheye "Selfie" ultramarine
  magenta: { label: "Magenta", bg: "#d81f97", border: CREAM }, // Internal Riot
  poudre: { label: "Rose poudré", bg: "#f0a4c4", border: DEEP_BLUE }, // The Studio
};

export const DEFAULT_COVER_COLOR = "bleu";

/** Resolve a cover-colour key to its {bg, title} pair, defaulting to deep blue. */
export function resolveCoverColor(key?: string): { bg: string; border: string } {
  const c = COVER_COLORS[key ?? ""] ?? COVER_COLORS[DEFAULT_COVER_COLOR];
  return { bg: c.bg, border: c.border };
}

/**
 * Cover title fonts the customer can choose. `cssVar` drives the on-screen
 * preview; `file` (in public/fonts) is embedded by the print engine.
 */
export const COVER_FONTS: Record<string, { label: string; cssVar: string; file: string }> = {
  serif: { label: "Serif", cssVar: "--font-instrument", file: "InstrumentSerif-Regular.ttf" },
  sans: { label: "Sans", cssVar: "--font-abel", file: "Abel-Regular.ttf" },
  display: { label: "Éditorial", cssVar: "--font-anton", file: "Anton-Regular.ttf" },
};

export const DEFAULT_COVER_FONT = "serif";

/** Resolve a font key to its {label, cssVar, file}, defaulting to serif. */
export function resolveCoverFont(key?: string) {
  return COVER_FONTS[key ?? ""] ?? COVER_FONTS[DEFAULT_COVER_FONT];
}

/**
 * Solid-colour cover: the whole page is the chosen colour with small margins, a
 * big gridified photo (no band around it), and the title below in the accent
 * colour (no box). Page colour + accent are a curated pair so the title reads.
 */
const SOLID_COLOR_A5: CoverTemplate = {
  id: "solid-color-a5",
  name: "Fond couleur + grande photo + titre",
  trimWidthMm: 148,
  trimHeightMm: 210,
  bleedMm: 3,
  background: COVER_COLORS[DEFAULT_COVER_COLOR].bg,
  photo: {
    rect: { x: 0.04, y: 0.04, w: 0.92, h: 0.76 },
    shuffle: { cols: 7, rows: 9, intensity: 0.2, seed: 7, gapMm: 1.2 },
  },
  title: {
    rect: { x: 0.04, y: 0.83, w: 0.92, h: 0.11 },
    align: "center",
    color: COVER_COLORS[DEFAULT_COVER_COLOR].border,
    sizeFrac: 0.072,
    uppercase: true,
  },
};

export const COVER_TEMPLATES: CoverTemplate[] = [SOLID_COLOR_A5];

export const DEFAULT_COVER_TEMPLATE = SOLID_COLOR_A5.id;

/** Resolve a template id to its spec, falling back to the default. */
export function getCoverTemplate(id?: string): CoverTemplate {
  return COVER_TEMPLATES.find((t) => t.id === id) ?? SOLID_COLOR_A5;
}

/** Width/height aspect ratio of a template's photo slot (for the crop UI). */
export function coverPhotoAspect(id?: string): number {
  const t = getCoverTemplate(id);
  return (t.photo.rect.w * t.trimWidthMm) / (t.photo.rect.h * t.trimHeightMm);
}
