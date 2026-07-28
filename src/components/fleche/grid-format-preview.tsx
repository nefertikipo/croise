/**
 * A super small, true-to-scale preview of a grid format. All previews share the
 * same cell size, so petite really looks smaller than classique next to it —
 * you see the size you'll get, not just a name.
 */
interface GridFormatPreviewProps {
  w: number;
  h: number;
  /** px per cell — kept tiny; the whole point is a thumbnail. */
  cell?: number;
}

export function GridFormatPreview({ w, h, cell = 3 }: GridFormatPreviewProps) {
  const width = w * cell;
  const height = h * cell;
  const lines = [];
  for (let x = 1; x < w; x++) {
    lines.push(<line key={`v${x}`} x1={x * cell} y1={0} x2={x * cell} y2={height} />);
  }
  for (let y = 1; y < h; y++) {
    lines.push(<line key={`h${y}`} x1={0} y1={y * cell} x2={width} y2={y * cell} />);
  }
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 text-ink/40"
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth={0.5}>
        {lines}
      </g>
      <rect
        x={0.5}
        y={0.5}
        width={width - 1}
        height={height - 1}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        className="text-ink"
      />
    </svg>
  );
}
