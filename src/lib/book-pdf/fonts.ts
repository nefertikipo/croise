/**
 * Font loading + embedding for the interior PDF engine. Mirrors the on-screen
 * type: Barlow Semi Condensed for clue text + grid letters (screen
 * `--font-condensed`), Anton for the deco headings (screen `--font-heading`
 * falls back to Anton). Raw TTF bytes are cached across requests; the embedded
 * `PDFFont` handles are per-document.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";

const bytesCache = new Map<string, Buffer>();

async function loadFontBytes(file: string): Promise<Buffer> {
  let bytes = bytesCache.get(file);
  if (!bytes) {
    bytes = await readFile(join(process.cwd(), "public/fonts", file));
    bytesCache.set(file, bytes);
  }
  return bytes;
}

/** The set of fonts every interior page draws with. */
export interface BookFonts {
  /** Clue text — Barlow Semi Condensed Medium (matches the screen clue face). */
  clue: PDFFont;
  /** Grid letters + labels — Barlow Semi Condensed SemiBold. */
  letter: PDFFont;
  /** Bold emphasis (hidden-word letters, index headers). */
  bold: PDFFont;
  /** Deco headings — Anton. */
  heading: PDFFont;
}

export async function embedBookFonts(doc: PDFDocument): Promise<BookFonts> {
  doc.registerFontkit(fontkit);
  const [clueB, letterB, boldB, headingB] = await Promise.all([
    loadFontBytes("BarlowSemiCondensed-Medium.ttf"),
    loadFontBytes("BarlowSemiCondensed-SemiBold.ttf"),
    loadFontBytes("BarlowSemiCondensed-Bold.ttf"),
    loadFontBytes("Anton-Regular.ttf"),
  ]);
  const [clue, letter, bold, heading] = await Promise.all([
    doc.embedFont(clueB, { subset: true }),
    doc.embedFont(letterB, { subset: true }),
    doc.embedFont(boldB, { subset: true }),
    doc.embedFont(headingB, { subset: true }),
  ]);
  return { clue, letter, bold, heading };
}
