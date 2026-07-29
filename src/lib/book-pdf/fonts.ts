/**
 * Font loading + embedding for the interior PDF engine. Mirrors the on-screen
 * type: Inter for clue text (screen `--font-sans`, switched from the condensed
 * face for legibility at small sizes — see fleche-grid.tsx), Barlow Semi
 * Condensed for grid letters, Anton for the deco headings (screen
 * `--font-heading` falls back to Anton). The dedication message is drawn in the
 * maker's chosen face (see `dedication`, keyed by DedicationFontKey). Raw TTF
 * bytes are cached across requests; the embedded `PDFFont` handles are
 * per-document.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";
import {
  DEDICATION_FONTS,
  type DedicationFontKey,
} from "@/lib/books/dedication-fonts";

const bytesCache = new Map<string, Buffer>();

async function loadFontBytes(file: string): Promise<Buffer> {
  let bytes = bytesCache.get(file);
  if (!bytes) {
    bytes = await readFile(join(process.cwd(), "public/fonts", file));
    bytesCache.set(file, bytes);
  }
  return bytes;
}

async function embedFile(doc: PDFDocument, file: string): Promise<PDFFont> {
  return doc.embedFont(await loadFontBytes(file), { subset: true });
}

/** The set of fonts every interior page draws with. */
export interface BookFonts {
  /** Clue text — Inter Medium (matches the screen clue face, --font-sans). */
  clue: PDFFont;
  /** Grid letters + labels — Barlow Semi Condensed SemiBold. */
  letter: PDFFont;
  /** Bold emphasis (hidden-word letters, index headers). */
  bold: PDFFont;
  /** Deco headings — Anton. */
  heading: PDFFont;
  /** Maker-selectable dedication faces, keyed by DedicationFontKey. */
  dedication: Record<DedicationFontKey, PDFFont>;
}

export async function embedBookFonts(doc: PDFDocument): Promise<BookFonts> {
  doc.registerFontkit(fontkit);
  const [clue, letter, bold, heading] = await Promise.all([
    embedFile(doc, "Inter-Medium.ttf"),
    embedFile(doc, "BarlowSemiCondensed-SemiBold.ttf"),
    embedFile(doc, "BarlowSemiCondensed-Bold.ttf"),
    embedFile(doc, "Anton-Regular.ttf"),
  ]);
  const dedicationEntries = await Promise.all(
    DEDICATION_FONTS.map(async (f) => [f.key, await embedFile(doc, f.pdfFile)] as const),
  );
  const dedication = Object.fromEntries(dedicationEntries) as Record<
    DedicationFontKey,
    PDFFont
  >;
  return { clue, letter, bold, heading, dedication };
}
