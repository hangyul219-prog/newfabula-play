# pack.py <cut pieces dir> : cut pieces (png + outlines.json per theme) -> tools/travel_paper/pieces/<theme>/*.webp
import json, pathlib, shutil, sys
from PIL import Image
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
src = pathlib.Path(ARGS[0] if ARGS else r'C:\Users\PC\Downloads\fab_work\travel_paper\pieces')
dst = pathlib.Path(__file__).parent / 'pieces'
# layout: pieces/<skin>/<world>/ (skin = play tool UI theme metaphor|ff|octo, world = core|high|techno|natural)
for t in sorted(p for p in src.glob('*/*') if p.is_dir() and (p / 'outlines.json').exists()):
    o = dst / t.parent.name / t.name; o.mkdir(parents=True, exist_ok=True)
    shutil.copy(t / 'outlines.json', o / 'outlines.json')
    for f in t.glob('*.png'):
        w = o / (f.stem + '.webp')
        if '--force' not in sys.argv and w.exists() and w.stat().st_mtime > f.stat().st_mtime: continue   # unchanged piece
        im = Image.open(f); im.thumbnail((440, 440), Image.LANCZOS); im.save(o / (f.stem + '.webp'), 'WEBP', quality=86, method=4)
    print(t.parent.name, t.name, sum(f.stat().st_size for f in o.glob('*.webp')) // 1024, 'KB')
