"""Cuts the brand artwork into `src/components/brand/art.ts`.

The seal's three characters come from Zen Antique's outlines; everything else (the seal's
edge, the brush rule, the veil's hem, the tear) is procedural from fixed seeds, so re-running
gives byte-identical output.

This is a tool for whoever changes the artwork, NOT part of the build. Nothing in `npm` runs
it, the app does not need Python, and the file it writes is checked in.

    pip install fonttools brotli
    npm pack @fontsource/zen-antique        # then unpack the .tgz somewhere
    python scripts/brand/make_art.py \
        <unpacked>/package/files/zen-antique-japanese-400-normal.woff2 \
        src/components/brand/art.ts

Zen Antique is (c) 2021 The Zen Antique Project Authors, SIL Open Font Licence 1.1. The
licence is in `src/assets/fonts/ZenAntique-OFL.txt`.
"""
import sys, math, random, pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

font_path, out_path = sys.argv[1], sys.argv[2]
font = TTFont(font_path)
gs = font.getGlyphSet(); cmap = font.getBestCmap()
K = 0.1                       # font units -> viewBox units
PAD_X, PAD_Y, PITCH = 170, 190, 985
W = 1000 + 2 * PAD_X
H = 3 * PITCH + 2 * PAD_Y - (PITCH - 1000) * 0 - 15

def n(v): 
    s = f'{v:.1f}'.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

def glyph_path(ch, index):
    g = gs[cmap[ord(ch)]]
    bp = BoundsPen(gs); g.draw(bp); xmin, ymin, xmax, ymax = bp.bounds
    cx, cy = (xmin + xmax) / 2, (ymin + ymax) / 2
    cell_cy = PAD_Y + index * PITCH + 500 - 8
    # x' = (x - cx + W/2) * K ; y' = (cell_cy - (y - cy)) * K   (flip: font y is up)
    pen = SVGPathPen(gs, ntos=n)
    tp = TransformPen(pen, (K, 0, 0, -K, (W / 2 - cx) * K, (cell_cy + cy) * K))
    g.draw(tp)
    return pen.getCommands()

glyphs = ''.join(glyph_path(ch, i) for i, ch in enumerate('次世代'))

def smooth_noise(rng, count, amp, passes=3):
    vals = [rng.uniform(-amp, amp) for _ in range(count)]
    for _ in range(passes):
        vals = [(vals[i - 1] + 2 * vals[i] + vals[(i + 1) % count]) / 4 for i in range(count)]
    return vals

def rough_rect(w, h, r, step, amp, seed):
    """A rounded rectangle whose edge wanders, the way a stamped edge does."""
    rng = random.Random(seed); pts = []
    def arc(cx, cy, a0, a1):
        length = abs(a1 - a0) * r; k = max(3, int(length / step))
        for i in range(k):
            a = a0 + (a1 - a0) * i / k
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a), math.cos(a), math.sin(a)))
    def line(x0, y0, x1, y1, nx, ny):
        length = math.hypot(x1 - x0, y1 - y0); k = max(2, int(length / step))
        for i in range(k):
            t = i / k; pts.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, nx, ny))
    line(r, 0, w - r, 0, 0, -1);            arc(w - r, r, -math.pi / 2, 0)
    line(w, r, w, h - r, 1, 0);             arc(w - r, h - r, 0, math.pi / 2)
    line(w - r, h, r, h, 0, 1);             arc(r, h - r, math.pi / 2, math.pi)
    line(0, h - r, 0, r, -1, 0);            arc(r, r, math.pi, 1.5 * math.pi)
    noise = smooth_noise(rng, len(pts), amp)
    out = [(x + nx * d, y + ny * d) for (x, y, nx, ny), d in zip(pts, noise)]
    return 'M' + 'L'.join(f'{n(x * K)} {n(y * K)}' for x, y in out) + 'Z'

body = rough_rect(W, H, 90, 46, 13, seed=2026)

def brush_rule(seed=11):
    """A dry-brush line, 1000 x 12: loaded at the left, starved and splitting at the right."""
    rng = random.Random(seed); N = 64
    top = smooth_noise(rng, N, 1.6, 2); bot = smooth_noise(rng, N, 1.6, 2)
    def half(i):                       # thickness profile: quick swell, long taper
        t = i / (N - 1)
        return 0.6 + 4.4 * min(1, t / 0.035) * (1 - t) ** 0.55
    up = [(1000 * i / (N - 1), 6 - half(i) + top[i] * (0.35 + i / N)) for i in range(N)]
    dn = [(1000 * i / (N - 1), 6 + half(i) + bot[i] * (0.35 + i / N)) for i in range(N)]
    d = 'M' + 'L'.join(f'{n(x)} {n(y)}' for x, y in up) + 'L' + 'L'.join(f'{n(x)} {n(y)}' for x, y in reversed(dn)) + 'Z'
    # Two bristle streaks that break away near the starved end.
    for (x0, x1, y, th) in ((700, 965, 2.4, 0.5), (780, 990, 9.6, 0.4)):
        d += f'M{x0} {n(y)}L{x1} {n(y - 0.5)}L{x1} {n(y - 0.5 + th)}L{x0} {n(y + th + 0.3)}Z'
    return d

