# cut.py <sheet.png> <theme> name1 name2 ...  -> pieces/<theme>/<name>.png (alpha) + pieces/<theme>/outlines.json
# GPT sheet on flat magenta: key it out, find each piece (connected parts), order them row by row, crop,
# flatten the base (the fold line), and trace a simplified die-cut outline (units: height 1, base centre at 0,0).
import sys, json, pathlib
import numpy as np, cv2
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith('--')]
MARGIN = float(next((a[9:] for a in sys.argv[1:] if a.startswith('--margin=')), 0.014))
GROW = int(next((a[7:] for a in sys.argv[1:] if a.startswith('--grow=')), 7))
src, theme, names = args[0], args[1], args[2:]
out = pathlib.Path(__file__).with_name('pieces') / theme
out.mkdir(parents=True, exist_ok=True)
im = np.array(Image.open(src).convert('RGB')).astype(np.int32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
# magenta-ness: high r and b, low g
mag = np.minimum(r, b) - g
key = (mag > 70)
alpha = np.where(key, 0, 255).astype(np.uint8)
# soft edge: partially magenta pixels get partial alpha
soft = np.clip((mag - 30) / 40.0, 0, 1)
alpha = np.minimum(alpha, (255 * (1 - soft)).astype(np.uint8))
alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
# despill everywhere: any magenta cast (red AND blue both above green) is pulled back toward the green level
rgb = im.copy()
spill = np.clip(np.minimum(r, b) - g - 8, 0, None)
rgb[..., 0] = r - spill * 0.85; rgb[..., 2] = b - spill * 0.85
rgb = np.clip(rgb, 0, 255).astype(np.uint8)

solid = (alpha > 128).astype(np.uint8)
grow = cv2.dilate(solid, np.ones((GROW, GROW), np.uint8))  # join a piece's own islands (leaves, flowers)
n, lab, st, cen = cv2.connectedComponentsWithStats(grow)
H, W = solid.shape
# pieces = the big islands; every small island (a floating petal, a spark, a puff of smoke) joins the nearest piece
big = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > W * H * 0.004]
if len(big) != len(names):
    print('found', len(big), 'pieces, expected', len(names), [tuple(st[i, :4]) for i in big])
owner = np.arange(n)
for i in range(1, n):
    if i in big or st[i, cv2.CC_STAT_AREA] < 30: continue
    cx, cy = cen[i]
    def gap(j):
        x, y, w, h = st[j, :4]; return max(x - cx, 0, cx - (x + w)) + max(y - cy, 0, cy - (y + h))
    j = min(big, key=gap)
    if gap(j) < W * 0.08: owner[i] = j
lab = owner[lab]
for j in big:
    ys, xs = np.nonzero((lab == j) & (solid > 0)); st[j, :4] = [xs.min(), ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1]
# row-major order: rows by centroid y (cluster by gaps), then x
comps = sorted(big, key=lambda i: cen[i][1])
rows, cur = [], [comps[0]]
for i in comps[1:]:
    if cen[i][1] - cen[cur[-1]][1] > H * 0.12: rows.append(cur); cur = [i]
    else: cur.append(i)
rows.append(cur)
order = [i for row in rows for i in sorted(row, key=lambda i: cen[i][0])]
meta = {}
for name, i in zip(names, order):
    x, y, w, h = st[i, :4]
    m = ((lab[y:y + h, x:x + w] == i) & (solid[y:y + h, x:x + w] > 0))
    ys, xs = np.nonzero(m)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    a = (alpha[y:y + h, x:x + w] * m)[y0:y1, x0:x1].astype(np.uint8)
    c = rgb[y:y + h, x:x + w][y0:y1, x0:x1]
    P0 = max(3, int(a.shape[0] * MARGIN)) + 2
    a = np.pad(a, ((P0, 0), (P0, P0))); c = np.pad(c, ((P0, 0), (P0, P0), (0, 0)), mode='edge')
    hh, ww = a.shape
    # base: the lowest ~2 % rows are cut flat (a straight fold line across the piece's foot)
    cut = max(2, int(hh * 0.02)); a[hh - cut:] = 0; a = a[:hh - cut]; c = c[:hh - cut]; hh -= cut
    foot = np.nonzero(a[-1] > 128)[0]
    fx0, fx1 = (foot.min(), foot.max()) if len(foot) else (0, ww - 1)
    # outline from a slightly closed mask (no tiny notches), simplified
    # die-cut with a thin parchment margin round the art (fine twigs and grass blades stay on the card): grow the
    # silhouette, then close it so the knife never follows a single blade
    m0 = (a > 100).astype(np.uint8); mg = max(3, int(hh * MARGIN))
    pad = mg * 3
    mk = np.pad(m0, pad)
    mk = cv2.dilate(mk, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * mg + 1, 2 * mg + 1)))
    mk = cv2.morphologyEx(mk, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (6 * mg + 1, 6 * mg + 1)))
    mk = mk[pad:-pad, pad:-pad]
    mk[-1:] = mk[-1:]  # base stays at the bottom row
    mk = np.pad(mk, 1)
    cs, hier = cv2.findContours(mk, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    outer = [k for k in range(len(cs)) if hier[0][k][3] < 0]
    ko = max(outer, key=lambda k: cv2.contourArea(cs[k])); cnt = cs[ko]
    # big see-through openings (an arch, the gap under a wagon) are cut out of the card too
    holes = []
    for k in range(len(cs)):
        if hier[0][k][3] == ko and cv2.contourArea(cs[k]) > hh * hh * 0.004:
            hp = cv2.approxPolyDP(cs[k], max(1.5, hh * 0.006), True)[:, 0, :] - 1
            if len(hp) >= 3: holes.append([[round((float(px) - ww / 2) / hh, 4), round((hh - float(py)) / hh, 4)] for px, py in hp])
    ap = cv2.approxPolyDP(cnt, max(1.5, hh * 0.006), True)[:, 0, :] - 1
    pts = [[(float(px) - ww / 2) / hh, (hh - float(py)) / hh] for px, py in ap]
    pts = [[round(px, 4), round(max(0.0, py if py > 0.012 else 0.0), 4)] for px, py in pts]
    if pts[0] == pts[-1]: pts.pop()
    pts.reverse()  # counter-clockwise with y up
    img = Image.fromarray(np.dstack([c, a]), 'RGBA')
    s = 512 / max(ww, hh)
    if s < 1: img = img.resize((max(1, int(ww * s)), max(1, int(hh * s))), Image.LANCZOS)
    img.save(out / f'{name}.png')
    meta[name] = {'aspect': round(ww / hh, 4), 'pts': pts, **({'holes': holes} if holes else {})}
    print(name, (ww, hh), len(pts), 'pts')
mf = out / 'outlines.json'
old = json.loads(mf.read_text()) if mf.exists() else {}
old.update(meta); mf.write_text(json.dumps(old))
