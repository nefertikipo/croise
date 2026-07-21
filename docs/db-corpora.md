# DB corpora (French-only)

The app is **French-only**. There is a single word/clue corpus.

## The French corpus

| Tables | Feature | Shape | Scored? |
|--------|---------|-------|---------|
| `words` + `clues` | `/fleche` (mots fléchés) | Normalized: `clues.word_id → words.id` | ✅ familiarity + quality + difficulty/vibe |

- `words` is 100% French (~83K rows). `clues` has multiple clues per word (~476K rows).
- Grid storage + sharing: `crosswords`, `placed_words`, `books`, `book_pages`. These are
  written by both the `/fleche` generator and the book feature (all `fr`).

## History: the removed English corpus

There used to be a second, independent English corpus — a flat `clue_entries` table
(~341K `en` rows + ~30K leftover `fr`) powering a `/create` mots croisés generator with
black-square grids. In 2026-07 the app was scoped down to French-only: the `/create`
feature, the English generator (`generator.ts`, `load-words.ts`, `patterns.ts`, the
`lib/clues` repository/personalizer), the `/crossword/[code]` viewer, and the
`clue_entries` table + its `placed_words.original_clue_id` FK were all removed.

If English is ever revived, it would be a fresh build — there's no dormant English data
left in the database.
