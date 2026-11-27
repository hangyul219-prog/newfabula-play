# apply.py [index.html] : put the paper travel map into the play tool (idempotent).
#  - importmap: three (CDN) + the paper kit + travel3d.js as data: modules (loaded only when the travel tab opens)
#  - <script type="application/json" id="tpaper-data">: the GPT die-cut pieces per print set (webp) + their cut outlines
#  - CSS + glue (glue.js) at the end of the body
# pieces/<theme>/*.webp + outlines.json come from pack.py (GPT sheets cut by fab_work/travel_paper/cut.py)
import base64, json, pathlib, re, sys
HERE = pathlib.Path(__file__).parent
target = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else HERE.parent.parent / 'index.html')
html = target.read_text(encoding='utf-8')

def b64(s): return base64.b64encode(s.encode('utf-8')).decode()
def mod(path, rewrite):
    src = (HERE / path).read_text(encoding='utf-8')
    for a, b in rewrite.items(): src = src.replace(f"from '{a}'", f"from '{b}'")
    return 'data:text/javascript;base64,' + b64(src)
imports = {
    'three': 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js',
    'tp/paperkit-2d.js': mod('lib/paperkit-2d.js', {}),
    'tp/paper-motion.js': mod('lib/paper-motion.js', {}),
    'tp/paperkit-3d.js': mod('lib/paperkit-3d.js', {'./paperkit-2d.js': 'tp/paperkit-2d.js', './paper-motion.js': 'tp/paper-motion.js'}),
    'tp/travel3d.js': mod('travel3d.js', {'./lib/paperkit-3d.js': 'tp/paperkit-3d.js'}),
}
data = {'sets': {}}
for tdir in sorted((HERE / 'pieces').glob('*/*')):
    if not (tdir / 'outlines.json').exists(): continue
    O = json.loads((tdir / 'outlines.json').read_text(encoding='utf-8'))
    data['sets'].setdefault(tdir.parent.name, {})[tdir.name] = {k: {**v, 'img': 'data:image/webp;base64,' + base64.b64encode((tdir / f'{k}.webp').read_bytes()).decode()} for k, v in O.items() if (tdir / f'{k}.webp').exists()}
# missing sets fall back inside travel3d.js (skin core -> metaphor world -> metaphor core); nothing is duplicated here
bd = HERE / 'boards'   # per-world board textures: boards/<world>_paper.webp, boards/<world>_table.webp
if bd.exists():
    data['boards'] = {}
    for f in bd.glob('*.webp'):
        w, kind = f.stem.split('_'); data['boards'].setdefault(w, {})[kind] = 'data:image/webp;base64,' + base64.b64encode(f.read_bytes()).decode()
pf = HERE / 'parchment.webp'
if pf.exists(): data['parchment'] = 'data:image/webp;base64,' + base64.b64encode(pf.read_bytes()).decode()
css = (HERE / 'tp.css').read_text(encoding='utf-8')
glue = (HERE / 'glue.js').read_text(encoding='utf-8')
# strip an earlier run
html = re.sub(r'<script type="importmap" id="tp-map">.*?</script>\n?', '', html, flags=re.S)
html = re.sub(r'<script type="application/json" id="tpaper-data">.*?</script>\n?', '', html, flags=re.S)
html = re.sub(r'<style id="tp-css">.*?</style>\n?', '', html, flags=re.S)
html = re.sub(r'<script id="tp-glue">.*?</script>\n?', '', html, flags=re.S)
head = html.index('</head>')
html = html[:head] + '<script type="importmap" id="tp-map">' + json.dumps({'imports': imports}) + '</script>\n' + html[head:]
body = html.rindex('</body>')
html = html[:body] + '<style id="tp-css">' + css + '</style>\n<script type="application/json" id="tpaper-data">' + json.dumps(data, separators=(',', ':')).replace('</', '<\\/') + '</script>\n<script id="tp-glue">' + glue + '</script>\n' + html[body:]
target.write_text(html, encoding='utf-8')
print(target, len(html) // 1024, 'KB', {sk: sorted(v) for sk, v in data['sets'].items()}, 'parchment' in data)
