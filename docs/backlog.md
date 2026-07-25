# Backlog

Ideas we've agreed are worth doing but haven't built. Not a promise, not prioritized
here — just captured so they don't get lost. Newest at the top.

## Collaborative clue-idea notepad (group-gift contributions)

**Status:** not built. The building blocks shipped in #58 (category + author on each
`ClueIdea`); this is the next step that makes them pay off.

### Why

A personalized book is often a **group gift** — the source data for Elise's 25th is a
shared spreadsheet with `Word / Clue / Catégorie / Author`, where friends crowdsourced
inside jokes tagged by who wrote them and which crew (HEC, Fasny, LSE, Famille…). The
notepad's `category` + `author` fields already model exactly that. The natural next move
is to let friends contribute **in-app** instead of via a Google Sheet that one person
re-types.

The strongest framing: **contributors don't need to know anything about crosswords.** They
drop `mot + indice + prénom (+ catégorie)`, and the book owner composes grids from the
pile. The hard/creative part (jokes) is crowdsourced; the fiddly part (grids) stays with
one person. Author attribution could even become a printed credit ("indice proposé par
Théo").

### Shape of a v1

- A **shareable contribute-only link** (reuse the book `code` / share-code pattern), no
  auth for contributors.
- A stripped page that only appends ideas (`mot + indice + prénom + catégorie`) — no
  access to the book layout, other pages, or existing ideas' edit/delete.
- The owner curates and places ideas in the editor exactly as today.

### The blocker that makes this a feature, not a tweak

The notepad currently saves as a **debounced full-array PATCH** of `books.clueIdeas`
(last-write-wins). Two contributors adding at once — or a contributor while the owner
edits — would clobber each other. A real multi-writer surface needs **append-style writes**
(add a single idea server-side), not replace-the-whole-array. That's the core work.

### Honest caveats

- **Adoption is a minority.** Casual makers won't categorize or invite contributors; this
  is a power-user / elaborate-book feature. That's fine if it stays zero-friction and
  optional, but don't promote it to the front of the flow.
- **It has to beat a shared sheet.** We already collaborate out-of-app (WhatsApp / Google
  Sheet → paste). The in-app win is real (no re-typing, words flow straight into grids with
  attribution + usage tracking, contributors need zero crossword knowledge) but not
  overwhelming — build it only if it's clearly lighter than a sheet.
- Needs light anti-abuse on the public write endpoint (rate limit, owner can delete).
