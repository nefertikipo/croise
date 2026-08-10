/**
 * The set of fonts a maker can pick for their dedication message. Single source
 * of truth shared by the editor picker, the on-screen preview (DedicationPage)
 * and the printed PDF (compose-content-page) so the three never drift.
 *
 * `className` is the on-screen Tailwind class; `pdfFile` is the TTF embedded by
 * the interior PDF engine (all live in public/fonts).
 */
export const DEDICATION_FONTS = [
  {
    key: "serif",
    label: "Fraunces",
    hint: "Serif éditorial, élégant",
    className: "font-serif-accent italic",
    pdfFile: "Fraunces-Italic.ttf",
  },
  {
    key: "instrument",
    label: "Instrument",
    hint: "Serif fin et aéré",
    className: "font-instrument",
    pdfFile: "InstrumentSerif-Regular.ttf",
  },
  {
    key: "hand",
    label: "Manuscrite",
    hint: "Écriture à la main",
    className: "font-handwritten",
    pdfFile: "PatrickHand-Regular.ttf",
  },
  {
    key: "sans",
    label: "Inter",
    hint: "Sobre et neutre",
    className: "font-sans",
    pdfFile: "Inter-Medium.ttf",
  },
] as const;

export type DedicationFontKey = (typeof DEDICATION_FONTS)[number]["key"];

export const DEFAULT_DEDICATION_FONT: DedicationFontKey = "serif";

const BY_KEY = new Map(DEDICATION_FONTS.map((f) => [f.key, f]));

/** Resolve a (possibly null/unknown) stored value to a valid font entry. */
export function resolveDedicationFont(key: string | null | undefined) {
  return (key && BY_KEY.get(key as DedicationFontKey)) || BY_KEY.get(DEFAULT_DEDICATION_FONT)!;
}
