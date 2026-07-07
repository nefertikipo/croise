/**
 * Programmatic vintage-editorial page designs: tiling SVG motifs and frame
 * styles, drawn in a given ink color so they adapt to each page's palette.
 * Used by the page design layer (screen + print) and the design picker.
 */

export interface MotifDef {
  id: string;
  label: string;
  /** Renders one tile of the repeating pattern. */
  tile: (ink: string) => React.ReactNode;
  tileSize: number;
  /** Pattern layer opacity, so text stays readable on top. */
  opacity: number;
}

export const MOTIFS: MotifDef[] = [
  {
    id: "damier",
    label: "Damier",
    tileSize: 40,
    opacity: 0.14,
    tile: (ink) => (
      <>
        <rect x="0" y="0" width="20" height="20" fill={ink} />
        <rect x="20" y="20" width="20" height="20" fill={ink} />
      </>
    ),
  },
  {
    id: "grille",
    label: "Grille",
    tileSize: 36,
    opacity: 0.18,
    tile: (ink) => (
      <path d="M 36 0 L 0 0 0 36" fill="none" stroke={ink} strokeWidth="1.5" />
    ),
  },
  {
    id: "pois",
    label: "Pois",
    tileSize: 32,
    opacity: 0.2,
    tile: (ink) => (
      <>
        <circle cx="8" cy="8" r="3.5" fill={ink} />
        <circle cx="24" cy="24" r="3.5" fill={ink} />
      </>
    ),
  },
  {
    id: "rayures",
    label: "Rayures",
    tileSize: 28,
    opacity: 0.13,
    tile: (ink) => (
      <path d="M -7 7 L 7 -7 M 0 28 L 28 0 M 21 35 L 35 21" stroke={ink} strokeWidth="5" />
    ),
  },
  {
    id: "croisillons",
    label: "Croisillons",
    tileSize: 34,
    opacity: 0.16,
    tile: (ink) => (
      <path
        d="M 5 12 L 12 5 M 12 12 L 5 5 M 22 29 L 29 22 M 29 29 L 22 22"
        stroke={ink}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    ),
  },
  {
    id: "ondes",
    label: "Ondes",
    tileSize: 40,
    opacity: 0.16,
    tile: (ink) => (
      <>
        <path d="M 0 10 Q 10 0 20 10 T 40 10" fill="none" stroke={ink} strokeWidth="2" />
        <path d="M 0 30 Q 10 20 20 30 T 40 30" fill="none" stroke={ink} strokeWidth="2" />
      </>
    ),
  },
];

export interface FrameDef {
  id: string;
  label: string;
  /** Renders the frame; the SVG viewBox is 0 0 100 141 (page proportions). */
  render: (ink: string) => React.ReactNode;
}

export const FRAMES: FrameDef[] = [
  {
    id: "filet",
    label: "Filet",
    render: (ink) => (
      <rect x="4" y="3" width="92" height="135" fill="none" stroke={ink} strokeWidth="0.6" />
    ),
  },
  {
    id: "double",
    label: "Double",
    render: (ink) => (
      <>
        <rect x="3.4" y="2.4" width="93.2" height="136.2" fill="none" stroke={ink} strokeWidth="1.1" />
        <rect x="5.8" y="4.1" width="88.4" height="132.8" fill="none" stroke={ink} strokeWidth="0.4" />
      </>
    ),
  },
  {
    id: "coins",
    label: "Coins",
    render: (ink) => (
      <g stroke={ink} strokeWidth="1" fill="none">
        <path d="M 4 12 L 4 4 L 12 4" />
        <path d="M 88 4 L 96 4 L 96 12" />
        <path d="M 96 129 L 96 137 L 88 137" />
        <path d="M 12 137 L 4 137 L 4 129" />
      </g>
    ),
  },
];

export function getMotif(id: string | undefined): MotifDef | undefined {
  return MOTIFS.find((m) => m.id === id);
}

export function getFrame(id: string | undefined): FrameDef | undefined {
  return FRAMES.find((f) => f.id === id);
}