def brush_tick(seed=5):
    """A single vertical dab, 6 x 20, for the place you are in the sidebar."""
    rng = random.Random(seed); N = 14
    l = smooth_noise(rng, N, 0.35, 1); r = smooth_noise(rng, N, 0.35, 1)
    def half(i):
        t = i / (N - 1); return 0.5 + 2.2 * math.sin(math.pi * min(1, t * 1.25)) ** 0.8 * (1 - 0.35 * t)
    left = [(3 - half(i) + l[i], 20 * i / (N - 1)) for i in range(N)]
    right = [(3 + half(i) + r[i], 20 * i / (N - 1)) for i in range(N)]
    return 'M' + 'L'.join(f'{n(x)} {n(y)}' for x, y in left) + 'L' + 'L'.join(f'{n(x)} {n(y)}' for x, y in reversed(right)) + 'Z'

def veil_hem(seed=77):
    """The lower edge of the curtain, 1000 x 60: ink that hangs and drips rather than a ruled line."""
    rng = random.Random(seed); N = 200
    base = smooth_noise(rng, N, 7, 5)
    # A drip is round at the tip and steep at the sides — an ellipse, not a spike. The first
    # version used a gaussian and read as a heartbeat trace.
    drips = [(rng.randrange(10, N - 10), rng.uniform(3.2, 5.5), rng.uniform(12, 30)) for _ in range(7)]
    ys = []
    for i in range(N):
        y = 14 + base[i] + 3.5 * math.sin(i / N * math.pi * 5)
        for at, w, depth in drips:
            d = abs(i - at) / w
            if d < 1: y += depth * (1 - d * d) ** 0.7
        ys.append(y)
    for _ in range(2):
        ys = [(ys[max(i - 1, 0)] + 2 * ys[i] + ys[min(i + 1, N - 1)]) / 4 for i in range(N)]
    edge = [(1000 * i / (N - 1), ys[i]) for i in range(N)]
    line = 'M' + 'L'.join(f'{n(x)} {n(y)}' for x, y in edge)
    fill = 'M0 0L' + 'L'.join(f'{n(x)} {n(y)}' for x, y in edge) + 'L1000 0Z'
    return fill, line

def tear(seed=31):
    """The line a strip of paper tears along, as two complementary clip-path polygons."""
    rng = random.Random(seed); N = 22
    xs = [50 + rng.uniform(-3.2, 3.2) for _ in range(N + 1)]
    pts = [(xs[i], 100 * i / N) for i in range(N + 1)]
    mid = ', '.join(f'{n(x)}% {n(y)}%' for x, y in pts)
    rev = ', '.join(f'{n(x)}% {n(y)}%' for x, y in reversed(pts))
    return f'polygon(0% 0%, {mid}, 0% 100%)', f'polygon(100% 0%, 100% 100%, {rev})'

hem_fill, hem_line = veil_hem(); tear_l, tear_r = tear()
out = f'''/**
 * The brand artwork, as path data.
 *
 * ⚠️ **Generated, then pasted — do not hand-edit the numbers.** Two sources:
 *
 * - `SEAL_GLYPHS` are the outlines of 次世代 ("next generation" — the server's own name) from
 *   **Zen Antique** (© 2021 The Zen Antique Project Authors, SIL Open Font Licence 1.1; the
 *   licence sits in `src/assets/fonts/ZenAntique-OFL.txt`). Flipped, scaled by 0.1 and stacked
 *   vertically. They are artwork here, not a font: three glyphs as shapes, which is what lets
 *   them be knocked out of the seal and drawn at any size with no Japanese font file shipped
 *   (the full one is 2 MB, and the system one is not guaranteed on an English install).
 * - Everything else is procedural from fixed seeds — an edge that wanders the way a stamped
 *   edge does, a dry-brush line, a dab, a hem that drips, a tear. Same seeds, same bytes.
 *
 * No colour appears anywhere in this file and none may (CLAUDE.md §9): every shape is filled
 * with `currentColor` by the component that draws it, so a theme change repaints all of it.
 */

export const SEAL_VIEWBOX = '0 0 {n(W * K)} {n(H * K)}';
export const SEAL_WIDTH = {n(W * K)};
export const SEAL_HEIGHT = {n(H * K)};

/** The stamped body: a rounded rectangle whose edge is not quite straight. */
export const SEAL_BODY =
  '{body}';

/** 次世代, top to bottom, in the seal's own coordinates. */
export const SEAL_GLYPHS =
  '{glyphs}';

/** A dry-brush rule. viewBox 0 0 1000 12; stretch it with preserveAspectRatio="none". */
export const BRUSH_RULE =
  '{brush_rule()}';

/** One vertical dab. viewBox 0 0 6 20. */
export const BRUSH_TICK =
  '{brush_tick()}';

/** The curtain's lower edge. viewBox 0 0 1000 60: the filled drape, and the line along its hem. */
export const VEIL_HEM_FILL =
  '{hem_fill}';
export const VEIL_HEM_LINE =
  '{hem_line}';

/** A tear down a strip of paper, as two halves that fit together. CSS `clip-path` values. */
export const TEAR_LEFT =
  '{tear_l}';
export const TEAR_RIGHT =
  '{tear_r}';
'''
pathlib.Path(out_path).write_text(out, encoding='utf-8')
print('wrote', out_path, len(out), 'bytes;', 'seal', n(W*K), 'x', n(H*K))
