"use client";

import { FlecheGrid } from "@/components/fleche/fleche-grid";
import { resolveDedicationFont } from "@/lib/books/dedication-fonts";
import type { FlecheCell } from "@/types/book";
import type { PostcardData, PostcardDelivery } from "@/types/postcard";

/**
 * On-screen render of a card's two faces (front grid + back message/solution),
 * mirroring the print engine (generate-postcard.ts). A6 is 105×148 mm, so each
 * face is drawn at that aspect ratio; the grid is scaled to fit its face.
 */

const A6_RATIO = 148 / 105; // height / width, portrait

/**
 * FlecheGrid draws fixed 70px cells; scale it to fit within a target box.
 * Fits by both width and (when given) height so a tall grid never overflows its
 * face — mirrors the print engine's `min(contentW/w, availH/h)` sizing.
 */
function ScaledGrid({
  cells,
  width,
  height,
  maxW,
  maxH,
  accentColor,
  plain,
  showSolution,
  sketch,
}: {
  cells: FlecheCell[][];
  width: number;
  height: number;
  maxW: number;
  maxH?: number;
  accentColor?: string;
  plain?: boolean;
  showSolution?: boolean;
  sketch?: boolean;
}) {
  const natW = width * 70;
  const natH = height * 70;
  const scale = Math.min(maxW / natW, maxH ? maxH / natH : Infinity);
  const w = natW * scale;
  const h = natH * scale;
  return (
    <div style={{ width: w, height: h, overflow: "hidden" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: natW }}>
        <FlecheGrid
          cells={cells}
          width={width}
          height={height}
          accentColor={accentColor}
          plain={plain}
          showSolution={showSolution}
          sketch={sketch}
          interactive={false}
        />
      </div>
    </div>
  );
}

export function PostcardFront({ card, faceW = 300 }: { card: PostcardData; faceW?: number }) {
  const heading =
    card.title?.trim() ||
    (card.recipientName?.trim() ? `Pour ${card.recipientName.trim()}` : "Mots fléchés");
  return (
    <div
      className="frame flex flex-col bg-[#fff6ec] p-4"
      style={{ width: faceW, height: faceW * A6_RATIO }}
    >
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-1">
        <span className="truncate font-display text-sm uppercase tracking-wide text-ink">
          {heading}
        </span>
        {card.grid && (
          <span className="ml-2 shrink-0 font-condensed text-[10px] uppercase tracking-wide text-ink/50">
            {card.grid.width}×{card.grid.height}
          </span>
        )}
      </div>
      <div className="flex flex-1 items-center justify-center pt-3">
        {card.grid ? (
          <ScaledGrid
            cells={card.grid.cells}
            width={card.grid.width}
            height={card.grid.height}
            maxW={faceW - 32}
            // Face height minus padding (32), title band (~24) and pt-3 (12) so
            // a tall grid fits vertically instead of spilling past the frame.
            maxH={faceW * A6_RATIO - 68}
            accentColor={card.gridColor ?? undefined}
            sketch
          />
        ) : (
          <p className="font-serif text-sm italic text-ink/40">La grille apparaîtra ici</p>
        )}
      </div>
    </div>
  );
}

export function PostcardBack({
  card,
  faceW = 300,
  delivery = "direct",
}: {
  card: PostcardData;
  faceW?: number;
  delivery?: PostcardDelivery;
}) {
  const font = resolveDedicationFont(card.messageFont);
  return (
    <div
      className="frame flex flex-col bg-[#fff6ec] p-4"
      style={{ width: faceW, height: faceW * A6_RATIO }}
    >
      {delivery === "self" ? (
        // Blank ruled area — the buyer writes their note by hand.
        <div className="flex flex-1 flex-col justify-start gap-[13px] pt-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-px bg-ink/15" />
          ))}
        </div>
      ) : (
        <div className={`flex flex-1 flex-col items-center justify-start gap-2 text-center ${font.className}`}>
          {card.recipientName?.trim() && (
            <p className="text-lg text-ink">{card.recipientName.trim()}</p>
          )}
          {card.message?.trim() ? (
            <p className="whitespace-pre-wrap text-[13px] leading-snug text-ink">{card.message.trim()}</p>
          ) : (
            <p className="text-sm italic text-ink/40">Votre message apparaîtra ici</p>
          )}
        </div>
      )}
      {card.grid && (
        <div className="mt-2 border-t border-ink/20 pt-2">
          <p className="font-condensed text-[10px] font-bold uppercase tracking-wide text-ink/50">
            Solution
          </p>
          <div className="mt-1 flex justify-center">
            <ScaledGrid
              cells={card.grid.cells}
              width={card.grid.width}
              height={card.grid.height}
              maxW={(faceW - 32) * 0.45}
              maxH={faceW * A6_RATIO * 0.3}
              plain
              showSolution
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Both faces side by side. */
export function PostcardPreview({
  card,
  faceW = 300,
  delivery = "direct",
}: {
  card: PostcardData;
  faceW?: number;
  delivery?: PostcardDelivery;
}) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <PostcardFront card={card} faceW={faceW} />
        <span className="font-condensed text-xs uppercase tracking-wide text-ink/50">Recto</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <PostcardBack card={card} faceW={faceW} delivery={delivery} />
        <span className="font-condensed text-xs uppercase tracking-wide text-ink/50">Verso</span>
      </div>
    </div>
  );
}
