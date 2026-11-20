# real-click checks for the Metaphor action wheel (offline GM)
import json,pathlib
from playwright.sync_api import sync_playwright
D=pathlib.Path(__file__).parent;U=(D.parent/'index.html').as_uri();R=[]
def ok(n,c,d=''):R.append((n,bool(c),d))
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True);pg=b.new_page(viewport={'width':1280,'height':720});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(U);pg.evaluate("s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}",{'fu.user':json.dumps('GM'),'fu.role':json.dumps('gm'),'fu.room':'','fu.fbcfg':'offline','fu.theme':json.dumps('metaphor')})
    pg.reload();pg.wait_for_timeout(2500)
    for _ in range(8):
        if not pg.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"):break
        pg.keyboard.press('Enter');pg.wait_for_timeout(1500)
    o=pg.get_by_text('오프라인으로만 쓰기')
    if o.count() and o.first.is_visible():o.first.click();pg.wait_for_timeout(800)
    pg.evaluate((D/'t_auto.js').read_text(encoding='utf-8'))
    pg.evaluate("()=>{document.querySelector('#tabs [data-tab=\"combat\"]')?.click();T.reset();T.open('미라')}");pg.wait_for_timeout(700)
    f=lambda:pg.evaluate("()=>WHL.it[WHL.f].dataset.ak||WHL.it[WHL.f].dataset.ao")
    ok('starts on attack',f()=='atk',f())
    L=pg.locator('.cmds.whl');bb=L.bounding_box();pg.mouse.move(bb['x']+100,bb['y']+bb['height']/2)
    pg.mouse.wheel(0,100);pg.wait_for_timeout(200);ok('wheel down → spell',f()=='spell',f())
    pg.mouse.wheel(0,-100);pg.wait_for_timeout(200);pg.mouse.wheel(0,-100);pg.wait_for_timeout(200);ok('wheel up wraps → other',f()=='other',f())
    pg.keyboard.press('ArrowDown');pg.keyboard.press('ArrowDown');ok('arrow keys → spell',f()=='spell',f())
    pg.wait_for_timeout(400);pg.locator('.cmds.whl [data-ak="guard"]').click(force=True);pg.wait_for_timeout(400)
    ok('click back row only rotates',f()=='guard' and pg.evaluate("()=>AF.step")=='cmd',pg.evaluate("()=>AF.step"))
    pg.locator('.cmds.whl [data-ak="guard"]').click();pg.wait_for_timeout(400)
    ok('click front row chooses',pg.evaluate("()=>AF.act+'/'+AF.step")=='guard/tgt',pg.evaluate("()=>AF.act+'/'+AF.step"))
    pg.keyboard.press('Escape');pg.wait_for_timeout(300);ok('Esc back to cmd keeps focus',pg.evaluate("()=>AF.step")=='cmd' and f()=='guard',f())
    pg.keyboard.press('ArrowUp');pg.keyboard.press('ArrowUp');ok('focus spell',f()=='spell',f())
    pg.keyboard.press('Enter');pg.wait_for_timeout(400);ok('Enter opens spell list',pg.evaluate("()=>AF.act+'/'+AF.step")=='spell/opt')
    ok('spell list is a wheel',pg.locator('.axl.whl').count()==1)
    pg.keyboard.press('ArrowDown');pg.wait_for_timeout(300);ok('info shows focused spell',pg.evaluate("()=>byId('axInfo').textContent===WHL.it[WHL.f].dataset.d"))
    pg.keyboard.press('Enter');pg.wait_for_timeout(400);ok('Enter picks spell 1',pg.evaluate("()=>AF.step+'/'+AF.opt")=='tgt/1',pg.evaluate("()=>AF.step+'/'+AF.opt"))
    pg.evaluate("()=>{applyTheme('ff');AF.step='cmd';renderAct()}");pg.wait_for_timeout(300);ok('ff theme untouched',pg.locator('.whl').count()==0)
    b.close()
for n,c,d in R:print('PASS' if c else 'FAIL',n,d)
print(sum(c for _,c,_ in R),'/',len(R),'errors:',errs[:3])
