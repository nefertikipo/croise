import { getPhotoLayout } from "@/lib/book-pdf/photo-layouts";
import type { PageDesign } from "@/types/book";

interface PhotoPagePreviewProps {
  layoutId?: string;
  /** Fills for the PHOTO slots, in order. */
  photos?: PageDesign[];
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** A crisp horizontal vesica (two circular arcs) in a 0..100 box. */
function vesica(cx: number, cy: number, w: number, h: number): string {
  const r = (h * h + w * w) / (4 * h);
  return `M ${cx - w / 2} ${cy} A ${r} ${r} 0 0 1 ${cx + w / 2} ${cy} A ${r} ${r} 0 0 1 ${cx - w / 2} ${cy} Z`;
}

/**
 * On-screen WYSIWYG-ish preview of a composed photo page: photos placed in
 * slots (subtly graded), graphic tiles, grain overlay. Mirrors compose-photo-page.
 */
export function PhotoPagePreview({ layoutId, photos }: PhotoPagePreviewProps) {
  const layout = getPhotoLayout(layoutId);
  let photoIdx = 0;
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: layout.background ?? "#fff6ec" }}>
      {layout.slots.map((s, i) => {
        const pos = {
          position: "absolute" as const,
          left: `${s.rect.x * 100}%`,
          top: `${s.rect.y * 100}%`,
          width: `${s.rect.w * 100}%`,
          height: `${s.rect.h * 100}%`,
        };
        if (s.kind === "graphic") {
          return (
            <svg key={i} viewBox="0 0 100 100" preserveAspectRatio="none" style={pos}>
              <rect width="100" height="100" fill={s.color ?? "#1f7a4d"} />
              <path d={vesica(50, 29, 86, 34)} fill="#f4ede0" />
              <path d={vesica(50, 71, 86, 34)} fill="#f4ede0" />
            </svg>
          );
        }
        const img = photos?.[photoIdx++]?.imageUrl;
        return (
          <div key={i} style={pos} className="overflow-hidden">
            {img ? (
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${img})`, filter: "saturate(0.85)" }} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black/10 text-[9px] uppercase tracking-widest text-black/30">
                photo
              </div>
            )}
          </div>
        );
      })}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
