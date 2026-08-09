import { composeInput } from "@/lib/crossword/normalize";

/**
 * Parse pasted spreadsheet text (CSV / TSV / Excel copy-paste) into clue-idea
 * rows for the book notepad. Kept as a pure, UI-free helper so it can be unit
 * tested and reused by any import surface.
 *
 * What it handles:
 *  - Delimiter auto-detection: tab (Excel copy-paste), semicolon (French Excel
 *    exports), or comma. The winner is whichever appears most on the header/first
 *    row; ties fall back to comma.
 *  - RFC-4180 quoting: `"..."` fields may contain the delimiter, newlines, and
 *    escaped quotes (`""`).
 *  - Header detection: if the first row's cells look like column names
 *    (mot / indice / catégorie / auteur, and English aliases) we map columns by
 *    name; otherwise the row is treated as data in positional order
 *    answer, clue, category, author.
 *
 * Field bounds mirror `clueIdeaSchema` (answer ≤120, clue ≤500, category ≤80,
 * author ≤80) so imported rows always pass validation on save — over-long values
 * are truncated rather than rejected. Rows with a blank answer are skipped.
 */

/** A single parsed row, ready to become a `ClueIdea` (minus the client id). */
export interface ParsedIdeaRow {
  answer: string;
  clue: string;
  category?: string;
  author?: string;
}

export interface ParseClueIdeasResult {
  rows: ParsedIdeaRow[];
  /** Data rows dropped because they had no answer. */
  skipped: number;
  /** The delimiter we parsed with, for the "détecté : point-virgule" hint. */
  delimiter: "," | ";" | "\t";
  /** Whether the first row was consumed as a header. */
  hadHeader: boolean;
}

const MAX = { answer: 120, clue: 500, category: 80, author: 80 } as const;

/** Header aliases → logical column. Compared after lowercasing + accent-folding. */
const HEADER_ALIASES: Record<keyof ParsedIdeaRow, string[]> = {
  answer: ["mot", "reponse", "word", "answer", "solution"],
  clue: ["indice", "definition", "clue", "description"],
  category: ["categorie", "category", "theme", "groupe", "group"],
  author: ["auteur", "author", "de qui", "par", "from", "contributeur"],
};

function foldHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function detectDelimiter(firstLine: string): "," | ";" | "\t" {
  const counts: Array<["," | ";" | "\t", number]> = [
    ["\t", (firstLine.match(/\t/g) || []).length],
    [";", (firstLine.match(/;/g) || []).length],
    [",", (firstLine.match(/,/g) || []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

/**
 * Tokenize the whole text into rows of string cells with the given delimiter,
 * honouring RFC-4180 double-quote quoting (so a quoted field can contain the
 * delimiter or a newline). Handles \n, \r\n and \r line endings.
 */
function tokenize(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      // Consume \r\n as a single break.
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // Trailing field / row (no final newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** True if the row's cells look like column names rather than data. */
function looksLikeHeader(cells: string[]): boolean {
  const folded = cells.map(foldHeader);
  const known = Object.values(HEADER_ALIASES).flat();
  return folded.some((c) => known.includes(c));
}

/** Map logical column → index using a detected header row. */
function columnMap(headerCells: string[]): Partial<Record<keyof ParsedIdeaRow, number>> {
  const folded = headerCells.map(foldHeader);
  const map: Partial<Record<keyof ParsedIdeaRow, number>> = {};
  for (const key of Object.keys(HEADER_ALIASES) as (keyof ParsedIdeaRow)[]) {
    const idx = folded.findIndex((c) => HEADER_ALIASES[key].includes(c));
    if (idx !== -1) map[key] = idx;
  }
  return map;
}

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function parseClueIdeasCsv(text: string): ParseClueIdeasResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { rows: [], skipped: 0, delimiter: ",", hadHeader: false };
  }

  const firstLine = trimmed.split(/\r\n|\n|\r/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const grid = tokenize(trimmed, delimiter).filter((cells) =>
    cells.some((c) => c.trim() !== ""),
  );
  if (grid.length === 0) {
    return { rows: [], skipped: 0, delimiter, hadHeader: false };
  }

  const hadHeader = looksLikeHeader(grid[0]);
  // Positional default when there's no header: answer, clue, category, author.
  const map: Partial<Record<keyof ParsedIdeaRow, number>> = hadHeader
    ? columnMap(grid[0])
    : { answer: 0, clue: 1, category: 2, author: 3 };

  const dataRows = hadHeader ? grid.slice(1) : grid;
  const rows: ParsedIdeaRow[] = [];
  let skipped = 0;

  for (const cells of dataRows) {
    const at = (key: keyof ParsedIdeaRow): string => {
      const idx = map[key];
      return idx !== undefined ? cells[idx] ?? "" : "";
    };

    const answer = clip(composeInput(at("answer")), MAX.answer);
    if (!answer) {
      skipped++;
      continue;
    }
    const clue = clip(at("clue"), MAX.clue);
    const category = clip(at("category"), MAX.category);
    const author = clip(at("author"), MAX.author);

    rows.push({
      answer,
      clue,
      ...(category ? { category } : {}),
      ...(author ? { author } : {}),
    });
  }

  return { rows, skipped, delimiter, hadHeader };
}
