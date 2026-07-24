import { getPhotoLayout } from "@/lib/book-pdf/photo-layouts";
import { graphicInner, handImageSrc } from "@/lib/book-pdf/graphic-motifs";
import type { PageDesign } from "@/types/book";

interface PhotoPagePreviewProps {
  layoutId?: string;
  /** Fills for the PHOTO slots, in order. */
  photos?: PageDesign[];
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * On-screen WYSIWYG-ish preview of a composed photo page: photos placed in
 * slots (subtly graded), graphic tiles, grain overlay. Mirrors compose-photo-page.
 */
export function PhotoPagePreview({ layoutId, photos }: PhotoPagePreviewProps) {
  const layout = getPhotoLayout(layoutId);
  const mono = layout.id === "hermes";
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
          const handSrc = s.motif === "hand" ? handImageSrc(s.dir) : null;
          if (handSrc) {
            return (
              <div key={i} style={pos} className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={handSrc} alt="" className="h-full w-full object-cover" />
              </div>
            );
          }
          return (
            <svg
              key={i}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={pos}
              dangerouslySetInnerHTML={{ __html: graphicInner(100, 100, s.color ?? "#1f7a4d", s.motif, s.dir) }}
            />
          );
        }
        const img = photos?.[photoIdx++]?.imageUrl;
        return (
          <div key={i} style={pos} className="overflow-hidden">
            {img ? (
              <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${img})`, filter: mono ? "grayscale(1) contrast(1.08)" : "saturate(0.85)" }} />
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
