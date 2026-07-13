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
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: c.bg }}>
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
      <div className="absolute text-center" style={{ left: `${tr.x * 100}%`, top: `${tr.y * 100}%`, width: `${tr.w * 100}%` }}>
        <span
          className="uppercase leading-none"
          style={{
            color: c.border,
            fontSize: "clamp(16px, 5vw, 40px)",
            fontFamily: `var(${font.cssVar})`,
            fontWeight: titleBold ? 700 : 400,
          }}
        >
          {title || "Titre"}
        </span>
      </div>
    </div>
  );
}
