# Croise

Generateur de mots fleches et mots croises personnalises. Creez des grilles avec vos propres mots et indices, exportez en PDF pour offrir.

## Setup

```bash
pnpm install

# Create .env.local with your Neon database URL
echo "DATABASE_URL=your_neon_url" > .env.local

# Push database schema
pnpm db:push

# Download data files (not in git)
mkdir -p data

# French word list
curl -sL "https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json" \
  | python3 -c "import sys,json; [print(w) for w in json.load(sys.stdin)]" > data/french-words-full.txt

# English scored word list
curl -sL "https://raw.githubusercontent.com/mattabate/wordlist/main/quickstart/matts_wordlist.txt" \
  > data/scored-words.txt

# Run French clue scraper (takes several hours, saves progress)
pnpm tsx scripts/scrape-dicomots.ts --concurrency 10

# Import scraped clues into database
pnpm tsx scripts/import-dicomots.ts

# Start dev server
pnpm dev
```

## Pages

- `/fleche` - Mots fleches generator (French)
- `/create` - Crossword creation wizard (English)
- `/crossword/[code]` - View crossword by shareable code
