# Mots Fleches Grid Rules

## Grid Structure

- Standard format: 11 columns x 17 rows (portrait)
- Every cell is either a **clue cell** or a **letter cell**. No empty cells.
- Every letter cell is part of at least one horizontal word AND at least one vertical word.
- All words are 3+ letters.

## Potence (L-shaped frame)

- **Row 0 (top)**: alternating clue/letter. Even columns (0,2,4,...) are clue cells. Odd columns (1,3,5,...) are letter cells.
- **Column 0 (left)**: alternating clue/letter. Even rows (0,2,4,...) are clue cells. Odd rows (1,3,5,...) are letter cells.
- Cell (0,0) is always a clue cell.

### Potence clue assignments

- Top row clue at col C defines a vertical word in col C+1 (going down).
- Left column clue at row R defines a horizontal word on row R+1 (going right).
- Potence clue cells often have 2 clues (one for each direction).

## Interior Clue Cells

- Placed at word boundaries (where a word ends and the next begins).
- **NEVER adjacent** to another interior clue cell (up, down, left, right).
  - Exception: potence cells (row 0 or col 0) are exempt from this rule.
- Can hold 1 or 2 clues:
  - 1 clue: points right (►) or down (▼)
  - 2 clues: one ► and one ▼, or two in the same direction for different words

## Clue Arrows

- **►** (right arrow): the answer starts to the RIGHT of this clue cell
- **▼** (down arrow): the answer starts BELOW this clue cell
- For dual clue cells with 2 clues:
  - ► on top = answer is to the right on this row
  - ▼ on bottom = answer is below (next row or next column)
  - Sorted: ► always on top, ▼ always on bottom

## Word Placement

- Every word must have a clue cell pointing to it.
- Words start immediately after a clue cell (to the right for ►, below for ▼).
- No word can contain the clue text as a substring.
- Words come from the scraped crossword clue database (real French crossword words with real clues).

## Clue Quality

- Every word should have a real crossword clue (not just the word itself).
- Multiple clue variants per word enable different difficulty levels.
- Clues should be concise (under 40 characters) to fit in cells.
- No clue should contain the answer word.

## Grid Quality Checklist

1. Zero empty cells
2. Zero orphan clue cells (every clue cell has at least one arrow/clue)
3. Zero adjacent interior clue cells
4. Every horizontal letter sequence (3+) is a real dictionary word
5. Every vertical letter sequence (3+) is a real dictionary word
6. Every word has a real clue from the database
7. Proper alternating potence in row 0 and column 0
