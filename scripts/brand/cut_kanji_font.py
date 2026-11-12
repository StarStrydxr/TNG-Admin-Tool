"""Cuts the kanji the interface prints out of Zen Antique, as one small woff2.

The Jujutsu interface letters each page with two kanji. The whole face is 2 MB; this keeps
only the characters listed in `KANJI_SUBSET` in `src/domain/shell.ts` (thirty of them, about
11 KB) and writes `src/assets/fonts/zen-antique-kanji-400-normal.woff2`.

That constant is the single list. This script READS it, the app builds the font's
`unicode-range` from it, and a test holds every page's kanji to it — so adding a character is:
add it to `KANJI_SUBSET`, run this, commit both.

A tool for whoever changes the kanji, NOT part of the build. Nothing in `npm` runs it and the
app does not need Python.

    pip install fonttools brotli
    npm pack @fontsource/zen-antique        # then unpack the .tgz somewhere
    python scripts/brand/cut_kanji_font.py \
        <unpacked>/package/files/zen-antique-japanese-400-normal.woff2

Zen Antique is (c) 2021 The Zen Antique Project Authors, SIL Open Font Licence 1.1 — which
permits exactly this — and declares no Reserved Font Name, so the subset keeps the family's
name. The licence is in `src/assets/fonts/ZenAntique-OFL.txt` and must ship with it.
"""
import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
SHELL = ROOT / 'src' / 'domain' / 'shell.ts'
OUT = ROOT / 'src' / 'assets' / 'fonts' / 'zen-antique-kanji-400-normal.woff2'

if len(sys.argv) != 2:
    sys.exit('usage: cut_kanji_font.py <zen-antique-japanese-400-normal.woff2>')

match = re.search(r"export const KANJI_SUBSET = '([^']+)';", SHELL.read_text(encoding='utf-8'))
if not match:
    sys.exit(f'Could not find KANJI_SUBSET in {SHELL}')
wanted = sorted(set(match.group(1)))

font = TTFont(sys.argv[1])
have = font.getBestCmap()
missing = [c for c in wanted if ord(c) not in have]
if missing:
    sys.exit(f'The source font has no glyph for: {"".join(missing)}')

options = subset.Options()
options.layout_features = []      # stacked one per line by the page; no shaping is needed
options.hinting = False
options.notdef_outline = True
options.name_IDs = [1, 2, 3, 4, 6]
cutter = subset.Subsetter(options)
cutter.populate(unicodes=[ord(c) for c in wanted])
cutter.subset(font)

font.flavor = 'woff2'
font.recalcTimestamp = False      # same input, same bytes
font.save(OUT)

check = TTFont(OUT).getBestCmap()
assert all(ord(c) in check for c in wanted)
print(f'{OUT.relative_to(ROOT)}: {OUT.stat().st_size} bytes, {len(wanted)} characters')
