# screenshots the Metaphor action menu (command step + spell list); offline, never touches Firebase
# usage: python -I -X utf8 tests/shot_act.py [outdir]
import json,sys,pathlib
from playwright.sync_api import sync_playwright
D=pathlib.Path(__file__).parent;OUT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else D/'shots');OUT.mkdir(exist_ok=True)
U=(D.parent/'index.html').as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True);pg=b.new_page(viewport={'width':1600,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(U);pg.evaluate("s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}",{'fu.user':json.dumps('GM'),'fu.role':json.dumps('gm'),'fu.room':'','fu.fbcfg':'offline','fu.theme':json.dumps('metaphor')})
    pg.reload();pg.wait_for_timeout(2500)
    for _ in range(8):
        if not pg.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"):break
        pg.keyboard.press('Enter');pg.wait_for_timeout(1500)
    o=pg.get_by_text('오프라인으로만 쓰기')
    if o.count() and o.first.is_visible():o.first.click();pg.wait_for_timeout(800)
    pg.evaluate((D/'t_auto.js').read_text(encoding='utf-8'))
    pg.evaluate("()=>{document.querySelector('#tabs [data-tab=\"combat\"]')?.click();T.reset();T.open('미라')}");pg.wait_for_timeout(900)
    pg.screenshot(path=str(OUT/'cmd.png'))
    pg.mouse.move(150,300);pg.mouse.wheel(0,120);pg.wait_for_timeout(200);pg.mouse.wheel(0,120);pg.wait_for_timeout(500)
    pg.screenshot(path=str(OUT/'cmd_wheel.png'));print('cmd focus',pg.evaluate("()=>WHL.it[WHL.f].dataset.ak"))
    pg.evaluate("()=>{AF.act='spell';AF.step='opt';AF.opt=0;renderAct()}");pg.wait_for_timeout(600)
    pg.screenshot(path=str(OUT/'opt.png'))
    for i in range(3):pg.mouse.move(150,450);pg.mouse.wheel(0,120);pg.wait_for_timeout(250)
    pg.wait_for_timeout(500);pg.screenshot(path=str(OUT/'opt_wheel.png'))
    b.close()
print('errors:',errs[:5])
