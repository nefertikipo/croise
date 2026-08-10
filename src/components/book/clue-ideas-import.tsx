"use client";

import { useMemo, useState } from "react";
import { parseClueIdeasCsv } from "@/lib/books/parse-clue-ideas-csv";
import type { ClueIdea } from "@/types/book";

/** Total notepad cap, mirrors `bookClueIdeasSchema.max(200)`. */
const MAX_IDEAS = 200;

const DELIMITER_LABEL: Record<string, string> = {
  ",": "virgule",
  ";": "point-virgule",
  "\t": "tabulation",
};

interface ClueIdeasImportProps {
  /** How many ideas already exist, so we can cap the import at 200 total. */
  existingCount: number;
  /** Called with the freshly-built ideas to append. */
  onImport: (ideas: ClueIdea[]) => void;
  onClose: () => void;
}

/**
 * Import panel for the clue-idea notepad: paste from Excel/Sheets or drop a
 * CSV/TSV file, preview the parsed rows, then append them in one go. Parsing is
 * delegated to `parseClueIdeasCsv` (delimiter auto-detect + RFC-4180 quoting +
 * header detection); this component only handles input, preview and the cap.
 */
export function ClueIdeasImport({ existingCount, onImport, onClose }: ClueIdeasImportProps) {
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  const parsed = useMemo(() => parseClueIdeasCsv(text), [text]);
  const remaining = Math.max(0, MAX_IDEAS - existingCount);
  const willImport = Math.min(parsed.rows.length, remaining);
  const overflow = parsed.rows.length - willImport;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) return;
    if (file.size > 2_000_000) {
      setFileError("Fichier trop volumineux (max 2 Mo).");
      return;
    }
    try {
      setText(await file.text());
    } catch {
      setFileError("Impossible de lire ce fichier.");
    }
  }

  function confirm() {
    const ideas: ClueIdea[] = parsed.rows.slice(0, remaining).map((row) => ({
      id: crypto.randomUUID(),
      answer: row.answer,
      clue: row.clue,
      ...(row.category ? { category: row.category } : {}),
      ...(row.author ? { author: row.author } : {}),
    }));
    onImport(ideas);
    onClose();
  }

  return (
    <div className="space-y-3 border-2 border-ink bg-white p-4 shadow-[3px_3px_0_0] shadow-ink/60">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-heading text-lg uppercase">Importer un fichier</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Collez depuis Excel / Google Sheets, ou choisissez un fichier CSV.
            Colonnes : <strong>Mot</strong>, <strong>Indice</strong>,{" "}
            <strong>Catégorie</strong>, <strong>Auteur</strong> (une ligne par mot ;
            seuls le mot et l&apos;indice comptent).
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-destructive"
          aria-label="Fermer l'import"
        >
          ✕
        </button>
      </div>

      <label className="inline-block cursor-pointer rounded-none border-2 border-ink/40 bg-muted/40 px-3 py-1.5 text-xs font-medium hover:border-ink">
        Choisir un fichier CSV…
        <input
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
          onChange={onFile}
          className="hidden"
        />
      </label>
      {fileError && <p className="text-xs font-medium text-destructive">{fileError}</p>}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"MAMIE\tLa reine des crêpes\tFamille\tThéo\nTHEO\tLe petit dernier\tFamille"}
        className="w-full resize-y rounded-none border-2 border-ink/20 bg-white px-2 py-1 font-mono text-xs"
      />

      {text.trim() && (
        <div className="space-y-2">
          <p className="text-xs font-medium">
            {parsed.rows.length > 0 ? (
              <>
                <span className="text-emerald-700">{willImport}</span> mot
                {willImport > 1 ? "s" : ""} à importer
                {parsed.skipped > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {parsed.skipped} ligne{parsed.skipped > 1 ? "s" : ""} ignorée
                    {parsed.skipped > 1 ? "s" : ""} (sans mot)
                  </span>
                )}
                <span className="text-muted-foreground">
                  {" "}
                  · séparateur : {DELIMITER_LABEL[parsed.delimiter]}
                </span>
              </>
            ) : (
              <span className="text-destructive">
                Aucun mot détecté. Vérifiez que chaque ligne commence par un mot.
              </span>
            )}
          </p>

          {overflow > 0 && (
            <p className="text-xs font-medium text-amber-700">
              Le carnet est limité à {MAX_IDEAS} idées : {overflow} ne ser
              {overflow > 1 ? "ont" : "a"} pas importée{overflow > 1 ? "s" : ""}.
            </p>
          )}

          {parsed.rows.length > 0 && (
            <div className="max-h-48 overflow-auto border-2 border-ink/15">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/60">
                  <tr className="text-left">
                    <th className="px-2 py-1 font-bold uppercase tracking-wide">Mot</th>
                    <th className="px-2 py-1 font-bold uppercase tracking-wide">Indice</th>
                    <th className="px-2 py-1 font-bold uppercase tracking-wide">Catégorie</th>
                    <th className="px-2 py-1 font-bold uppercase tracking-wide">Auteur</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, remaining).map((row, i) => (
                    <tr key={i} className="border-t border-ink/10">
                      <td className="px-2 py-1 font-mono uppercase">{row.answer}</td>
                      <td className="px-2 py-1">{row.clue}</td>
                      <td className="px-2 py-1 text-muted-foreground">{row.category ?? ""}</td>
                      <td className="px-2 py-1 text-muted-foreground">{row.author ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={confirm}
          disabled={willImport === 0}
          className="rounded-none border-2 border-ink bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[2px_2px_0_0] shadow-ink/60 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Ajouter {willImport > 0 ? `${willImport} mot${willImport > 1 ? "s" : ""}` : "les mots"}
        </button>
        <button
          onClick={onClose}
          className="rounded-none border-2 border-ink/40 bg-white px-4 py-2 text-sm font-medium hover:border-ink"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
