# runs the combat-automation scenarios in the play tool (offline GM, never touches Firebase)
# usage: python -I -X utf8 run_tests.py [theme] [filter]
import json,sys,pathlib
from playwright.sync_api import sync_playwright
D=pathlib.Path(__file__).parent;TH=sys.argv[1] if len(sys.argv)>1 else 'metaphor';FL=sys.argv[2] if len(sys.argv)>2 else ''
U=(D.parent/'index.html').as_uri()
def boot(pg):
    pg.wait_for_timeout(2500)
    for _ in range(8):
        if not pg.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"):break
        pg.keyboard.press('Enter');pg.wait_for_timeout(1500)
    o=pg.get_by_text('오프라인으로만 쓰기')
    if o.count() and o.first.is_visible():o.first.click();pg.wait_for_timeout(800)
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True);pg=b.new_page(viewport={'width':1600,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(U);pg.evaluate("s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}",{'fu.user':json.dumps('GM'),'fu.role':json.dumps('gm'),'fu.room':'','fu.fbcfg':'offline','fu.theme':json.dumps(TH),'fu.play.tab':json.dumps('combat')});pg.reload();boot(pg)
    pg.evaluate((D/'t_auto.js').read_text(encoding='utf-8'))
    scen=(D/'t_scen.js').read_text(encoding='utf-8')+chr(10)+((D/'t_scen2.js').read_text(encoding='utf-8') if (D/'t_scen2.js').exists() else '')
    if FL:scen='\n'.join(l for l in scen.split('\nT.run(') if True) # whole file; filter applied on output
    pg.evaluate("()=>{if(typeof tab!=='undefined'&&tab!=='combat'){document.querySelector('#tabs [data-tab=\"combat\"]')?.click()}}");pg.wait_for_timeout(500)
    pg.evaluate(scen)
    res=pg.evaluate("()=>T.res")
    b.close()
fail=[r for r in res if not r[1]]
for n,ok,d in res:
    if FL and FL not in n:continue
    if not ok:print('FAIL',n,'|',d)
print(f'{TH}: {len(res)-len(fail)}/{len(res)} passed')
if errs:print('page errors:',errs[:5])
