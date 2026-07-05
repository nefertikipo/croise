# DB corpora: French vs English (READ THIS BEFORE TOUCHING clue tables)

The word/clue tables in this app are split by **language**, not by "old schema vs new
schema". This is easy to get wrong because the schema once described `clue_entries` as a
"legacy table being phased out" — it is not. Here is the real picture.

## Two independent corpora

| Corpus | Tables | Feature | Shape | Scored? | Size (2026-07) |
|--------|--------|---------|-------|---------|----------------|
| **French** | `words` + `clues` | `/fleche` (mots fléchés) | Normalized: `clues.word_id → words.id` | ✅ familiarity + quality + difficulty/vibe | 83,017 words / 476,462 clues, all `fr` |
| **English** | `clue_entries` | `/create` (mots croisés) | Flat, denormalized (answer+clue on one row) | ❌ 0 rows have difficulty | 341,007 `en` (+ 29,824 leftover `fr`) |

- `clues` covers 82,601 of the 83,017 French words (~99.5%).
- `words` is **100% French**. `clue_entries` is **mostly English**.
- The two sets overlap by only ~36K strings, mostly coincidence (short tokens valid in
  both languages, plus the ~30K leftover French rows that still live in `clue_entries`).

## What this means

- ❌ **Do NOT** "migrate `clue_entries` into `words`/`clues` and drop it." They are not two
  copies of the same data. Dropping `clue_entries` deletes the entire English corpus.
- ✅ The French pipeline is the modernized one (normalized + scored). The English pipeline
  is still on the flat, unscored table.
- The scoring work (difficulty/vibe/familiarity) currently targets the **French**
  `words`/`clues` tables only.

## Known follow-ups (not yet done)

- **English never normalized.** If we want the English `/create` pipeline to get the same
  normalized + scored treatment as French, that's a real project: import `clue_entries`
  into `words`/`clues` shape. Until then `clue_entries` stays as-is.
- **`words`/`clues` not registered in the Drizzle client.** `src/db/index.ts` only imports
  `clueEntries`, `crosswords`, `placedWords`, `books`. The French `words`/`clues` tables
  exist and are populated but aren't wired into the typed client yet — anything reading
  them goes around Drizzle. Wire them in when the French read path moves onto them.
- **Leftover ~30K French rows in `clue_entries`.** Decide whether to fold them into
  `words`/`clues` or leave them; they're a minor inconsistency, not urgent.

_Row counts above were measured live on 2026-07-05; treat them as approximate._
