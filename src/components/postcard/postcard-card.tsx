"use client";

import { FlecheGrid } from "@/components/fleche/fleche-grid";
import { resolveDedicationFont } from "@/lib/books/dedication-fonts";
import type { FlecheCell } from "@/types/book";
import type { PostcardData } from "@/types/postcard";

/**
 * On-screen render of a card's two faces (front grid + back message/solution),
 * mirroring the print engine (generate-postcard.ts). A6 is 105×148 mm, so each
 * face is drawn at that aspect ratio; the grid is scaled to fit its face.
 */

const A6_RATIO = 148 / 105; // height / width, portrait

/** FlecheGrid draws fixed 70px cells; scale it to fit a target pixel width. */
function ScaledGrid({
  cells,
  width,
  height,
  targetW,
  accentColor,
  plain,
  showSolution,
}: {
  cells: FlecheCell[][];
  width: number;
  height: number;
  targetW: number;
  accentColor?: string;
  plain?: boolean;
  showSolution?: boolean;
}) {
  const natural = width * 70;
  const scale = targetW / natural;
  return (
    <div style={{ width: targetW, height: height * 70 * scale, overflow: "hidden" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: natural }}>
        <FlecheGrid
          cells={cells}
          width={width}
          height={height}
          accentColor={accentColor}
          plain={plain}
          showSolution={showSolution}
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
            targetW={faceW - 32}
            accentColor={card.gridColor ?? undefined}
          />
        ) : (
          <p className="font-serif text-sm italic text-ink/40">La grille apparaîtra ici</p>
        )}
      </div>
    </div>
  );
}

export function PostcardBack({ card, faceW = 300 }: { card: PostcardData; faceW?: number }) {
  const font = resolveDedicationFont(card.messageFont);
  return (
    <div
      className="frame flex flex-col bg-[#fff6ec] p-4"
      style={{ width: faceW, height: faceW * A6_RATIO }}
    >
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
              targetW={(faceW - 32) * 0.7}
              plain
              showSolution
            />
          </div>
        </div>
      )}
      <p className="mt-2 text-center font-condensed text-[9px] uppercase tracking-wide text-ink/40">
        lesfleches.com · {card.code}
      </p>
    </div>
  );
}

/** Both faces side by side. */
export function PostcardPreview({ card, faceW = 300 }: { card: PostcardData; faceW?: number }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <PostcardFront card={card} faceW={faceW} />
        <span className="font-condensed text-xs uppercase tracking-wide text-ink/50">Recto</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <PostcardBack card={card} faceW={faceW} />
        <span className="font-condensed text-xs uppercase tracking-wide text-ink/50">Verso</span>
      </div>
    </div>
  );
}
