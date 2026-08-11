"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FlecheGrid } from "@/components/fleche/fleche-grid";
import { CustomWordsEditor } from "@/components/book/custom-words-editor";
import { MONTHS_FR, CALENDAR_GRID_WIDTH, CALENDAR_GRID_HEIGHT } from "@/lib/calendar-pdf/geometry";
import type { CalendarData, CalendarMonthGrid } from "@/types/calendar";

interface CustomClue {
  answer: string;
  clue: string;
}

const ACCENT_SWATCHES = [
  { hex: "#007cb8", label: "Bleu" },
  { hex: "#c1432f", label: "Rouge" },
  { hex: "#1f9d76", label: "Vert" },
  { hex: "#b8860b", label: "Or" },
  { hex: "#7a4fb0", label: "Violet" },
];

/** A month grid scaled to a small thumbnail. */
function MonthThumb({ grid, accent }: { grid: CalendarMonthGrid; accent?: string }) {
  const targetW = 240;
  const natural = grid.width * 70;
  const scale = targetW / natural;
  return (
    <div style={{ width: targetW, height: grid.height * 70 * scale, overflow: "hidden" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: natural }}>
        <FlecheGrid cells={grid.cells} width={grid.width} height={grid.height} accentColor={accent} interactive={false} />
      </div>
    </div>
  );
}

