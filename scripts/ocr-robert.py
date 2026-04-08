"""
OCR the Robert des jeux de lettres PDF to extract crossword-valid words.
Converts pages to images, runs Tesseract with French, extracts uppercase words.

Usage: python3 scripts/ocr-robert.py
"""

import sys
sys.path.insert(0, '/Users/louisetexier/Library/Python/3.9/lib/python/site-packages')

import fitz  # PyMuPDF
import subprocess
import re
import os
import unicodedata
from collections import Counter
from pathlib import Path

# Find the PDF
downloads = Path.home() / "Downloads"
pdf_files = list(downloads.glob("Le Robert des jeux de lettres*"))
if not pdf_files:
    print("Robert PDF not found in Downloads")
    sys.exit(1)
pdf_path = pdf_files[0]
print(f"PDF: {pdf_path.name}")

output_file = Path("data/robert-ocr-words.txt")
doc = fitz.open(str(pdf_path))
total_pages = len(doc)
print(f"Total pages: {total_pages}")

# The word listings start around page 12 and go to ~1050
# Skip preface (pages 1-11) and annexes at the end
START_PAGE = 11
END_PAGE = min(total_pages, 1060)

all_words = set()
proper_nouns = set()

def normalize(word):
    """Remove accents, uppercase, strip non-alpha."""
    nfkd = unicodedata.normalize('NFD', word)
    stripped = ''.join(c for c in nfkd if unicodedata.category(c) != 'Mn')
    return stripped.upper().strip()

def is_valid_word(w):
    """Filter OCR garbage."""
    if len(w) < 2 or len(w) > 15:
        return False
    if not re.match(r'^[A-Z]+$', w):
        return False
    # No 3+ consecutive same letters
    if re.search(r'(.)\1\1', w):
        return False
    # Must have vowels (at least 1 for short words, more for long)
    vowels = sum(1 for c in w if c in 'AEIOUY')
    if len(w) >= 4 and vowels == 0:
        return False
    if len(w) >= 7 and vowels < 2:
        return False
    # No 5+ consecutive consonants
    if re.search(r'[BCDFGHJKLMNPQRSTVWXZ]{5,}', w):
        return False
    return True

# Process pages in batches
BATCH = 20
for batch_start in range(START_PAGE, END_PAGE, BATCH):
    batch_end = min(batch_start + BATCH, END_PAGE)
    batch_words = set()

    for page_num in range(batch_start, batch_end):
        page = doc[page_num]

        # Render page to high-res image
        mat = fitz.Matrix(3, 3)  # 3x zoom for better OCR
        pix = page.get_pixmap(matrix=mat)
        img_path = f"/tmp/robert_page_{page_num}.png"
        pix.save(img_path)

        # OCR with Tesseract (French) — output to temp file to avoid binary encoding issues
        txt_path = f"/tmp/robert_page_{page_num}"
        try:
            subprocess.run(
                ["tesseract", img_path, txt_path, "-l", "fra", "--psm", "6"],
                capture_output=True, timeout=30
            )
            text = open(txt_path + ".txt", "r", encoding="utf-8", errors="ignore").read()
            os.remove(txt_path + ".txt")
        except (subprocess.TimeoutExpired, FileNotFoundError):
            text = ""
        finally:
            if os.path.exists(img_path):
                os.remove(img_path)

        # Extract words: the book lists words in columns, one per line
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue

            # The book uses SMALL CAPS for common words and BOLD for proper nouns
            # After OCR, they all come out as text. Split on whitespace.
            for token in line.split():
                word = normalize(token)
                if is_valid_word(word):
                    batch_words.add(word)

    all_words.update(batch_words)
    pct = (batch_end - START_PAGE) / (END_PAGE - START_PAGE) * 100
    print(f"\r  Pages {batch_start}-{batch_end}/{END_PAGE} | {len(all_words)} unique words ({pct:.0f}%)", end="", flush=True)

print(f"\n\nTotal unique words extracted: {len(all_words)}")

# Load existing dictionary to find NEW words
existing = set()
dict_path = Path("data/french-words-full.txt")
if dict_path.exists():
    for line in dict_path.read_text().split('\n'):
        w = normalize(line.strip())
        if w:
            existing.add(w)

# Also load dico-mots words
deduped_path = Path("data/french-clues-deduped.tsv")
if deduped_path.exists():
    for line in deduped_path.read_text().split('\n')[1:]:
        tab = line.find('\t')
        if tab > 0:
            existing.add(normalize(line[:tab]))

new_words = all_words - existing
print(f"Already in dictionary: {len(all_words & existing)}")
print(f"NEW words: {len(new_words)}")

# Save all OCR'd words
with open(output_file, 'w') as f:
    for w in sorted(all_words):
        f.write(w + '\n')
print(f"All words saved to {output_file}")

# Save just new words
new_file = Path("data/robert-new-words.txt")
with open(new_file, 'w') as f:
    for w in sorted(new_words):
        f.write(w + '\n')
print(f"New words saved to {new_file}")

# Length distribution
lengths = Counter(len(w) for w in all_words)
print("\nLength distribution:")
for l in sorted(lengths):
    print(f"  {l} letters: {lengths[l]}")

# Sample new words
samples = sorted(new_words)
print(f"\nSample new words (first 30):")
for s in samples[:30]:
    print(f"  {s}")
