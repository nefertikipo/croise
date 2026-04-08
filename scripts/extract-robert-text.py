"""
Extract words from the Robert PDF's embedded text layer.
No OCR needed — the PDF has text, just garbled by columnar layout.
We extract everything, then filter aggressively for valid French words.
"""

import sys
sys.path.insert(0, '/Users/louisetexier/Library/Python/3.9/lib/python/site-packages')

import fitz
import re
import unicodedata
from collections import Counter
from pathlib import Path

pdf_files = list(Path.home().joinpath("Downloads").glob("Le Robert des jeux de lettres*"))
doc = fitz.open(str(pdf_files[0]))
print(f"PDF: {pdf_files[0].name} ({len(doc)} pages)")

# Load existing words for comparison
existing = set()
dict_path = Path("data/french-words-full.txt")
if dict_path.exists():
    for line in dict_path.read_text().split('\n'):
        w = line.strip().upper()
        w = unicodedata.normalize('NFD', w)
        w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
        w = re.sub(r'[^A-Z]', '', w)
        if w:
            existing.add(w)

deduped_path = Path("data/french-clues-deduped.tsv")
if deduped_path.exists():
    for line in deduped_path.read_text().split('\n')[1:]:
        tab = line.find('\t')
        if tab > 0:
            w = line[:tab].strip().upper()
            w = unicodedata.normalize('NFD', w)
            w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
            if w:
                existing.add(w)

print(f"Existing words: {len(existing)}")

def normalize(word):
    nfkd = unicodedata.normalize('NFD', word)
    stripped = ''.join(c for c in nfkd if unicodedata.category(c) != 'Mn')
    return stripped.upper().strip()

def is_valid_word(w):
    if len(w) < 2 or len(w) > 15:
        return False
    if not re.match(r'^[A-Z]+$', w):
        return False
    if re.search(r'(.)\1\1', w):
        return False
    vowels = sum(1 for c in w if c in 'AEIOUY')
    if len(w) >= 4 and vowels == 0:
        return False
    if len(w) >= 7 and vowels < 2:
        return False
    if re.search(r'[BCDFGHJKLMNPQRSTVWXZ]{5,}', w):
        return False
    return True

all_words = set()

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text("text")

    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue
        # Try the whole line as a word
        word = normalize(line)
        if is_valid_word(word):
            all_words.add(word)
        # Also split on spaces (some lines have multiple words)
        for token in line.split():
            word = normalize(token)
            if is_valid_word(word):
                all_words.add(word)

    if (page_num + 1) % 100 == 0:
        print(f"\r  Page {page_num + 1}/{len(doc)} | {len(all_words)} words", end="", flush=True)

print(f"\n\nTotal unique valid words: {len(all_words)}")

new_words = all_words - existing
print(f"Already known: {len(all_words & existing)}")
print(f"NEW words: {len(new_words)}")

# Save
with open("data/robert-words.txt", 'w') as f:
    for w in sorted(all_words):
        f.write(w + '\n')

with open("data/robert-new-words.txt", 'w') as f:
    for w in sorted(new_words):
        f.write(w + '\n')

print(f"\nAll words: data/robert-words.txt")
print(f"New words: data/robert-new-words.txt")

# Length distribution
lengths = Counter(len(w) for w in all_words)
print("\nLength distribution:")
for l in sorted(lengths):
    print(f"  {l} letters: {lengths[l]}")

# Sample new words
samples = sorted(new_words)
if samples:
    print(f"\nSample new words:")
    for s in samples[:40]:
        print(f"  {s}")
