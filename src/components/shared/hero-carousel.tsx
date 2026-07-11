"use client";

import { useEffect, useRef, useState } from "react";
import { ShuffledImage } from "@/components/shared/shuffled-image";
import { cn } from "@/lib/utils";

// Two brand-coloured "filled cells" — a blue and a red — snapped to the grid as
// graphic crossword-square accents. Vermilion because the palette has no red
// token ("brand" is the aperitivo blue). A slide can override this (e.g. a
// top-anchored crop needs the cells higher so they stay in frame).
const ACCENT_BLUE = "var(--brand)";
const ACCENT_RED = "#d83a2f";
const DEFAULT_ACCENTS = [
  { colF: 0.16, rowF: 0.62, color: ACCENT_BLUE },
  { colF: 0.82, rowF: 0.44, color: ACCENT_RED },
];

// The hero cycles the same shuffled-grid effect across a range of Martin
// Parr-style situations — not only lovers — while the headline stays fixed on
// top. Each slide is cover-fitted from the measured box size so landscape
// photos don't letterbox in the tall hero. Photos are placeholders: swap the
// files in /public (kiss stays first as the brand image).
const SLIDES = [
  { src: "/demo-car.png", cols: 14, rows: 13, seed: 11, label: "Les amoureux" },
  { src: "/situations/plage.png", cols: 16, rows: 11, seed: 23, label: "La bande" },
  {
    src: "/situations/famille.jpg",
    cols: 16,
    rows: 13,
    seed: 7,
    label: "La famille",
    focusY: 0.22,
    // Crop is anchored high, so raise the blue cell to keep it in frame.
    accents: [
      { colF: 0.16, rowF: 0.34, color: ACCENT_BLUE },
      { colF: 0.82, rowF: 0.44, color: ACCENT_RED },
    ],
  },
  {
    src: "/situations/copains.jpg",
    cols: 15,
    rows: 12,
    seed: 41,
    label: "Les inséparables",
  },
  {
    src: "/situations/tablee.png",
    cols: 13,
    rows: 13,
    seed: 5,
    label: "Les grandes tablées",
  },
];

const INTERVAL = 7500;

export function HeroCarousel({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((s, i) => {
        const aspect = s.cols / s.rows;
        // Cover-fit: widen the slide past 100% when the box is taller than the
        // photo, so it crops instead of letterboxing. Falls back to full width
        // until the box is measured (the first slide covers at 100% anyway).
        let width = "100%";
        let topPos = "50%";
        let translateY = "-50%";
        if (size && size.h > 0) {
          const coverWidth =
            size.w / size.h >= aspect ? size.w : size.h * aspect;
          width = `${Math.ceil(coverWidth)}px`;
          // Vertical crop anchor: focusY 0 = top of photo, 0.5 = centre, 1 =
          // bottom. Lets a slide (e.g. the kiss) sit higher than dead-centre.
          const imgH = coverWidth / aspect;
          const focusY = s.focusY ?? 0.5;
          topPos = "0px";
          translateY = `-${(focusY * Math.max(0, imgH - size.h)).toFixed(1)}px`;
        }
        const accents = s.accents ?? DEFAULT_ACCENTS;
        return (
          <div
            key={s.src}
            aria-hidden={i !== active}
            className={cn(
              "absolute left-1/2 transition-opacity duration-700",
              i === active ? "opacity-100" : "opacity-0",
            )}
            style={{ width, top: topPos, transform: `translate(-50%, ${translateY})` }}
          >
            <ShuffledImage
              src={s.src}
              cols={s.cols}
              rows={s.rows}
              intensity={0.3}
              seed={s.seed}
              gap={2}
              className="w-full !bg-ink [filter:contrast(1.08)_saturate(1.12)]"
            />
            {accents.map((a, ai) => {
              const col = Math.round(s.cols * a.colF);
              const row = Math.round(s.rows * a.rowF);
              return (
                <div
                  key={ai}
                  aria-hidden
                  className="absolute border-2 border-ink"
                  style={{
                    left: `${(col / s.cols) * 100}%`,
                    top: `${(row / s.rows) * 100}%`,
                    width: `${(1 / s.cols) * 100}%`,
                    height: `${(1 / s.rows) * 100}%`,
                    backgroundColor: a.color,
                  }}
                />
              );
            })}
          </div>
        );
      })}

      {/* Film-grain / print texture — masks the upscaling softness of low-res
          photos and leans into the vintage-print aesthetic. Desaturated SVG
          fractal noise sized so each grain reads at ~1.5px. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='200'%20height='200'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.6'%20numOctaves='3'%20stitchTiles='stitch'/%3E%3CfeColorMatrix%20type='saturate'%20values='0'/%3E%3C/filter%3E%3Crect%20width='200'%20height='200'%20filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "220px 220px",
        }}
      />

      {/* Legibility gradient behind the fixed headline */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/15 to-ink/35" />

      {/* Dots */}
      <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Voir : ${s.label}`}
            aria-current={i === active}
            className={cn(
              "h-2.5 border-2 border-paper transition-all",
              i === active
                ? "w-7 bg-paper"
                : "w-2.5 bg-transparent hover:bg-paper/40",
            )}
          />
        ))}
      </div>
    </div>
  );
}