export function CalendarCreator({ initialCalendar }: { initialCalendar?: CalendarData }) {
  const nextYear = new Date().getFullYear() + 1;
  const [calendar, setCalendar] = useState<CalendarData | null>(initialCalendar ?? null);
  const [title, setTitle] = useState(initialCalendar?.title ?? "");
  const [year, setYear] = useState(initialCalendar?.year ?? nextYear);
  const [gridColor, setGridColor] = useState(initialCalendar?.gridColor ?? ACCENT_SWATCHES[0].hex);
  const [busy, setBusy] = useState<string | null>(null); // label of current work
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [monthClues, setMonthClues] = useState<Record<number, CustomClue[]>>({});
  const [email, setEmail] = useState("");

  const code = calendar?.code;
  const monthsByNum = useMemo(() => {
    const map = new Map<number, CalendarMonthGrid>();
    for (const m of calendar?.months ?? []) map.set(m.month, m);
    return map;
  }, [calendar]);
  const generatedCount = monthsByNum.size;

  async function ensureCalendar(): Promise<string> {
    if (code) {
      const res = await fetch(`/api/calendars/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || null, year, gridColor }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Mise à jour impossible");
      setCalendar((await res.json()) as CalendarData);
      return code;
    }
    const res = await fetch("/api/calendars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || undefined, year, gridColor }),
    });
    // Creating a calendar requires an account — send anonymous makers to sign
    // in, then back to where they were.
    if (res.status === 401) {
      window.location.href = `/connexion?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      throw new Error("Connectez-vous pour créer un calendrier.");
    }
    if (!res.ok) throw new Error((await res.json()).error ?? "Création impossible");
    const { code: fresh } = (await res.json()) as { code: string };
    // Load the (empty) calendar so we have an object to fill.
    const loaded = await fetch(`/api/calendars/${fresh}`).then((r) => r.json());
    setCalendar(loaded as CalendarData);
    return fresh;
  }

  async function generateMonth(calCode: string, month: number, clues: CustomClue[]) {
    const res = await fetch(`/api/calendars/${calCode}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, customClues: clues.filter((c) => c.answer.trim() && c.clue.trim()) }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Génération impossible");
    setCalendar((await res.json()) as CalendarData);
  }

  async function handleGenerateAll() {
    setBusy("Préparation…");
    try {
      const calCode = await ensureCalendar();
      for (let m = 1; m <= 12; m++) {
        if (monthsByNum.has(m)) continue; // resume: skip already-generated months
        setBusy(`Génération ${m}/12 — ${MONTHS_FR[m - 1]}…`);
        await generateMonth(calCode, m, []);
      }
      toast.success("Les 12 grilles sont prêtes !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(null);
    }
  }

  async function handleRegenMonth(month: number) {
    setBusy(`${MONTHS_FR[month - 1]}…`);
    try {
      const calCode = await ensureCalendar();
      await generateMonth(calCode, month, monthClues[month] ?? []);
      toast.success(`${MONTHS_FR[month - 1]} régénéré`);
      setOpenMonth(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(null);
    }
  }

  async function handleSave() {
    setBusy("Enregistrement…");
    try {
      await ensureCalendar();
      toast.success("Enregistré");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(null);
    }
  }

  async function handleOrder() {
    if (!email.trim()) return toast.error("Indiquez votre email");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: `calendrier-commande:${code ?? "draft"}` }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Email invalide");
      toast.success("Merci ! Nous vous recontactons pour finaliser votre calendrier.");
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Settings */}
      <div className="frame bg-background p-5">
        <div className="flex flex-wrap items-end gap-5">
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-ink/70">
            Titre
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="L'année en flèches"
              className="w-64 rounded-none border-2 border-ink bg-paper px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-ink/70">
            Année
            <input
              type="number"
              value={year}
              min={nextYear - 1}
              max={2100}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-28 rounded-none border-2 border-ink bg-paper px-3 py-2 text-sm font-normal"
            />
          </label>
          <div className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-ink/70">
            Couleur
            <div className="flex gap-2 py-1">
              {ACCENT_SWATCHES.map((s) => (
                <button
                  key={s.hex}
                  type="button"
                  aria-label={s.label}
                  onClick={() => setGridColor(s.hex)}
                  className={`h-7 w-7 rounded-full border-2 ${gridColor === s.hex ? "border-ink" : "border-transparent"}`}
                  style={{ backgroundColor: s.hex }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerateAll} disabled={!!busy} className="btn-lapos rounded-none bg-brand text-brand-foreground">
            {busy ?? (generatedCount > 0 ? `Compléter (${generatedCount}/12)` : "Générer les 12 grilles")}
          </Button>
          {code && (
            <Button onClick={handleSave} disabled={!!busy} variant="outline" className="rounded-none">
              Enregistrer
            </Button>
          )}
          {generatedCount > 0 && code && (
            <a
              href={`/api/calendars/${code}/calendar.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-sm uppercase tracking-wide text-brand underline"
            >
              Aperçu PDF ({generatedCount}/12)
            </a>
          )}
        </div>
      </div>

      {/* 12 month slots */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const grid = monthsByNum.get(month);
          return (
            <div key={month} className="frame flex flex-col gap-3 bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg uppercase tracking-wide text-ink">
                  {MONTHS_FR[month - 1]} {year}
                </span>
                <button
                  type="button"
                  onClick={() => setOpenMonth(openMonth === month ? null : month)}
                  className="font-condensed text-xs uppercase tracking-wide text-brand underline"
                  disabled={!!busy}
                >
                  {grid ? "Personnaliser" : "Ajouter des mots"}
                </button>
              </div>

              <div className="flex min-h-[140px] items-center justify-center bg-[#fff6ec] p-2">
                {grid ? (
                  <MonthThumb grid={grid} accent={gridColor} />
                ) : (
                  <span className="font-serif text-sm italic text-ink/40">Non générée</span>
                )}
              </div>

              {openMonth === month && (
                <div className="border-t border-ink/15 pt-3">
                  <CustomWordsEditor
                    width={CALENDAR_GRID_WIDTH}
                    height={CALENDAR_GRID_HEIGHT}
                    value={monthClues[month] ?? []}
                    onChange={(next) => setMonthClues((prev) => ({ ...prev, [month]: next }))}
                  />
                  <Button
                    onClick={() => handleRegenMonth(month)}
                    disabled={!!busy}
                    className="btn-lapos mt-3 w-full rounded-none bg-ink text-paper"
                  >
                    {grid ? "Régénérer ce mois" : "Générer ce mois"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Order */}
      {generatedCount > 0 && code && (
        <div className="frame max-w-md bg-background p-5">
          <h3 className="font-display text-lg uppercase tracking-wide text-ink">Commander</h3>
          <p className="mt-1 font-serif text-sm italic text-ink/60">
            Calendrier mural A3, relié spirale, 12 mois de grilles. {generatedCount < 12 ? `Il manque ${12 - generatedCount} mois.` : "Complet."}
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              className="flex-1 rounded-none border-2 border-ink bg-paper px-3 py-2 text-sm"
            />
            <Button onClick={handleOrder} className="btn-lapos rounded-none bg-ink text-paper">
              Commander
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
