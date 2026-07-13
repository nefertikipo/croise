"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageRail, type RailItem } from "@/components/book/page-rail";
import { CoverEditor } from "@/components/book/cover-editor";
import { DedicationEditor } from "@/components/book/dedication-editor";
import { GridPageProperties } from "@/components/book/grid-page-properties";
import { ContentPageEditor } from "@/components/book/content-page-editor";
import { SpreadCanvas } from "@/components/book/spread-canvas";
import { PageCanvas } from "@/components/book/page-canvas";
import { AddPage } from "@/components/book/add-page";
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
  // "spread" = facing pages for arranging; "page" = one page big, for editing grids.
  const [view, setView] = useState<"spread" | "page">("spread");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
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
    try {
      const res = await fetch(`/api/books/${code}/grids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      if (!res.ok) throw new Error("Generation failed");
      const { pages } = (await res.json()) as { pages: BookData["pages"] };
      setBook((b) => ({ ...b, pages: [...b.pages, ...pages] }));
      if (pages[0]) setSelectedId(pages[0].pageId);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function addContent(layout: ContentLayout) {
    setBusy(true);
    try {
      const res = await fetch(`/api/books/${code}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
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

  function movePage(pageId: string, dir: -1 | 1) {
    const order = book.pages.map((p) => p.pageId);
    const idx = order.indexOf(pageId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= order.length) return;
    const reordered = [...book.pages];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    setBook((b) => ({ ...b, pages: reordered }));
    fetch(`/api/books/${code}/pages/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageIds: reordered.map((p) => p.pageId) }),
    });
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
            pageId: p.pageId,
            kind: "grid",
            label: `Grille ${gridNumberByPage.get(p.pageId)}`,
            sub: `${p.width}×${p.height}`,
          }
        : {
            id: p.pageId,
            pageId: p.pageId,
            kind: "content",
            label: p.config.title || (p.config.layout === "quote" ? "Citation" : "Note"),
            sub: "Page libre",
          },
    ),
    { id: "index", kind: "index", label: "Index des mots" },
    { id: "solutions", kind: "solutions", label: "Solutions" },
    { id: "add", kind: "add", label: "+ Ajouter une page" },
  ];

  const firstSpineIndex = 2;
  const lastSpineIndex = 1 + book.pages.length;

  const selectedPage = book.pages.find((p) => p.pageId === selectedId);

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
            <Button variant="outline" onClick={() => window.print()}>
              Imprimer / PDF
            </Button>
            <Button variant="outline" onClick={copyLink}>
              {copied ? "Lien copié !" : "Partager"}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor body */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-6 px-4 py-6 print:hidden">
        {/* Rail */}
        <aside className="lg:max-h-[80vh] lg:overflow-auto">
          <PageRail
            items={railItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={movePage}
            firstSpineIndex={firstSpineIndex}
            lastSpineIndex={lastSpineIndex}
          />
        </aside>

        {/* Canvas: spread (arrange) or single page (edit) */}
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
              {view === "spread" ? (
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

        {/* Properties panel */}
        <aside className="lg:max-h-[80vh] lg:overflow-auto">
          {selectedId === "cover" && (
            <CoverEditor
              title={book.title}
              cover={book.coverConfig ?? {}}
              onTitleChange={updateTitle}
              onCoverChange={updateCover}
            />
          )}
          {selectedId === "dedication" && (
            <DedicationEditor text={book.dedicationText ?? ""} onChange={updateDedication} />
          )}
          {selectedId === "add" && (
            <AddPage busy={busy} onAddGrids={addGrids} onAddContent={addContent} />
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
