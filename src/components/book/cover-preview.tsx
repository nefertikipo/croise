"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { ShuffledImage } from "@/components/shared/shuffled-image";
import { COVER_COLORS, DEFAULT_COVER_COLOR, getCoverTemplate, resolveCoverFont } from "@/lib/book-pdf/cover-templates";

interface CoverPreviewProps {
  coverColor?: string;
  title: string;
  /** Cropped preview data URL (already framed to the slot). */
  imageUrl?: string;
  titleFont?: string;
  titleBold?: boolean;
}

// useLayoutEffect on the client, useEffect during SSR — avoids the hydration
// warning while still sizing the title before paint in the browser.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * On-screen WYSIWYG preview of the print cover: solid colour page, the gridified
 * photo (same ShuffledImage effect as print), and the title in the accent
 * colour. Mirrors the solid-color-a5 template proportions.
 */
export function CoverPreview({ coverColor, title, imageUrl, titleFont, titleBold }: CoverPreviewProps) {
  const c = COVER_COLORS[coverColor ?? ""] ?? COVER_COLORS[DEFAULT_COVER_COLOR];
  const tmpl = getCoverTemplate();
  const fx = tmpl.photo.shuffle;
  const p = tmpl.photo.rect;
  const tr = tmpl.title.rect;
  const font = resolveCoverFont(titleFont);
  const shown = title || "Titre";

  const rootRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  // Auto-fit the title inside its rect band — same intent as the print engine
  // (compose-cover.ts): shrink the font until the (possibly wrapped) title fits
  // the band's width and height, then vertical-centering keeps it inside the
  // page. Without this, a long title overflows the bottom edge and gets clipped
  // by the page's overflow-hidden.
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const band = bandRef.current;
    const span = spanRef.current;
    if (!root || !band || !span) return;

    const fit = () => {
      const H = root.clientHeight;
      if (!H) return;
      // Start from the template's font fraction (of page height), like print.
      let size = H * tmpl.title.sizeFrac;
      const min = Math.max(6, H * 0.028);
      span.style.fontSize = `${size}px`;
      let guard = 0;
      while (
        size > min &&
        guard < 200 &&
        (span.scrollHeight > band.clientHeight + 0.5 ||
          span.scrollWidth > band.clientWidth + 0.5)
      ) {
        size *= 0.96;
        span.style.fontSize = `${size}px`;
        guard++;
      }
    };

    fit();
    // Re-fit once the web font loads (metrics change) and whenever the preview
    // is resized (gallery thumbnail vs. full-size studio, responsive layout).
    let cancelled = false;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) fit();
      });
    }
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [shown, font.cssVar, titleBold, tmpl.title.sizeFrac]);

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden" style={{ backgroundColor: c.bg }}>
      <div
        className="absolute overflow-hidden"
        style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${p.w * 100}%`, height: `${p.h * 100}%` }}
      >
        {imageUrl && fx ? (
          <ShuffledImage
            src={imageUrl}
            cols={fx.cols}
            rows={fx.rows}
            intensity={fx.intensity}
            seed={fx.seed}
            gap={2}
            jitter={false}
            square={false}
            background={c.bg}
            className="h-full w-full"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center border-2 border-dashed text-xs uppercase tracking-widest"
            style={{ borderColor: c.border, color: c.border }}
          >
            Photo
          </div>
        )}
      </div>
      <div
        ref={bandRef}
        className="absolute flex items-center justify-center overflow-hidden text-center [container-type:size]"
        style={{
          left: `${tr.x * 100}%`,
          top: `${tr.y * 100}%`,
          width: `${tr.w * 100}%`,
          height: `${tr.h * 100}%`,
        }}
      >
        <span
          ref={spanRef}
          className="block w-full uppercase [overflow-wrap:break-word]"
          style={{
            color: c.border,
            lineHeight: 1.05,
            // Pre-JS fallback proportioned to the band (cqh = 1% of its height);
            // the fit effect overrides this with an explicit px size.
            fontSize: "62cqh",
            fontFamily: `var(${font.cssVar})`,
            fontWeight: titleBold ? 700 : 400,
          }}
        >
          {shown}
        </span>
      </div>
    </div>
  );
}
