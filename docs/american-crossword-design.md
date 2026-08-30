# American-style crossword generator — design notes

Status: **Milestone 1 shipped** (generate + solve one grid on screen). This
documents the direction for adding American-style crosswords ("mots croisés")
alongside the existing French mots fléchés engine.

## Milestone 1 — what exists (self-contained `american/` module; fléchés untouched)

- `src/lib/crossword/american/types.ts` — block/letter cell model, slots, clues.
- `src/lib/crossword/american/grid-templates.ts` — validated symmetric plain
  templates (7/9/11/13/15 daily + 21 Sunday, all odd) + theme templates (below) +
  `validateTemplate` enforcing the 5 hard rules at load. Classic American sizes:
  15×15 = daily (canonical), 21×21 = Sunday, both covered; 5×5 Mini intentionally
  skipped (too small for personalized words). 21×21 fills in ~1.5–6s (150 clues).
- `src/lib/crossword/american/slots.ts` — numbering + Across/Down slot & crossing
  extraction.
- `src/lib/crossword/american/solver.ts` — CSP fill: MRV + forward checking +
  score-weighted selection + preassigned (custom/theme) words. Reuses `WordList`.
- `src/lib/crossword/american/generate.ts` — template pick → best-effort
  symmetric custom-word placement → fill (random-restart) → clue assignment.
- `src/app/api/croises/generate/route.ts` — POST generate, GET template list.
- `src/components/crossword/crossword-grid.tsx` — numbered cells + blocks + linked
  Across/Down lists, full solve UX (type/click, direction toggle, autocheck,
  reveal, completion).
- `src/app/croises/page.tsx` — generator + solver page.

Verified: all 5 templates fill in ~1 attempt / a few ms against the real Neon
French corpus; custom words (ELISE/NOEL/PARIS) place correctly; API + page 200.

### Added after M1

- **Fill quality (known-score):** solver now applies the fléchés recognizability
  controls — length-aware floor (slots length >= 4 keep only known-score >= 2,
  dropping score-1 obscurities; 3-letter slots unfloored) + Efraimidis–Spirakis
  weighting `rand^(1/(score·bias+1))`, bias 2.0. Measured: 0 obscure words in any
  4+ slot, avg known-score ~3.2, still 6/6 solved. `getScore` = `known_score`
  (1–5), already baked into the WordList by the corpus loader.
