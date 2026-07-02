import { useId } from "react";
import { getFrame, getMotif } from "@/lib/design/patterns";
import type { PageDesign } from "@/types/book";

interface PageDesignLayerProps {
  design?: PageDesign;
  /** Ink color for motif/frame, defaults to the foreground token. */
  ink?: string;
}

/**
 * Absolute background layer for a book page: uploaded image, tiling SVG motif,
 * and/or frame. Rendered behind the page content inside BookPageFrame.
 */
export function PageDesignLayer({ design, ink = "currentColor" }: PageDesignLayerProps) {
  const uid = useId();
  if (!design || (!design.motif && !design.frame && !design.imageUrl)) return null;

  const motif = getMotif(design.motif);
  const frame = getFrame(design.frame);
  const patternId = `motif-${uid}`;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {design.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={design.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {motif && (
        <svg className="absolute inset-0 h-full w-full" style={{ opacity: motif.opacity }}>
          <defs>
            <pattern
              id={patternId}
              width={motif.tileSize}
              height={motif.tileSize}
              patternUnits="userSpaceOnUse"
            >
              {motif.tile(ink)}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      )}
      {frame && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 141" preserveAspectRatio="none">
          {frame.render(ink)}
        </svg>
      )}
    </div>
  );
}
