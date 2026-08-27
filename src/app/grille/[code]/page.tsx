"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import {
  FlecheGrid,
  type FlecheGridHandle,
} from "@/components/fleche/fleche-grid";
import { ShareGridButton } from "@/components/fleche/share-grid-button";
import { findHiddenWordCells, normalizeHiddenWord } from "@/lib/crossword/hidden-word";
import {
  FlechePrintHeader,
  FlechePrintMotCache,
  FlechePrintFooter,
  computeFlechePrintScale,
} from "@/components/fleche/fleche-print-chrome";

interface ClueInCell {
  text: string;
  direction: "right" | "down";
  answerRow: number;
  answerCol: number;
  answerLength: number;
  answer: string;
  isCustom?: boolean;
}

interface FlecheCell {
  type: "letter" | "clue" | "empty";
  letter?: string;
  clues?: ClueInCell[];
  breakRight?: boolean;
  breakBottom?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  timeMs: number;
  isMe: boolean;
}

/** ms -> "m:ss" (or "h:mm:ss" past an hour). */
function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

interface GridData {
  id: string;
  code: string;
  ownerId: string | null;
  title: string | null;
  theme?: string | null;
  width: number;
  height: number;
  hiddenWord?: string;
  cells: FlecheCell[][];
  words: { answer: string; clue: string; direction: string; isCustom: boolean; startRow: number; startCol: number; length: number }[];
}

