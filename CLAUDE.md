# Croise - French Crossword Generator

## Project Overview

A French mots fleches/mots croises generator that creates personalized crossword puzzles for printing/gifting. French-first, expanding to English later.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript (strict)
- Tailwind CSS 4 + shadcn/ui
- Neon Postgres + Drizzle ORM
- Vercel AI SDK + AI Gateway (for clue personalization, not yet active)
- pnpm

## Key Architecture

### Database (Neon Postgres)
- `words` table: unique crossword-valid words with quality scores
- `clues` table: multiple clues per word (different difficulties/vibes)
- `clue_entries` table: legacy flat table (being phased out)
- `crosswords`, `placed_words`, `books`: grid storage + sharing via codes

### Crossword Generation
- **Mots fleches generator** (`src/lib/crossword/fleche-generator.ts`): constraint satisfaction + backtracking. Generates dense grids where every letter cell is part of both a horizontal and vertical word. Potence layout (L-shaped clue cell frame).
- **Dense crossword generator** (`src/lib/crossword/generator.ts`): English mots croises style with black square patterns.
- **Word list** (`src/lib/crossword/word-list.ts`): in-memory indexed word list with O(1) constraint lookups by length+position+letter.

### Data Pipeline
- French clues scraped from dico-mots.fr (ongoing, ~10K words so far)
- English clues from xd.saul.pw (341K entries imported)
- Scored English word list from mattabate/wordlist (75K+ words)
- French word list from an-array-of-french-words (336K words)
- Data files in `data/` directory (gitignored, not committed)

### Frontend
- `/fleche` - Mots fleches generator page (French)
- `/create` - English crossword creation wizard
- `/crossword/[code]` - View crossword by shareable code

## Commands

- `pnpm dev` - start dev server
- `pnpm build` - production build
- `pnpm db:push` - sync schema to Neon (dev only)
- `pnpm db:generate` - generate migration files
- `pnpm tsx scripts/scrape-dicomots.ts --concurrency 10` - run French clue scraper
- `pnpm tsx scripts/import-dicomots.ts` - import scraped French clues to DB

## Current Status

- Dense mots fleches grid generation works (constraint satisfaction)
- French clue database being built (scraper running)
- Clue cells with real definitions where available, placeholders for rest
- Next: LLM batch scorer for difficulty/vibe tagging
- Next: custom word placement in mots fleches grids
- Next: PDF export for printing/gifting

## Data Files (not in git)

- `data/french-clues-dicomots.tsv` - scraped French clue-answer pairs
- `data/french-words-full.txt` - 336K French words
- `data/scored-words.txt` - scored English crossword words
- `data/xd/clues.tsv` - English crossword clues from xd.saul.pw