- **Persistence + sharing:** new self-contained `american_crosswords` table
  (`src/db/schema/american-crosswords.ts`) storing the full `AmPuzzle` as JSONB;
  created via `scripts/setup-american-crosswords-table.ts` (raw CREATE TABLE IF
  NOT EXISTS — the repo's safe pattern for the shared Neon branch, NOT db:push).
  `/api/croises/generate` saves + returns a `CROI-` share code (owner attached if
  signed in); `/croises/[code]` rehydrates and renders. Verified: save → share →
  load 200, missing code → 404, row persists intact.

- **Long custom words (theme templates):** the plain templates max out at
  5-letter words, so long personalized words (ANNIVERSAIRE=12, FELICITATIONS=13)
  had nowhere to go. Added a **theme-template library** — `theme-6`..`theme-15`
  in `grid-templates.ts`, each a symmetric PAIR of long across slots of exactly
  that length with short (<=6) fill/crossing runs. `pickTemplate` now selects the
  theme template matching the LONGEST custom word (overriding an explicit size,
  since the word must fit); `placeCustomWords` seats it. Generated + validated via
  a corrected metric that measures ALL runs including the vertical crossings (the
  first pass wrongly excluded theme-crossing downs, leaving unfillable 13-long
  downs). Verified: ANNIVERSAIRE/FELICITATIONS/MAISON + multi-word all 6/6 solved;
  the partner long slot fills with a real word (e.g. PROTESTATION opposite
  ANNIVERSAIRE). Words > 15 letters report as unplaced.

- **PDF export:** `src/lib/crossword-pdf/draw-crossword.ts` +
  `/api/croises/[code]/pdf` render a print-ready A4 PDF — puzzle page (numbered
  grid + 3-column Horizontal/Vertical clue lists) and a solution page (filled
  grid). `?mode=puzzle|solution|both` (default both). Reuses the book engine
  fonts (Barlow letters, Inter clues, Anton headings). Download links on `/croises`
  and `/croises/[code]`. Also fixed: HTML entities in scraped clue text are now
  decoded at generation (`decodeEntities` in generate.ts) — affects screen + PDF.

- **Unified "Mes grilles":** `/mes-grilles` now lists BOTH puzzle types (fléchés
  from `crosswords` + croisés from `american_crosswords`), merged newest-first,
  each card badged "Mots fléchés"/"Mots croisés" and linking to its viewer
  (`/grille/[code]` vs `/croises/[code]`). `GridCard` gained a `kind` prop that
  also picks the delete endpoint; added `DELETE /api/croises/[code]` (owner-checked).
  No separate `/mes-croises` page — one dashboard for both.

### Book / carnet integration (mots croisés pages in the printed book) — DONE

A carnet is an ordered list of grid pages; each page is a fléchés OR a croisés
grid, so "all fléchés / all croisés / mélange" is just page ordering. Every
fléchés seam keys off `kind==="grid"`, so a new `kind==="croises"` + a separate
FK is zero-impact on fléchés.

- **Schema (additive):** `books.puzzle_type` ('fleche'|'croise'|'melange');
  `book_pages.american_crossword_id` FK. Applied via
  `scripts/setup-book-croises-columns.ts` (raw ALTER, shared-branch safe). Types:
  `CroisesPage` in `BookPageData`; `PuzzleType`. Serialize loads croisés pages.
- **PDF:** `compose-croises-page.ts` (title band + numbered grid + auto-fit
  Across/Down columns) + `compose-croises-solutions-page.ts` (tiled filled grids).
  `generate-book.ts` dispatches `kind==="croises"`, appends a croisés solutions
  section, relaxes the empty-book gate, skips the fléchés-only word index when
  empty. Verified by rendering a real A5 interior — matches the carnet style, no
  page-count drift.
- **In-book generation:** `POST /api/books/[code]/croises` (auth + saddle capacity
  gate + position + touch, mirroring the fléchés grids route).
- **Editor:** `CroisesPageView` preview wired into page-slot / book-print-layout /
  rail; croisés properties panel (delete); `AddPage` shows the right grid buttons
  per `puzzleType`; `addCroises` handler.
- **Wizard:** `/livre/nouveau` first step chooses fléchés | croisés | mélange →
  persisted via `POST /api/books` (`puzzleType`). Fléchés keep auto-generation;
  croisés/mélange open in the editor to add grids.

Next up (deferred): storefront product tile for mots croisés; on-screen croisés
solutions preview (the PDF already renders them); mélange auto-generation in the
wizard; English corpus.
Based on a verified deep-research pass (25 confirmed claims, 0 refuted) into how
American crosswords are constructed algorithmically.

## Decisions locked

- **Language:** build the engine on the **existing French corpus first** (mots
  croisés = American grid layout, French words/clues). The engine is
  language-agnostic; English is a later, parallel *data* track (needs a whole new
  scored English word/clue corpus). French-first de-risks the engine with zero
  data work.
- **Codebase:** same repo. American crosswords are a second puzzle *type*, not a
  second app. Reuse auth, the book/PDF pipeline, Lulu/Gelato orders, CMS,
  storefront, worker pool, and the corpus loader.
- **First milestone:** generate + solve one American grid on screen. No DB,
  sharing, or PDF yet.

## The core architectural shift vs. fléchés

American crosswords split into **three decoupled stages**. Our existing CSP fill
engine is stage 3.

1. **Grid construction** — a black-square pattern obeying a fixed rule set.
2. **Theme / custom-word pre-placement** — this is NOT new work: it's the
   existing `placeCustomWords` (crossing-aware backtracking + forward-checking,
   `fleche-vector-gen.ts:871`). For this product the "theme entries" ARE the
   personalized custom words (names, dates, inside jokes) — the gift value-prop
   and the theme mechanism are the same thing.
3. **Autofill** — fill the rest from a score-weighted word list. ← our engine.

### Symmetry policy (decided)

Because the black-square pattern is 180°-symmetric, long slots come in
**symmetric pairs of equal length**. Two tiers:

- **Grid symmetry = HARD.** The black-square pattern is always 180°-rotationally
  symmetric. This is what makes it read as an authentic American crossword.
- **Custom-word placement symmetry = BEST-EFFORT.** Pair up custom words that
  match in length, seat them in symmetric slot pairs; place any leftovers as
  ordinary long fill (not highlighted as theme). Rationale: personalized words
  are arbitrary lengths/counts and won't naturally form equal-length pairs —
  requiring strict symmetric pairs would over-constrain the person entering their
  words. The puzzle still looks fully symmetric because the black squares are.

Template selector does double duty: pick a template whose symmetric long-slot
**pair lengths** cover as many custom words as possible, then hand pairs to
`placeCustomWords`. (Rejected alternative: strict equal-length theme pairs padded
with our own words — purist but user-hostile for personalization.)

Fléchés fuses structure + fill (potence/comb skeleton + interior blue-box
optimizer). American separates them cleanly.

## Grid rules to enforce as HARD constraints (language-agnostic)

Confirmed from the Wisconsin thesis + Qxw guide (both primary sources):

1. Minimum answer length **3** cells (no two-letter words).
2. No fully-void row or column.
3. Full **connectivity** — every white cell reachable from every other via
   orthogonal white paths (no isolated regions).
4. Every white cell **checked** — part of both an Across and a Down word (no
   unchecked "unches"; stricter than British/cryptic grids).
5. **180° rotational symmetry** of the black-square pattern (near-universal
   default).

Widely-cited but NOT independently verified in this pass — confirm before
enforcing as hard limits: 15×15 daily / 21×21 Sunday sizes; word-count caps
(~78 for a 15×15, ~140 for a 21×21 Sunday); black-square ratio ~1/6; "cheater
square" aesthetics.

## Symmetric pattern generation — two approaches

- **Fundamental-region enumeration:** generate only a half-grid (for 180°
  rotation), mirror it, then validate connectivity + min-length on the full
  grid. Odd sizes need special handling of the center row/col/cell. Group-theory
  orthodox; cheap.
- **Curated template library:** what the pros do — Crossword Compiler scans a
  library of pre-validated symmetric grid patterns per size. Often yields better
  fill-success rates for a given word-list density.

**Decision for MVP:** start with a small **curated template library** per size
(a handful of hand-verified valid patterns, e.g. one 11×11 and one 15×15). This
guarantees valid grids and isolates the fill problem so we can prove the engine
first. Add fresh fundamental-region generation as a later enhancement.

## Fill heuristics — what to keep and what to add

Our engine already does the hard part: AC-3 arc-consistency pre-check + MRV slot
ordering + forward checking + index-based domain pruning + familiarity-weighted
selection. The community-standard approach (Qxw, Crossword Compiler, CrossHatch)
is exactly this class — bounded look-ahead / constraint propagation with early
unfillable-region detection. Refinements worth adopting:

- **Two-signal candidate ranking:** rank each slot's candidate words by BOTH
  (a) *fit* — how many crossing completions the choice leaves feasible — and
  (b) *quality score*. We have (b); our forward-checking approximates (a). Make
  the fit term explicit in the ordering.
- **Unranked fast mode:** a toggle that drops heuristics for a quick "any valid
  completion" on hard grids. CrossHatch exposes this.
- **Early unfillable-region detection** before deep backtracking (Qxw's "grey
  question marks propagate"; Crossword Compiler's "pre-filling search"). Our AC-3
  precheck already prunes provably-dead layouts; keep leaning on it.

Dr. Fill (Ginsberg, JAIR — arxiv.org/pdf/1401.4597) models the puzzle as a
singly-weighted CSP; value selection prefers words that fit AND leave crossings
fillable; uses limited-discrepancy search. Worth reading for slot-ordering and
cost-function ideas. (Not fully verified in this research pass.)

## Word-list scoring — 0–100 convention

Community standard (XWord Info FAQ, Crossword Compiler docs — both primary):

- **0–100 scale. 50 = "fine/acceptable" baseline; 60 = genuine asset.** Low
  scores flag weak fill: 25 = hard-to-defend 3–4 letter words, 20 = weak
  5-letter, 15 = random Roman numerals, 10 = vulgar, 5 = editor "puzzle-killers".
- **Only relative ordering matters**, not absolute magnitude. Scores are a *soft
  selection bias*, not just a hard filter — better words get chosen far more
  often.
- Expose a **tunable minimum-score threshold** (optionally per word length).
  Lowering it (25/20/15) permits small "gluey" entries in exchange for more
  colorful overall fill.

**For French:** map our existing corpus signals (`familiarity`, `knownScore`
1–5, `qualityScore`) onto a single 0–100 quality score, with **50 as the default
acceptance floor**. `knownScore`/familiarity map naturally onto the
50=acceptable / 60=asset convention.

## Word-list sourcing (English track, later)

Reuse existing scored community lists rather than rebuilding — Peter Broda
(~427K, scored 1–100), Mark Diehl's trimmed Broda (~251K), christophsjones
(~170K aggregate; caps at 50). For French, replicate the *format/convention*
over our own corpus.

## Interop

Target the Across Lite **.puz** format for import/export. `alexdej/puzpy` (MIT,
Python, round-trips 9700+ real puzzles) or a JS equivalent (`ajhyndman/puz`).
Later win, not MVP.

## Milestone 1 build plan (revised by this research)

1. **Extract the shared CSP solver** out of `fleche-vector-gen.ts` into
   `src/lib/crossword/csp-solver.ts` (`solveFill`, `arcConsistentPrecheck`,
   `pruneDomain`, `buildCrossings`, `selectMRV`, `pickClue`, `DictStats`), with a
   leaner direction-agnostic `Slot`. Fléchés generator imports it unchanged —
   behavior byte-for-byte identical.
2. **`src/lib/crossword/american/`:**
   - `grid-templates.ts` — a small curated library of valid symmetric black-square
     patterns per size (start 11×11, then 15×15), each pre-validated against the
     five hard rules.
   - `slots.ts` — walk a template → `Slot[]` + `Crossing[]` for the shared solver.
   - `numbering.ts` — sequential Across/Down numbers on word-start cells.
   - `generate-crossword.ts` — template → slots → shared solver (reusing
     `WordList` + French corpus loader) → clues via `pickClue`; emit external
     Across/Down clue lists.
3. **`/api/croises/generate`** — server route (corpus is a heavy server-side
   singleton), mirroring `/api/fleche/generate`.
4. **`src/components/crossword/crossword-grid.tsx`** — numbered white cells +
   black blocks + two linked Across/Down clue lists, reusing the
   input/keyboard/autocheck/reveal/persistence logic from `fleche-grid.tsx`.
5. **`/croises` page** — generate one and solve it with autocheck.

Deferred past MVP: theme placement, fresh symmetric-pattern generation, .puz
export, DB persistence + share codes, PDF (`draw-crossword.ts`), storefront
product, English corpus.

## Open questions to resolve before/while building

- Numeric targets (word-count caps, block ratio) — confirm independently.
- Best mapping from French `familiarity`/`knownScore`/`qualityScore` → 0–100, and
  how to identify French "crosswordese" equivalents.
- Fresh-generation vs template-library fill-success tradeoff at our corpus
  density (measure once the engine runs).
