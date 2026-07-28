"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageRail, type RailItem } from "@/components/book/page-rail";
import { CoverStudio } from "@/components/book/cover-studio";
import { DedicationEditor } from "@/components/book/dedication-editor";
import { ClueIdeasEditor } from "@/components/book/clue-ideas-editor";
import { GridPageProperties } from "@/components/book/grid-page-properties";
import { ContentPageEditor } from "@/components/book/content-page-editor";
import { SpreadCanvas } from "@/components/book/spread-canvas";
import { GalleryCanvas } from "@/components/book/gallery-canvas";
import { PageCanvas } from "@/components/book/page-canvas";
import { AddPage } from "@/components/book/add-page";
import { GridCreator, type CreateGridOptions } from "@/components/book/grid-creator";
import { cn } from "@/lib/utils";
import { BookPrintLayout } from "@/components/book/book-print-layout";
import { backMatterKind } from "@/components/book/page-slot";
import { buildWordIndex } from "@/lib/crossword/word-index";
import { normalizeAnswer } from "@/lib/crossword/normalize";
import { BOOK_MIN_GRIDS } from "@/lib/books/constants";
import type {
  BookData,
  ClueIdea,
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
  /** True when the viewer may not edit (owned book opened by a non-owner). */
  readOnly?: boolean;
  /** True when the viewer is anonymous and the book has no owner. */
  showSigninNudge?: boolean;
}

/** Human label of a content page's layout, used in the rail. */
function contentLabel(layout: ContentLayout): string {
  if (layout === "quote") return "Citation";
  if (layout === "photo") return "Photo";
  return "Note";
}

