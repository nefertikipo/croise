"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageRail, type RailItem } from "@/components/book/page-rail";
import { CoverStudio } from "@/components/book/cover-studio";
import { DedicationEditor } from "@/components/book/dedication-editor";
import { GridPageProperties } from "@/components/book/grid-page-properties";
import { ContentPageEditor } from "@/components/book/content-page-editor";
import { SpreadCanvas } from "@/components/book/spread-canvas";
import { GalleryCanvas } from "@/components/book/gallery-canvas";
import { PageCanvas } from "@/components/book/page-canvas";
import {
  AddPage,
  type AttachGridConflict,
  type AttachGridResult,
} from "@/components/book/add-page";
import { cn } from "@/lib/utils";
import { BookPrintLayout } from "@/components/book/book-print-layout";
import { buildWordIndex } from "@/lib/crossword/word-index";
import type {
  BookData,
  ContentLayout,
  ContentPageConfig,
  CoverConfig,
  GridDifficulty,
  GridPage,
  GridPageConfig,
} from "@/types/book";

interface BookEditorProps {
  code: string;
  initialBook: BookData;
}

export function BookEditor({ code, initialBook }: BookEditorProps) {
  const [book, setBook] = useState<BookData>(initialBook);
  const [selectedId, setSelectedId] = useState<string>("cover");
  // "gallery" = zoom-out overview of every page; "spread" = facing pages for
  // arranging; "page" = one page big, for editing grids.
  const [view, setView] = useState<"gallery" | "spread" | "page">("gallery");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  // Live per-grid progress for a batch add ("Grille 2 sur 5"). Null when idle.
  const [genBatch, setGenBatch] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function debounce(key: string, fn: () => void, ms = 600) {
    setSaving(true);
    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing);
    timers.current.set(
      key,
      setTimeout(async () => {
        await fn();
        setSaving(false);
      }, ms),
    );
  }

  // --- Book-level saves -----------------------------------------------------
  async function patchBook(body: Record<string, unknown>) {
    await fetch(`/api/books/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function updateTitle(title: string) {
    setBook((b) => ({ ...b, title }));
    debounce("book-title", () => patchBook({ title }));
  }

  function updateCover(patch: Partial<CoverConfig>) {
    const cover = { ...(book.coverConfig ?? {}), ...patch };
    setBook((b) => ({ ...b, coverConfig: cover }));
    debounce("book-cover", () => patchBook({ coverConfig: cover }));
  }

  async function previewCover() {
    if (!book.coverConfig?.design?.photoRef) {
      alert("Ajoutez d'abord une photo de couverture.");
      return;
    }
    // Persist the current cover config so the generated PDF reflects it.
    await patchBook({ coverConfig: book.coverConfig });
    window.open(`/api/books/${code}/cover.pdf`, "_blank");
  }

  /** Open the print-ready interior (grids → index → solutions) at A5 or A4. */
  function downloadBook(size: "a5" | "a4" = "a5") {
    window.open(`/api/books/${code}/book.pdf?size=${size}`, "_blank");
  }

  function updateDedication(text: string) {
    setBook((b) => ({ ...b, dedicationText: text }));
    debounce("book-dedication", () => patchBook({ dedicationText: text }));
  }

  // --- Page-level saves -----------------------------------------------------
  function updatePageConfig(pageId: string, patch: Record<string, unknown>) {
    setBook((b) => ({
      ...b,
      pages: b.pages.map((p) =>
        p.pageId === pageId
          ? ({ ...p, config: { ...p.config, ...patch } } as typeof p)
          : p,
      ),
    }));
    const merged = {
      ...(book.pages.find((p) => p.pageId === pageId)?.config ?? {}),
      ...patch,
    };
    debounce(`page-${pageId}`, () =>
      fetch(`/api/books/${code}/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: merged }),
      }).then(() => undefined),
    );
  }

  // --- Structural mutations -------------------------------------------------
  async function addGrids(opts: {
    width: number;
    height: number;
    count: number;
    difficulty: GridDifficulty;
  }) {
    setBusy(true);
    setGenBatch({ current: 1, total: opts.count });
    let selectedFirst = false;
    try {
      // Generate one grid per request so each returns quickly (well under the
      // serverless timeout), grids appear in the book as they land, and the
      // progress bar can report "Grille X sur N". The endpoint recomputes the
      // book's used-word/clue exclusions per call, so sequential requests stay
      // free of repeats exactly like a server-side batch would.
      for (let i = 0; i < opts.count; i++) {
        setGenBatch({ current: i + 1, total: opts.count });
        const res = await fetch(`/api/books/${code}/grids`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...opts, count: 1 }),
        });
        if (!res.ok) {
          // Nothing generated yet — surface the failure. Otherwise keep the
          // partial batch and stop quietly.
          if (!selectedFirst) throw new Error("Generation failed");
          break;
        }
        const { pages } = (await res.json()) as { pages: BookData["pages"] };
        if (pages.length === 0) break;
        setBook((b) => ({ ...b, pages: [...b.pages, ...pages] }));
        if (!selectedFirst && pages[0]) {
          setSelectedId(pages[0].pageId);
          selectedFirst = true;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
      setGenBatch(null);
    }
  }

  async function addContent(layout: ContentLayout) {
    setBusy(true);
    try {
      const res = await fetch(`/api/books/${code}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout === "photo" ? { layout, photoLayout: "hero" } : { layout }),
      });
      if (!res.ok) throw new Error("Failed");
      const page = (await res.json()) as BookData["pages"][number];
      setBook((b) => ({ ...b, pages: [...b.pages, page] }));
      setSelectedId(page.pageId);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function deletePage(pageId: string) {
    setBook((b) => ({ ...b, pages: b.pages.filter((p) => p.pageId !== pageId) }));
    setSelectedId("cover");
    await fetch(`/api/books/${code}/pages/${pageId}`, { method: "DELETE" });
  }

  async function regenerateGrid(
    page: GridPage,
    customClues: { answer: string; clue: string }[],
  ) {
    setRegeneratingId(page.pageId);
    try {
      const res = await fetch(`/api/books/${code}/pages/${page.pageId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          width: page.width,
          height: page.height,
          customClues,
          hiddenWord: page.config.hiddenWord,
          gridColor: page.config.gridColor,
          difficulty: page.config.difficulty,
        }),
      });
      if (!res.ok) throw new Error("Regen failed");
      const updated = (await res.json()) as GridPage;
      setBook((b) => ({
        ...b,
        pages: b.pages.map((p) => (p.pageId === page.pageId ? updated : p)),
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setRegeneratingId(null);
    }
  }

  function persistOrder(pages: BookData["pages"]) {
    setBook((b) => ({ ...b, pages }));
    fetch(`/api/books/${code}/pages/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageIds: pages.map((p) => p.pageId) }),
    });
  }

  async function attachGrid(
    crosswordCode: string,
    opts?: { regenerateToFit?: boolean; force?: boolean },
  ): Promise<AttachGridResult | null> {
    setBusy(true);
    try {
      const res = await fetch(`/api/books/${code}/pages/attach-grid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crosswordCode, ...opts }),
      });
      if (!res.ok) throw new Error("Attach failed");
      const data = (await res.json()) as
        | GridPage
        | { conflict: AttachGridConflict };
      if ("conflict" in data) return { conflict: data.conflict };
      setBook((b) => ({ ...b, pages: [...b.pages, data] }));
      setSelectedId(data.pageId);
      return { page: data };
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setBusy(false);
    }
  }

  /**
   * Drag-and-drop reorder: drop the dragged page before `beforeId`, or at the
   * end when `beforeId` is null.
   */
  function reorderPages(dragId: string, beforeId: string | null) {
    const moved = book.pages.find((p) => p.pageId === dragId);
    if (!moved) return;
    const pages = book.pages.filter((p) => p.pageId !== dragId);
    if (beforeId === null) {
      pages.push(moved);
    } else {
      const i = pages.findIndex((p) => p.pageId === beforeId);
      if (i < 0) return;
      pages.splice(i, 0, moved);
    }
    // Skip the write when nothing actually changed.
    if (pages.every((p, idx) => p.pageId === book.pages[idx]?.pageId)) return;
    persistOrder(pages);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/book/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // --- Derived --------------------------------------------------------------
  const gridPages = book.pages.filter((p): p is GridPage => p.kind === "grid");
  const gridNumberByPage = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const p of book.pages) if (p.kind === "grid") map.set(p.pageId, ++n);
    return map;
  }, [book.pages]);
  const wordIndex = useMemo(() => buildWordIndex(gridPages), [gridPages]);

  const railItems: RailItem[] = [
    { id: "cover", kind: "cover", label: "Couverture" },
    { id: "dedication", kind: "dedication", label: "Dédicace" },
    ...book.pages.map((p): RailItem =>
      p.kind === "grid"
        ? {
            id: p.pageId,
            kind: "grid",
            label: p.config.title || `Grille ${gridNumberByPage.get(p.pageId)}`,
          }
        : {
            id: p.pageId,
            kind: "content",
            label: p.config.title || (p.config.layout === "quote" ? "Citation" : "Note"),
          },
    ),
    { id: "index", kind: "index", label: "Index des mots" },
    { id: "solutions", kind: "solutions", label: "Solutions" },
    { id: "add", kind: "add", label: "+ Ajouter une page" },
  ];

  const selectedPage = book.pages.find((p) => p.pageId === selectedId);

  // The properties panel only shows when editing a single non-cover page. The
  // gallery/spread overviews and the full-width cover studio take the whole width.
  const showProps =
    selectedId === "add"
      ? true
      : view === "gallery"
        ? false
        : selectedId === "cover"
          ? false
          : true;

  return (
    <div className="flex-1">
      {/* Top bar */}
      <div className="border-b-2 border-black bg-card print:hidden">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-3 flex-wrap">
          <h1 className="font-heading text-2xl uppercase">{book.title}</h1>
          <span className="text-xs font-mono text-muted-foreground">{code}</span>
          <span className="text-xs text-muted-foreground">
            {saving ? "Enregistrement…" : "Enregistré"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={previewCover}>
              Couverture
            </Button>
            <Button variant="outline" onClick={() => window.open(`/api/books/${code}/back-cover.pdf`, "_blank")}>
              Dos
            </Button>
            <Button variant="outline" onClick={() => downloadBook("a5")}>
              Livre (PDF)
            </Button>
            <Button variant="outline" onClick={copyLink}>
              {copied ? "Lien copié !" : "Partager"}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor body */}
      <div
        className={`max-w-7xl mx-auto grid grid-cols-1 gap-6 px-4 py-6 print:hidden ${
          showProps ? "lg:grid-cols-[220px_1fr_320px]" : "lg:grid-cols-[220px_1fr]"
        }`}
      >
        {/* Rail */}
        <aside className="lg:max-h-[80vh] lg:overflow-auto">
          <PageRail
            items={railItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>

        {/* Canvas: gallery (overview) · spread (arrange) · page (edit one page) */}
        <section className="min-w-0">
          {selectedId === "add" ? (
            <div className="text-muted-foreground italic pt-20 text-center">
              Choisissez une page à ajouter →
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-center">
                <div className="inline-flex border-2 border-ink" role="tablist">
                  {(
                    [
                      { key: "gallery", label: "Vue d'ensemble" },
                      { key: "spread", label: "Planche" },
                      { key: "page", label: "Page" },
                    ] as const
                  ).map((v) => (
                    <button
                      key={v.key}
                      role="tab"
                      aria-selected={view === v.key}
                      onClick={() => setView(v.key)}
                      className={cn(
                        "px-4 py-1 font-display text-xs uppercase tracking-[0.2em] transition-colors",
                        view === v.key
                          ? "bg-ink text-paper"
                          : "bg-background text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              {view === "gallery" ? (
                <GalleryCanvas
                  book={book}
                  gridPages={gridPages}
                  gridNumberByPage={gridNumberByPage}
                  wordIndex={wordIndex}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onReorder={reorderPages}
                  onFocus={(id) => {
                    setSelectedId(id);
                    setView("page");
                  }}
                />
              ) : view === "spread" ? (
                <SpreadCanvas
                  book={book}
                  gridPages={gridPages}
                  gridNumberByPage={gridNumberByPage}
                  wordIndex={wordIndex}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onFocus={(id) => {
                    setSelectedId(id);
                    setView("page");
                  }}
                />
              ) : selectedId === "cover" ? (
                <CoverStudio
                  title={book.title}
                  cover={book.coverConfig ?? {}}
                  onTitleChange={updateTitle}
                  onCoverChange={updateCover}
                />
              ) : (
                <PageCanvas
                  book={book}
                  gridPages={gridPages}
                  gridNumberByPage={gridNumberByPage}
                  wordIndex={wordIndex}
                  selectedId={selectedId}
                />
              )}
            </>
          )}
        </section>

        {/* Properties panel (hidden for the cover and the full-width gallery) */}
        {showProps && (
        <aside className="lg:max-h-[80vh] lg:overflow-auto">
          {selectedId === "dedication" && (
            <DedicationEditor text={book.dedicationText ?? ""} onChange={updateDedication} />
          )}
          {selectedId === "add" && (
            <AddPage
              busy={busy}
              genBatch={genBatch}
              onAddGrids={addGrids}
              onAddContent={addContent}
              onAttachGrid={attachGrid}
            />
          )}
          {selectedId === "index" && (
            <p className="text-sm text-muted-foreground">
              L&apos;index liste automatiquement tous les mots de chaque grille.
            </p>
          )}
          {selectedId === "solutions" && (
            <p className="text-sm text-muted-foreground">
              Les solutions sont générées automatiquement et imprimées à la fin du livre.
            </p>
          )}
          {selectedPage?.kind === "grid" && (
            <GridPageProperties
              page={selectedPage}
              index={gridNumberByPage.get(selectedPage.pageId) ?? 0}
              regenerating={regeneratingId === selectedPage.pageId}
              onConfigChange={(patch: Partial<GridPageConfig>) =>
                updatePageConfig(selectedPage.pageId, patch)
              }
              onRegenerate={(clues) => regenerateGrid(selectedPage, clues)}
              onDelete={() => deletePage(selectedPage.pageId)}
            />
          )}
          {selectedPage?.kind === "content" && (
            <ContentPageEditor
              config={selectedPage.config}
              onChange={(patch: Partial<ContentPageConfig>) =>
                updatePageConfig(selectedPage.pageId, patch)
              }
              onDelete={() => deletePage(selectedPage.pageId)}
            />
          )}
        </aside>
        )}
      </div>

      {/* Print-only layout */}
      <BookPrintLayout
        book={book}
        gridPages={gridPages}
        gridNumberByPage={gridNumberByPage}
        wordIndex={wordIndex}
      />
    </div>
  );
}
