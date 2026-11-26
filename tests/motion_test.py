# battle motions: the sprite swaps to the sheet's per-action art while the action runs; offline, never touches Firebase
# usage: python -I -X utf8 tests/motion_test.py [theme] [outdir]
import json,sys,pathlib
from playwright.sync_api import sync_playwright
D=pathlib.Path(__file__).parent;TH=sys.argv[1] if len(sys.argv)>1 else 'metaphor'
OUT=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else D/'shots');OUT.mkdir(exist_ok=True)
U=(D.parent/'index.html').as_uri()
JS=r"""
(()=>{const fig=(col,arm)=>{const c=document.createElement('canvas');c.width=120;c.height=200;const g=c.getContext('2d');g.fillStyle=col;
  g.beginPath();g.arc(60,40,22,0,7);g.fill();g.fillRect(40,62,40,80);g.fillRect(42,140,14,58);g.fillRect(64,140,14,58);
  g.save();g.translate(80,70);g.rotate(arm);g.fillRect(0,-6,48,12);g.restore();return c.toDataURL()};
 IMG.cache.set('t-spr',fig('#3a6ea5',1.2));IMG.cache.set('t-atk',fig('#c0392b',-0.9));IMG.cache.set('t-grd',fig('#27ae60',-1.6));
 T.reset();const c=CH.c1;c.sprite='t-spr';c.sprites=[{n:'기본',img:'t-spr'}];c.motions={atk:'t-atk',guard:'t-grd'};saveC();renderCombat()})()
"""
cur="()=>document.querySelector('#units [data-k=\"c:c1\"] img')?.dataset.img"
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True);pg=b.new_page(viewport={'width':1600,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(U);pg.evaluate("s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}",{'fu.user':json.dumps('GM'),'fu.role':json.dumps('gm'),'fu.room':'','fu.fbcfg':'offline','fu.theme':json.dumps(TH),'fu.play.tab':json.dumps('combat')})
    pg.reload();pg.wait_for_timeout(2500)
    for _ in range(8):
        if not pg.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"):break
        pg.keyboard.press('Enter');pg.wait_for_timeout(1500)
    o=pg.get_by_text('오프라인으로만 쓰기')
    if o.count() and o.first.is_visible():o.first.click();pg.wait_for_timeout(800)
    pg.evaluate((D/'t_auto.js').read_text(encoding='utf-8'))
    pg.evaluate("()=>{document.querySelector('#tabs [data-tab=\"combat\"]')?.click()}");pg.wait_for_timeout(500)
    pg.evaluate(JS);pg.wait_for_timeout(600)
    R=[]
    def chk(lab,want):
        v=pg.evaluate(cur);R.append((lab,v==want,v));print(('OK ' if v==want else 'FAIL'),lab,v)
    chk('idle = base sprite','t-spr')
    pg.evaluate("()=>{T.open('레온');T.act('atk');AF.targets=[T.k(P.combat.enemies[0].name)];T.roll()}");pg.wait_for_timeout(700)
    chk('attack fired = attack motion','t-atk');pg.screenshot(path=str(OUT/f'motion_atk_{TH}.png'))
    pg.evaluate("()=>{T.apply();if(!AF.finished)actFinish()}");pg.wait_for_timeout(700)
    chk('attack finished = base','t-spr')
    pg.evaluate("()=>{P.combat.acted={};T.open('레온');T.act('spell');AF.opt=0;AF.targets=[];try{T.roll()}catch(e){}}");pg.wait_for_timeout(500)
    chk('spell with empty slot = base','t-spr')
    pg.evaluate("()=>{actFinish();P.combat.acted={};T.open('레온');T.act('guard');T.roll()}");pg.wait_for_timeout(600)
    chk('guard fired = guard motion','t-grd')
    pg.evaluate("()=>actFinish()");pg.wait_for_timeout(600)
    chk('guard finished = still guarding','t-grd');pg.screenshot(path=str(OUT/f'motion_guard_{TH}.png'))
    pg.evaluate("()=>{P.combat.acted={};T.open('레온')}");pg.wait_for_timeout(600)
    chk('next turn = guard off, base','t-spr')
    b.close()
print('errors:',errs[:5]);print('PASS' if all(r[1] for r in R) and not errs else 'FAILED')