export function BookEditor({
  code,
  initialBook,
  readOnly = false,
  showSigninNudge = false,
}: BookEditorProps) {
  const [book, setBook] = useState<BookData>(initialBook);
  const [selectedId, setSelectedId] = useState<string>("cover");
  // "gallery" = zoom-out overview of every page; "spread" = facing pages for
  // arranging; "page" = one page big, for editing grids.
  const [view, setView] = useState<"gallery" | "spread" | "page">("gallery");
  // Number of saves outstanding: armed debounce timers + in-flight requests.
  const [pendingSaves, setPendingSaves] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [busy, setBusy] = useState(false);
  // Live per-grid progress for a batch add ("Grille 2 sur 5"). Null when idle.
  const [genBatch, setGenBatch] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Grid creator opened from the empty-book onboarding (not the add-page panel).
  const [onboardingCreator, setOnboardingCreator] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  // Wizard handoff (/livre/nouveau): true while the wizard's generation plan is
  // running, to show the "we're preparing your grids" banner.
  const [wizardGenerating, setWizardGenerating] = useState(false);
  const [wizardBannerDismissed, setWizardBannerDismissed] = useState(false);
  // One-shot guard for the wizard pickup (also covers strict-mode re-invokes).
  const wizardRan = useRef(false);

  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Freshest book state, so debounced saves persist what is displayed at fire
  // time (avoids lost updates from stale render-scope closures).
  const bookRef = useRef(book);
  bookRef.current = book;

  /**
   * Debounced save. `fn` resolves `true` on success; failures flip the status
   * line to "Échec de l'enregistrement" (each `fn` also toasts its own message).
   */
  function debounce(key: string, fn: () => Promise<boolean>, ms = 600) {
    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing);
    else setPendingSaves((n) => n + 1);
    setSaveError(false);
    timers.current.set(
      key,
      setTimeout(async () => {
        timers.current.delete(key);
        let ok = false;
        try {
          ok = await fn();
        } catch {
          ok = false;
        }
        if (!ok) setSaveError(true);
        setPendingSaves((n) => n - 1);
      }, ms),
    );
  }

  // Warn before leaving while a save is pending (debounce armed or in flight).
  useEffect(() => {
    if (pendingSaves === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome still requires returnValue for the native prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingSaves]);

  // Wizard handoff: /livre/nouveau creates the book, stores a per-grid
  // generation plan in sessionStorage, then lands here. Pick the plan up once
  // (mutation orchestration, not data fetching) and auto-generate the grids
  // while the user starts on the cover. Only ever runs on a brand-new book —
  // the plan key is deleted before running and a ref guards strict-mode's
  // double effect invocation.
  useEffect(() => {
    if (wizardRan.current) return;
    wizardRan.current = true;
    if (readOnly) return;
    const key = `book-wizard-plan-${code}`;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(key);
      if (raw !== null) sessionStorage.removeItem(key);
    } catch {
      return; // Storage unavailable — nothing to pick up.
    }
    if (!raw) return;
    if (initialBook.pages.some((p) => p.kind === "grid")) return;
    let plans: CreateGridOptions[] = [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) plans = parsed as CreateGridOptions[];
    } catch {
      return; // Corrupt plan — the empty-book onboarding takes over.
    }
    if (plans.length === 0) return;
    setWizardGenerating(true);
    void runGridPlans(plans, { selectFirst: false }).then((failReason) => {
      setWizardGenerating(false);
      if (failReason) toast.error(failReason);
    });
    // Mount-only by design: the plan must run exactly once for this book.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Re-fetch the book so the UI stops showing unsaved data as saved. */
  async function resyncBook() {
    try {
      const res = await fetch(`/api/books/${code}`);
      if (res.ok) setBook((await res.json()) as BookData);
    } catch {
      // Offline — keep local state; the status line already shows the failure.
    }
  }

  async function readError(res: Response, fallback: string): Promise<string> {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return typeof data?.error === "string" ? data.error : fallback;
  }

  // --- Book-level saves -----------------------------------------------------
  async function patchBook(body: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch(`/api/books/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error(await readError(res, "Échec de l'enregistrement du livre."));
        await resyncBook();
        return false;
      }
      return true;
    } catch {
      toast.error("Échec de l'enregistrement du livre. Vérifiez votre connexion.");
      await resyncBook();
      return false;
    }
  }

  function updateTitle(title: string) {
    setBook((b) => ({ ...b, title }));
    debounce("book-title", () => patchBook({ title: bookRef.current.title }));
  }

  function updateCover(patch: Partial<CoverConfig>) {
    setBook((b) => ({ ...b, coverConfig: { ...(b.coverConfig ?? {}), ...patch } }));
    debounce("book-cover", () =>
      patchBook({ coverConfig: bookRef.current.coverConfig ?? {} }),
    );
  }

  /** Fetch a generated PDF and open it — surfacing errors as a toast instead
   * of a tab of raw JSON. */
  async function openPdf(path: string) {
    try {
      const res = await fetch(path);
      if (!res.ok) {
        toast.error(await readError(res, "Impossible de générer le PDF."));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Leave time for the new tab to load the blob before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("Impossible de générer le PDF. Vérifiez votre connexion.");
    }
  }

  /** Wraparound cover spread (back + spine + front). */
  async function downloadCover() {
    if (!readOnly) {
      if (!book.coverConfig?.design?.photoRef) {
        toast.error("Ajoutez d'abord une photo de couverture.");
        return;
      }
      // Persist the current cover config so the generated PDF reflects it.
      await patchBook({ coverConfig: book.coverConfig });
    }
    await openPdf(`/api/books/${code}/cover.pdf`);
  }

  /** Print-ready A5 interior (full spine). Below the recommended grid count,
   * warn first — the printed book would feel thin. */
  function downloadBook(size: "a5" = "a5") {
    if (!readOnly && gridPages.length > 0 && gridPages.length < BOOK_MIN_GRIDS) {
      toast(
        `Votre livre compte ${gridPages.length} grille${gridPages.length > 1 ? "s" : ""} sur les ${BOOK_MIN_GRIDS} recommandées pour l'impression.`,
        {
          action: {
            label: "Télécharger quand même",
            onClick: () => void openPdf(`/api/books/${code}/book.pdf?size=${size}`),
          },
        },
      );
      return;
    }
    void openPdf(`/api/books/${code}/book.pdf?size=${size}`);
  }

  function updateDedication(text: string) {
    setBook((b) => ({ ...b, dedicationText: text }));
    debounce("book-dedication", () =>
      patchBook({ dedicationText: bookRef.current.dedicationText ?? "" }),
    );
  }

  function updateClueIdeas(clueIdeas: ClueIdea[]) {
    setBook((b) => ({ ...b, clueIdeas }));
    debounce("book-clue-ideas", () =>
      patchBook({ clueIdeas: bookRef.current.clueIdeas }),
    );
  }

  // --- Page-level saves -----------------------------------------------------
  async function savePageConfig(pageId: string): Promise<boolean> {
    // Persist the page's config as displayed at fire time.
    const config = bookRef.current.pages.find((p) => p.pageId === pageId)?.config;
    if (!config) return true; // Page deleted meanwhile — nothing to save.
    try {
      const res = await fetch(`/api/books/${code}/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) {
        toast.error(await readError(res, "Échec de l'enregistrement de la page."));
        await resyncBook();
        return false;
      }
      return true;
    } catch {
      toast.error("Échec de l'enregistrement de la page. Vérifiez votre connexion.");
      await resyncBook();
      return false;
    }
  }

  function updatePageConfig(pageId: string, patch: Record<string, unknown>) {
    setBook((b) => ({
      ...b,
      pages: b.pages.map((p) =>
        p.pageId === pageId
          ? ({ ...p, config: { ...p.config, ...patch } } as typeof p)
          : p,
      ),
    }));
    debounce(`page-${pageId}`, () => savePageConfig(pageId));
  }

  // --- Structural mutations -------------------------------------------------
  /** Top up the book to BOOK_MIN_GRIDS with generic grids (defaults, no custom
   * words) — the user can regenerate any of them later with personal touches.
   * Difficulty follows what the book already uses (most common among its
   * grids), falling back to the recommended "facile". */
  function completeWithGenericGrids() {
    const missing = BOOK_MIN_GRIDS - gridPages.length;
    if (missing <= 0 || busy) return;
    const counts = new Map<GridDifficulty, number>();
    for (const p of gridPages) {
      const d = p.config.difficulty ?? "balanced";
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    let difficulty: GridDifficulty = "facile";
    let best = 0;
    for (const [d, n] of counts) {
      if (n > best) {
        best = n;
        difficulty = d;
      }
    }
    void addGrids({
      width: 11,
      height: 17,
      count: missing,
      difficulty,
      customClues: [],
    });
  }

  /** Batch add of identical grids (the grid creator / generic top-up path). */
  async function addGrids(opts: CreateGridOptions): Promise<string | null> {
    return runGridPlans(
      Array.from({ length: opts.count }, () => ({ ...opts, count: 1 })),
    );
  }

  /**
   * Run a list of per-grid generation plans sequentially — one grid per request
   * so each returns quickly (well under the serverless timeout), grids appear
   * in the book as they land, and the progress bar can report "Grille X sur N".
   * The endpoint recomputes the book's used-word/clue exclusions per call, so
   * sequential requests stay free of repeats exactly like a server-side batch
   * would. Plans may differ per grid (the wizard spreads custom words and the
   * hidden message across them). Resolves to a failure reason when nothing was
   * created, null otherwise (partial failures toast here).
   */
  async function runGridPlans(
    plans: CreateGridOptions[],
    { selectFirst = true }: { selectFirst?: boolean } = {},
  ): Promise<string | null> {
    setBusy(true);
    setGenBatch({ current: 1, total: plans.length });
    let created = 0;
    let failReason: string | null = null;
    const fallbackReason = "La génération de la grille a échoué. Réessayez.";
    try {
      for (let i = 0; i < plans.length; i++) {
        setGenBatch({ current: i + 1, total: plans.length });
        const res = await fetch(`/api/books/${code}/grids`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...plans[i], count: 1 }),
        });
        if (!res.ok) {
          failReason = await readError(res, fallbackReason);
          break;
        }
        const data = (await res.json()) as {
          pages: BookData["pages"];
          failed?: { requested: number; created: number; reason: string };
        };
        if (data.pages.length === 0) {
          failReason = data.failed?.reason ?? fallbackReason;
          break;
        }
        setBook((b) => ({ ...b, pages: [...b.pages, ...data.pages] }));
        if (selectFirst && created === 0 && data.pages[0]) {
          setSelectedId(data.pages[0].pageId);
        }
        created += data.pages.length;
      }
      // Nothing generated — surface the reason inline in the creator.
      if (created === 0) return failReason ?? fallbackReason;
      if (created < plans.length) {
        toast.error(
          `${created} grille${created > 1 ? "s" : ""} sur ${plans.length} créée${created > 1 ? "s" : ""} : ${failReason ?? fallbackReason}`,
        );
      }
      return null;
    } catch (err) {
      console.error(err);
      if (created > 0) {
        toast.error(
          `${created} grille${created > 1 ? "s" : ""} sur ${plans.length} créée${created > 1 ? "s" : ""} : ${fallbackReason}`,
        );
        return null;
      }
      return fallbackReason;
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
      if (!res.ok) {
        toast.error(await readError(res, "Impossible d'ajouter la page."));
        return;
      }
      const page = (await res.json()) as BookData["pages"][number];
      setBook((b) => ({ ...b, pages: [...b.pages, page] }));
      setSelectedId(page.pageId);
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'ajouter la page. Vérifiez votre connexion.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePage(pageId: string) {
    setBook((b) => ({ ...b, pages: b.pages.filter((p) => p.pageId !== pageId) }));
    setSelectedId("cover");
    try {
      const res = await fetch(`/api/books/${code}/pages/${pageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(await readError(res, "Impossible de supprimer la page."));
        await resyncBook();
      }
    } catch {
      toast.error("Impossible de supprimer la page. Vérifiez votre connexion.");
      await resyncBook();
    }
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
      if (!res.ok) {
        toast.error(
          await readError(res, "La régénération de la grille a échoué. Réessayez."),
        );
        return;
      }
      const updated = (await res.json()) as GridPage;
      setBook((b) => ({
        ...b,
        pages: b.pages.map((p) => (p.pageId === page.pageId ? updated : p)),
      }));
    } catch (err) {
      console.error(err);
      toast.error("La régénération de la grille a échoué. Vérifiez votre connexion.");
    } finally {
      setRegeneratingId(null);
    }
  }

  async function persistOrder(pages: BookData["pages"]) {
    setBook((b) => ({ ...b, pages }));
    try {
      const res = await fetch(`/api/books/${code}/pages/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds: pages.map((p) => p.pageId) }),
      });
      if (!res.ok) {
        toast.error(await readError(res, "Impossible d'enregistrer le nouvel ordre."));
        await resyncBook();
      }
    } catch {
      toast.error("Impossible d'enregistrer le nouvel ordre. Vérifiez votre connexion.");
      await resyncBook();
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
    void persistOrder(pages);
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

  // Which grids each clue idea has landed in: normalized custom answer → grid
  // numbers. Derived live from the placed custom words, so regenerating a grid
  // marks an idea "used" and deleting that grid frees it again — no extra state.
  const ideaUsage = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const p of book.pages) {
      if (p.kind !== "grid") continue;
      const n = gridNumberByPage.get(p.pageId) ?? 0;
      for (const w of p.words) {
        if (!w.isCustom) continue;
        const key = normalizeAnswer(w.answer);
        if (!key) continue;
        const grids = map.get(key) ?? [];
        if (!grids.includes(n)) grids.push(n);
        map.set(key, grids);
      }
    }
    return map;
  }, [book.pages, gridNumberByPage]);

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
            label: p.config.title || contentLabel(p.config.layout),
          },
    ),
    { id: "index#0", kind: "index", label: "Index des mots" },
    { id: "solutions#0", kind: "solutions", label: "Solutions" },
    // Design tools, not book pages — rendered under a separate "Atelier"
    // divider. Hidden entirely in read-only mode.
    ...(readOnly
      ? []
      : ([
          { id: "ideas", kind: "ideas", label: "Carnet d'idées" },
          { id: "add", kind: "add", label: "+ Ajouter une page" },
        ] satisfies RailItem[])),
  ];

  const selectedPage = book.pages.find((p) => p.pageId === selectedId);

  // The properties panel only shows when editing a single non-cover page. The
  // gallery/spread overviews and the full-width cover studio take the whole
  // width. Read-only viewers never get the panel.
  const showProps = readOnly
    ? false
    : selectedId === "add" || selectedId === "ideas"
      ? true
      : view === "gallery"
        ? false
        : selectedId === "cover"
          ? false
          : true;

  const saveStatus =
    pendingSaves > 0
      ? "Enregistrement…"
      : saveError
        ? "Échec de l'enregistrement"
        : "Enregistré";

  // Empty-book onboarding: no grids yet, in the default overview. Hidden while
  // a generation batch runs (e.g. the wizard's plan) — the first grid is coming.
  const showEmptyState =
    !readOnly &&
    !busy &&
    gridPages.length === 0 &&
    view === "gallery" &&
    selectedId !== "add" &&
    selectedId !== "ideas";

  return (
    <div className="flex-1">
      {/* Top bar */}
      <div className="border-b-2 border-black bg-card print:hidden">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-3 flex-wrap">
          <h1 className="font-heading text-2xl uppercase">{book.title}</h1>
          <span className="text-xs font-mono text-muted-foreground">{code}</span>
          {readOnly ? (
            <span className="border border-black/30 bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Lecture seule
            </span>
          ) : (
            <span
              className={cn(
                "text-xs",
                saveError && pendingSaves === 0
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {saveStatus}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={downloadCover}>
              Couverture (PDF)
            </Button>
            <Button variant="outline" onClick={() => downloadBook("a5")}>
              Livre (PDF)
            </Button>
            <Link href={`/book/${code}/apercu`} className={buttonVariants()}>
              Aperçu &amp; commande
            </Link>
            <Button variant="outline" onClick={copyLink}>
              {copied ? "Lien copié !" : "Partager"}
            </Button>
          </div>
        </div>
      </div>

      {/* Anonymous-book nudge: without an account, only the link gives access. */}
      {showSigninNudge && !nudgeDismissed && (
        <div className="border-b border-black/15 bg-accent/40 print:hidden">
          <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              <Link href="/connexion" className="underline hover:no-underline">
                Connectez-vous
              </Link>{" "}
              pour retrouver ce livre plus tard, sans compte, seul le lien y donne accès.
            </span>
            <button
              type="button"
              onClick={() => setNudgeDismissed(true)}
              aria-label="Masquer ce message"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Editor body */}
      <div
        className={`max-w-7xl mx-auto grid grid-cols-1 gap-6 px-4 py-6 print:hidden ${
          showProps ? "lg:grid-cols-[220px_1fr_380px]" : "lg:grid-cols-[220px_1fr]"
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
              Choisissez le type de page à ajouter dans le panneau «&nbsp;Ajouter une
              page&nbsp;».
            </div>
          ) : selectedId === "ideas" ? (
            <div className="mx-auto max-w-md pt-16 text-center">
              <p className="font-heading text-lg uppercase">Votre carnet d&apos;idées</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Notez à droite vos idées de mots et d&apos;indices (prénoms, dates,
                clins d&apos;œil). Rien n&apos;est imprimé ici. Vous pourrez les piocher
                d&apos;un clic en créant ou régénérant une grille, et voir lesquelles
                ont déjà été placées.
              </p>
            </div>
          ) : (
            <>
              {/* One banner slot: while the wizard's plan runs, reassure +
                  report progress; otherwise the 12-grid completion nudge. */}
              {!readOnly && wizardGenerating ? (
                !wizardBannerDismissed && (
                  <div className="mb-4 flex flex-wrap items-center justify-center gap-3 border-2 border-black/20 bg-accent/30 px-4 py-2 text-sm">
                    <span className="max-w-xl">
                      Nous préparons vos {BOOK_MIN_GRIDS} grilles avec vos mots.
                      Personnalisez la couverture ou la dédicace pendant ce
                      temps. Vous pourrez ensuite ajouter des mots et régénérer
                      chaque grille.
                    </span>
                    {genBatch && (
                      <span className="whitespace-nowrap text-muted-foreground">
                        Génération {genBatch.current}/{genBatch.total}…
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setWizardBannerDismissed(true)}
                      aria-label="Masquer ce message"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  </div>
                )
              ) : (
              !readOnly && gridPages.length > 0 && gridPages.length < BOOK_MIN_GRIDS && (
                <div className="mb-4 flex flex-wrap items-center justify-center gap-3 border-2 border-black/20 bg-accent/30 px-4 py-2 text-sm">
                  <span>
                    <strong>{gridPages.length}</strong> grille
                    {gridPages.length > 1 ? "s" : ""} sur {BOOK_MIN_GRIDS} : un
                    livre imprimé en compte au moins {BOOK_MIN_GRIDS}.
                  </span>
                  {busy && genBatch ? (
                    <span className="text-muted-foreground">
                      Génération {genBatch.current}/{genBatch.total}…
                    </span>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={completeWithGenericGrids}
                      >
                        Compléter avec des grilles génériques
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void addContent("note")}
                      >
                        + Page de notes
                      </Button>
                    </>
                  )}
                </div>
              ))}
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
              {showEmptyState ? (
                <div className="mx-auto max-w-md border-2 border-dashed border-black/30 px-8 py-16 text-center">
                  <p className="font-heading text-xl uppercase">
                    Votre livre est vide
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Commencez par générer vos grilles, vous pourrez ensuite y
                    glisser vos mots personnalisés, ajouter des photos et
                    personnaliser la couverture.
                  </p>
                  <Button
                    className="mt-6"
                    disabled={busy}
                    onClick={() => setOnboardingCreator(true)}
                  >
                    Générer mes grilles
                  </Button>
                </div>
              ) : view === "gallery" ? (
                <GalleryCanvas
                  book={book}
                  gridPages={gridPages}
                  gridNumberByPage={gridNumberByPage}
                  wordIndex={wordIndex}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onReorder={reorderPages}
                  readOnly={readOnly}
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
              ) : selectedId === "cover" && !readOnly ? (
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

        {/* Properties panel (hidden for the cover, the full-width gallery, and
            read-only viewers). Sticky + full-height so it uses the available
            space and only scrolls internally when its content genuinely exceeds
            the viewport. */}
        {showProps && (
        <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto lg:self-start">
          {selectedId === "dedication" && (
            <DedicationEditor text={book.dedicationText ?? ""} onChange={updateDedication} />
          )}
          {selectedId === "ideas" && (
            <ClueIdeasEditor
              ideas={book.clueIdeas}
              usage={ideaUsage}
              onChange={updateClueIdeas}
            />
          )}
          {selectedId === "add" && (
            <AddPage
              busy={busy}
              genBatch={genBatch}
              ideas={book.clueIdeas}
              ideaUsage={ideaUsage}
              onAddGrids={addGrids}
              onAddContent={addContent}
            />
          )}
          {backMatterKind(selectedId) === "index" && (
            <p className="text-sm text-muted-foreground">
              L&apos;index liste automatiquement tous les mots de chaque grille.
            </p>
          )}
          {backMatterKind(selectedId) === "solutions" && (
            <p className="text-sm text-muted-foreground">
              Les solutions sont générées automatiquement et imprimées à la fin du livre.
            </p>
          )}
          {selectedPage?.kind === "grid" && (
            <GridPageProperties
              key={selectedPage.pageId}
              page={selectedPage}
              index={gridNumberByPage.get(selectedPage.pageId) ?? 0}
              regenerating={regeneratingId === selectedPage.pageId}
              ideas={book.clueIdeas}
              ideaUsage={ideaUsage}
              onConfigChange={(patch: Partial<GridPageConfig>) =>
                updatePageConfig(selectedPage.pageId, patch)
              }
              onRegenerate={(clues) => regenerateGrid(selectedPage, clues)}
              onDelete={() => deletePage(selectedPage.pageId)}
            />
          )}
          {selectedPage?.kind === "content" && (
            <ContentPageEditor
              key={selectedPage.pageId}
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

      {/* Grid creator opened from the empty-book onboarding, preset to the
          product default of 5 grids. */}
      {onboardingCreator && (
        <GridCreator
          busy={busy}
          genBatch={genBatch}
          ideas={book.clueIdeas}
          ideaUsage={ideaUsage}
          initialCount={BOOK_MIN_GRIDS}
          onCreate={addGrids}
          onClose={() => setOnboardingCreator(false)}
        />
      )}

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
