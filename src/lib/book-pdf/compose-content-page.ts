/**
 * Compose the text-led interior pages: the dedication page and the note /
 * quote content pages. Mirrors the on-screen DedicationPage and
 * ContentPageView (content-page.tsx): same fonts (Anton headings, Barlow body),
 * same palette, centered layouts. SVG motifs/frames from PageDesignLayer are
 * not reproduced in print yet (decoration layer TODO).
 */

import type { PDFPage } from "pdf-lib";
import type { BookFonts } from "@/lib/book-pdf/fonts";
import { hex2rgb, mixHex, type Geometry } from "@/lib/book-pdf/geometry";
import { nfc, wrapParagraphs, wrapText } from "@/lib/book-pdf/text";
import type { ContentPageConfig } from "@/types/book";

const INK = "#2f2a26";
const PAPER = "#fffcf5"; // --card (cream paper)
const PRIMARY = "#0f4c81";

export interface DedicationPageOptions {
  page: PDFPage;
  g: Geometry;
  fonts: BookFonts;
  text: string;
}

/** The dedication / personal message page: centered, with a short primary rule
 * below — mirrors DedicationPage. */
export function composeDedicationPage({ page, g, fonts, text }: DedicationPageOptions): void {
  page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(PAPER) });

  const body = nfc(text);
  const maxW = g.contentW * 0.82;
  // Shrink until the block fits comfortably (floor 9pt).
  let size = 14;
  let lines = wrapParagraphs(fonts.heading, body, size, maxW);
  while (size > 9 && lines.length * size * 1.5 > g.contentH * 0.7) {
    size -= 0.5;
    lines = wrapParagraphs(fonts.heading, body, size, maxW);
  }
  const lineH = size * 1.5;
  const ruleGap = 24;
  const blockH = lines.length * lineH + ruleGap + 1;
  const cx = g.contentX + g.contentW / 2;
  let yTop = g.contentTop + Math.max(0, (g.contentH - blockH) / 2);

  for (const line of lines) {
    const w = fonts.heading.widthOfTextAtSize(line, size);
    page.drawText(line, { x: cx - w / 2, y: g.pageH - (yTop + size), size, font: fonts.heading, color: hex2rgb(INK) });
    yTop += lineH;
  }
  yTop += ruleGap;
  page.drawLine({
    start: { x: cx - 24, y: g.pageH - yTop },
    end: { x: cx + 24, y: g.pageH - yTop },
    thickness: 1,
    color: hex2rgb(PRIMARY),
  });
}

export interface ContentPageOptions {
  page: PDFPage;
  g: Geometry;
  fonts: BookFonts;
  config: ContentPageConfig;
}

/** A note or quote content page (photo pages go through composePhotoPage). */
export function composeContentPage({ page, g, fonts, config }: ContentPageOptions): void {
  const bgHex = config.backgroundColor ?? PAPER;
  page.drawRectangle({ x: 0, y: 0, width: g.pageW, height: g.pageH, color: hex2rgb(bgHex) });

  if (config.layout === "quote") {
    composeQuote(page, g, fonts, config, bgHex);
    return;
  }
  composeNote(page, g, fonts, config, bgHex);
}

/** Quote page: big “ mark, centered quote in the heading face, attribution. */
function composeQuote(page: PDFPage, g: Geometry, fonts: BookFonts, config: ContentPageConfig, bgHex: string): void {
  const quote = nfc(config.quote ?? "");
  const attribution = config.title ? `— ${nfc(config.title).toUpperCase()}` : null;
  const maxW = g.contentW * 0.85;
  const cx = g.contentX + g.contentW / 2;

  let size = 19;
  let lines = wrapParagraphs(fonts.heading, quote, size, maxW);
  while (size > 12 && lines.length * size * 1.25 > g.contentH * 0.6) {
    size -= 0.5;
    lines = wrapParagraphs(fonts.heading, quote, size, maxW);
  }
  const lineH = size * 1.25;
  const markSize = 42;
  const attrGap = 22;
  const attrSize = 9;
  const blockH = markSize * 0.9 + lines.length * lineH + (attribution ? attrGap + attrSize : 0);
  let yTop = g.contentTop + Math.max(0, (g.contentH - blockH) / 2);

  // Opening quotation mark in the brand blue.
  const mark = "“";
  const markW = fonts.heading.widthOfTextAtSize(mark, markSize);
  page.drawText(mark, { x: cx - markW / 2, y: g.pageH - (yTop + markSize * 0.9), size: markSize, font: fonts.heading, color: hex2rgb(PRIMARY) });
  yTop += markSize * 0.9;

  for (const line of lines) {
    const w = fonts.heading.widthOfTextAtSize(line, size);
    page.drawText(line, { x: cx - w / 2, y: g.pageH - (yTop + size), size, font: fonts.heading, color: hex2rgb(INK) });
    yTop += lineH;
  }

  if (attribution) {
    yTop += attrGap;
    const w = fonts.letter.widthOfTextAtSize(attribution, attrSize);
    page.drawText(attribution, { x: cx - w / 2, y: g.pageH - (yTop + attrSize), size: attrSize, font: fonts.letter, color: mixHex(INK, bgHex, 0.45) });
  }
}

/** Note page: heading, thin rule, body copy — mirrors the "note" layout. */
function composeNote(page: PDFPage, g: Geometry, fonts: BookFonts, config: ContentPageConfig, bgHex: string): void {
  let yTop = g.contentTop + 8;

  if (config.title) {
    const titleSize = 22;
    const titleLines = wrapText(fonts.heading, nfc(config.title).toUpperCase(), titleSize, g.contentW);
    for (const line of titleLines) {
      page.drawText(line, { x: g.contentX, y: g.pageH - (yTop + titleSize), size: titleSize, font: fonts.heading, color: hex2rgb(INK) });
      yTop += titleSize * 1.15;
    }
    yTop += 12;
  }

  // Thin rule (screen: bg-black/20).
  page.drawLine({
    start: { x: g.contentX, y: g.pageH - yTop },
    end: { x: g.contentX + g.contentW, y: g.pageH - yTop },
    thickness: 0.6,
    color: mixHex(bgHex, "#000000", 0.2),
  });
  yTop += 14;

  if (config.body) {
    const body = nfc(config.body);
    let size = 11;
    let lines = wrapParagraphs(fonts.clue, body, size, g.contentW);
    const availH = g.contentTop + g.contentH - yTop;
    while (size > 8 && lines.length * size * 1.5 > availH) {
      size -= 0.5;
      lines = wrapParagraphs(fonts.clue, body, size, g.contentW);
    }
    const lineH = size * 1.5;
    for (const line of lines) {
      if (yTop + size > g.contentTop + g.contentH) break; // clip overflow
      page.drawText(line, { x: g.contentX, y: g.pageH - (yTop + size), size, font: fonts.clue, color: hex2rgb(INK) });
      yTop += lineH;
    }
  }
}