export default function GrillePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const code = params.code as string;

  const [grid, setGrid] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [checkErrors, setCheckErrors] = useState(false);
  const [title, setTitle] = useState("");

  const loadGrid = useCallback(async () => {
    try {
      const res = await fetch(`/api/grille/${code}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setGrid(data);
      setTitle(data.title || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  // Owner sees management controls (solution, rename, new grid); anyone else
  // arriving via a shared link gets a clean "solve it" experience.
  const isOwner = !!grid?.ownerId && session?.user?.id === grid.ownerId;
  // Editorial "Originales" grids get a cleaner solver: no play hint, no poster upsell.
  const isOriginale = grid?.theme === "originales";

  const cleanHidden = normalizeHiddenWord(grid?.hiddenWord ?? "");
  const hiddenCells = useMemo(() => {
    if (!grid || cleanHidden.length < 2) return new Map<string, number>();
    return findHiddenWordCells(grid, cleanHidden);
  }, [grid, cleanHidden]);

  async function updateTitle() {
    if (!grid || title === (grid.title || "")) return;
    await fetch(`/api/grille/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  // --- Originales solver: timer, reveal, autocheck, leaderboard ------------
  const gridRef = useRef<FlecheGridHandle>(null);
  const [autoCheck, setAutoCheck] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finishedMs, setFinishedMs] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [started, setStarted] = useState(false);
  const [username, setUsername] = useState("");
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);

  const timerKey = `fleche-timer:${code}`;

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/grille/${code}/leaderboard`);
      if (!res.ok) return;
      const data = await res.json();
      setBoard(data.entries ?? []);
    } catch {
      /* best-effort */
    }
  }, [code]);

  // Fetch the leaderboard once the grid is known to be an Originale.
  useEffect(() => {
    if (isOriginale) loadBoard();
  }, [isOriginale, loadBoard]);

  // Prefill the board name from a previous choice, else the account name.
  useEffect(() => {
    if (!isOriginale) return;
    const saved = window.localStorage.getItem("fleche-username");
    setUsername(saved || session?.user?.name || "");
  }, [isOriginale, session?.user?.name]);

  // Resume a timer already running from before a reload (they'd started typing).
  useEffect(() => {
    if (!isOriginale || !grid) return;
    if (Number(window.localStorage.getItem(timerKey)) > 0) setStarted(true);
  }, [isOriginale, grid, timerKey]);

  // Tick once solving has begun (first letter typed), until solved.
  useEffect(() => {
    if (!isOriginale || !started || finished) return;
    const start = Number(window.localStorage.getItem(timerKey)) || Date.now();
    const tick = () => setElapsedMs(Date.now() - start);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isOriginale, started, finished, timerKey]);

  // Start the clock on the first letter the player types.
  const handleFirstInput = useCallback(() => {
    if (!(Number(window.localStorage.getItem(timerKey)) > 0)) {
      window.localStorage.setItem(timerKey, String(Date.now()));
    }
    setStarted(true);
  }, [timerKey]);

  const handleComplete = useCallback(() => {
    if (!isOriginale) return;
    const start = Number(window.localStorage.getItem(timerKey)) || Date.now();
    const ms = Date.now() - start;
    setFinished(true);
    setFinishedMs(ms);
    setElapsedMs(ms);
    fetch(`/api/grille/${code}/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMs: ms,
        revealed,
        autocheck: autoCheck,
        username: username.trim() || undefined,
      }),
    })
      .then(() => loadBoard())
      .catch(() => {});
  }, [isOriginale, code, revealed, autoCheck, username, timerKey, loadBoard]);

  function handleRevealWord() {
    gridRef.current?.revealWord();
    setRevealed(true);
  }
  function handleRevealPuzzle() {
    gridRef.current?.revealPuzzle();
    setRevealed(true);
  }

  // Persist the board name; if already recorded, update it on the server too.
  function saveUsername() {
    const v = username.trim();
    window.localStorage.setItem("fleche-username", v);
    if (finished && v) {
      fetch(`/api/grille/${code}/leaderboard`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: v }),
      })
        .then(() => loadBoard())
        .catch(() => {});
    }
  }

  if (loading) {
    return (
      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="font-serif-accent text-lg italic text-ink/70">Chargement...</p>
        </div>
      </main>
    );
  }

  if (!grid) {
    return (
      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-brand">Grille introuvable</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 pt-8 pb-28 md:pb-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          {isOwner ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={updateTitle}
              placeholder="Nommer cette grille..."
              className="font-display text-2xl uppercase tracking-wide bg-transparent border-b-2 border-transparent hover:border-ink/30 focus:border-ink outline-none"
            />
          ) : (
            <h1 className="font-display text-2xl uppercase tracking-wide">
              {title.trim() || "Mots fléchés"}
            </h1>
          )}
          {isOwner && <span className="text-sm font-mono text-ink/60">{code}</span>}
        </div>

        {!isOwner && !isOriginale && (
          <p className="font-serif-accent text-lg italic text-ink/70">
            À toi de jouer : clique sur une case et remplis la grille, puis
            touche « Vérifier » pour contrôler tes réponses.
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {isOwner && (
            <Button
              onClick={() => setShowSolution(!showSolution)}
              className="btn-lapos rounded-none bg-sun px-4 py-2.5 text-sm text-ink"
            >
              {showSolution ? "Cacher solution" : "Voir solution"}
            </Button>
          )}
          {!showSolution && (
            <Button
              onClick={() => setCheckErrors((v) => !v)}
              className="btn-lapos rounded-none bg-paper px-4 py-2.5 text-sm text-ink"
            >
              {checkErrors ? "Masquer les erreurs" : "Vérifier"}
            </Button>
          )}
          <Button
            onClick={() => window.print()}
            className="btn-lapos rounded-none bg-sun px-4 py-2.5 text-sm text-ink"
          >
            Imprimer / PDF
          </Button>
          <ShareGridButton url={`/grille/${code}`} title={title} />
          {!isOriginale && (
            <Button
              onClick={() => router.push(`/poster/${code}`)}
              className="btn-lapos rounded-none bg-brand px-4 py-2.5 text-sm text-brand-foreground"
            >
              Commander en poster
            </Button>
          )}
          {isOwner && (
            <Button
              onClick={() => router.push("/fleche")}
              className="btn-lapos rounded-none bg-ink px-4 py-2.5 text-sm text-paper"
            >
              Nouvelle grille
            </Button>
          )}
        </div>

        {isOriginale && !showSolution && (
          <div className="space-y-3 border-2 border-ink bg-paper px-4 py-3 shadow-[4px_4px_0_0_var(--ink)]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-display text-xl tabular-nums tracking-wide text-brand">
                ⏱ {formatTime(finished && finishedMs != null ? finishedMs : elapsedMs)}
              </span>
              <label className="flex items-center gap-2">
                <span className="font-display text-xs uppercase tracking-wide text-ink/60">
                  Pseudo
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={saveUsername}
                  maxLength={24}
                  placeholder="Votre nom"
                  className="w-32 border-2 border-ink bg-paper px-2 py-1 font-sans text-sm outline-none focus:border-brand"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setAutoCheck((v) => !v)}
                className={`btn-lapos flex-1 rounded-none px-3 py-2 text-sm sm:flex-none ${
                  autoCheck ? "bg-turquoise text-paper" : "bg-paper text-ink"
                }`}
              >
                {autoCheck ? "Auto-vérif ✓" : "Auto-vérif"}
              </Button>
              <Button
                onClick={handleRevealWord}
                className="btn-lapos flex-1 rounded-none bg-paper px-3 py-2 text-sm text-ink sm:flex-none"
              >
                Révéler le mot
              </Button>
              <Button
                onClick={handleRevealPuzzle}
                className="btn-lapos flex-1 rounded-none bg-paper px-3 py-2 text-sm text-ink sm:flex-none"
              >
                Révéler la grille
              </Button>
            </div>
          </div>
        )}

        {isOriginale && finished && (
          <div className="border-2 border-ink bg-sun px-4 py-3 shadow-[4px_4px_0_0_var(--ink)]">
            <p className="font-display text-lg uppercase tracking-wide text-ink">
              Résolu en {formatTime(finishedMs ?? elapsedMs)}&nbsp;🎉
            </p>
            {(revealed || autoCheck) && (
              <p className="mt-1 font-serif-accent text-sm italic text-ink/70">
                {revealed ? "Grille révélée" : "Auto-vérif activé"} : ce temps
                n&apos;entre pas au classement.
              </p>
            )}
          </div>
        )}

        <div
          className="fleche-print-area"
          style={
            {
              "--print-scale": computeFlechePrintScale(
                grid.width,
                grid.height,
                hiddenCells.size > 0,
                title.trim().length > 0,
              ),
            } as CSSProperties
          }
        >
          <div className="fleche-print-page">
            <div className="fleche-print-scale">
              <FlechePrintHeader title={title.trim() || undefined} />
              <div className="overflow-x-auto">
                <FlecheGrid
                  ref={gridRef}
                  cells={grid.cells}
                  width={grid.width}
                  height={grid.height}
                  showSolution={showSolution}
                  interactive={!showSolution}
                  revealErrors={checkErrors}
                  autoCheck={isOriginale && autoCheck}
                  onComplete={isOriginale ? handleComplete : undefined}
                  onFirstInput={isOriginale ? handleFirstInput : undefined}
                  solverLayout
                  highlightedCells={hiddenCells}
                  persistKey={code}
                  hideCustomTint={isOriginale}
                />
              </div>
              <FlechePrintMotCache count={hiddenCells.size} />
              <FlechePrintFooter />
            </div>
          </div>
          {isOwner && (
            <div className="fleche-print-solution hidden print:block">
              <p className="mb-4 font-display text-xl uppercase tracking-wide text-ink">
                Solution{title.trim() ? ` : ${title.trim()}` : ""}
              </p>
              <div className="fleche-print-scale fleche-print-solution-scale">
                <FlecheGrid
                  cells={grid.cells}
                  width={grid.width}
                  height={grid.height}
                  showSolution
                  plain
                />
              </div>
            </div>
          )}
        </div>

        {hiddenCells.size > 0 && (
          <div className="flex items-center gap-1">
            <span className="mr-2 font-display text-sm uppercase tracking-[0.2em] text-ink">Mot caché :</span>
            {Array.from({ length: hiddenCells.size }, (_, i) => (
              <div
                key={i}
                className="flex h-8 w-8 items-center justify-center border-2 border-ink text-xs text-ink/70"
              >
                {showSolution ? cleanHidden[i] : i + 1}
              </div>
            ))}
          </div>
        )}

        {isOriginale && board && board.length > 0 && (
          <div className="print:hidden">
            <h2 className="font-display text-xl uppercase tracking-wide text-brand">
              Classement
            </h2>
            <ol className="mt-3 divide-y-2 divide-ink/10 border-2 border-ink bg-paper">
              {board.map((e) => (
                <li
                  key={`${e.rank}-${e.name}`}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    e.isMe ? "bg-sun/40" : ""
                  }`}
                >
                  <span className="w-6 font-display text-lg text-ink/50">
                    {e.rank}
                  </span>
                  <span className="flex-1 truncate font-sans text-sm text-ink">
                    {e.name}
                    {e.isMe ? " (vous)" : ""}
                  </span>
                  <span className="font-display text-base tabular-nums text-ink">
                    {formatTime(e.timeMs)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="font-serif-accent text-sm italic text-ink/70">
          {grid.words.length} mots
        </p>
      </div>
    </main>
  );
}
