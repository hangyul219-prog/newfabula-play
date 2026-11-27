# paper travel map: the travel tab opens as a pop-up paper world; carriage on the route, views, print sets, pin pick
# usage: python -I -X utf8 tests/travel_paper_test.py [theme] [outdir]
import base64, json, sys, pathlib
from playwright.sync_api import sync_playwright
D = pathlib.Path(__file__).parent; TH = sys.argv[1] if len(sys.argv) > 1 else 'metaphor'
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else D / 'shots'); OUT.mkdir(exist_ok=True)
U = (D.parent / 'index.html').as_uri()
MAP = 'data:image/jpeg;base64,' + base64.b64encode((D.parent / 'tools/travel_paper/testmap.jpg').read_bytes()).decode()
SEED = r"""
m=>{IMG.cache.set('t-map',m);P.map.img='t-map';P.map.pins=[
 {id:'a',x:.1,y:.56,name:'리오네 항구',desc:'',kind:'town',hidden:false},{id:'b',x:.6,y:.42,name:'왕도 아스테리아',desc:'',kind:'town',hidden:false},
 {id:'c',x:.78,y:.56,name:'잊힌 신전',desc:'',kind:'land',hidden:false},{id:'d',x:.55,y:.2,name:'검은 동굴',desc:'',kind:'dungeon',hidden:false},
 {id:'e',x:.84,y:.84,name:'비밀 장소',desc:'',kind:'land',hidden:true}];
 P.map.routes=[{id:'r1',pts:[[.1,.56],[.22,.52],[.34,.47],[.46,.44],[.6,.42]],days:4,step:1,prog:.25,die:10}];P.map.party={x:.22,y:.52};P.map.toks=[];
 P.map.objs=[['range',.4,.1],['snowpeak',.6,.08],['forest',.25,.3],['pine',.3,.35],['oak',.42,.6],['grove',.5,.65],['bush',.3,.45],['rocks',.5,.5],['cactus',.8,.8],['wizardtower',.7,.6]].map(([k,x,y],i)=>({id:'o'+i,k,x,y,s:1}));saveP();
 tab='map';render()}
"""
R = []
def ok(lab, c, v=''):
    R.append(c); print(('OK  ' if c else 'FAIL'), lab, v)
with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True, args=['--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1600, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.goto(U); pg.evaluate("s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}", {'fu.user': json.dumps('GM'), 'fu.role': json.dumps('gm'), 'fu.room': '', 'fu.fbcfg': 'offline', 'fu.theme': json.dumps(TH), 'fu.play.tab': json.dumps('combat')})
    pg.reload(); pg.wait_for_timeout(2500)
    for _ in range(8):
        if not pg.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"): break
        pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    o = pg.get_by_text('오프라인으로만 쓰기')
    if o.count() and o.first.is_visible(): o.first.click(); pg.wait_for_timeout(800)
    pg.evaluate(SEED, MAP)
    pg.wait_for_function("()=>typeof TP!=='undefined'&&TP.ctl&&TP.ctl._S.data&&TP.ctl._S.hinges.length>=15", timeout=60000)
    S = "()=>{const S=TP.ctl._S;return {n:S.hinges.length,pins:S.hinges.filter(h=>h.pin&&!h.sign).length,theme:S.theme,v:+S.v.toFixed(3),car:S.party.toArray().map(x=>+x.toFixed(1)),host:!!document.querySelector('.mapwrap>.tphost'),bar:!!document.querySelector('.tpbar')}}"
    st = pg.evaluate(S); ok('paper world built over the map', st['host'] and st['bar'] and st['n'] >= 15, st)
    ok('hidden pin not printed for GM? (GM sees hidden pins)', st['pins'] == 5, st['pins'])
    pg.evaluate("()=>TP.ctl.step(0.25)"); pg.screenshot(path=str(OUT / f'tp_rise_{TH}.png'))
    up = pg.evaluate("()=>TP.ctl._S.hinges.filter(h=>h.p>0.9).length/TP.ctl._S.hinges.length")
    ok('mid-rise: not everything is up yet', up < 0.9, round(up, 2))
    pg.evaluate("()=>TP.ctl.step(4)"); pg.screenshot(path=str(OUT / f'tp_over_{TH}.png'))
    up = pg.evaluate("()=>TP.ctl._S.hinges.filter(h=>h.p>0.97).length/TP.ctl._S.hinges.length")
    ok('settled: every piece stands', up > 0.99, round(up, 2))
    ok('carriage on the route at 25%', abs(pg.evaluate("()=>TP.ctl._S.v") - 0.25) < 0.01)
    # route slider -> carriage drives there
    pg.evaluate("()=>{V.route='r1';renderMap()}"); pg.wait_for_timeout(300)
    pg.evaluate("()=>{routeProg(.75,false)}"); pg.evaluate("()=>TP.ctl.step(4)")
    ok('progress 75% drives the carriage', abs(pg.evaluate("()=>TP.ctl._S.v") - 0.75) < 0.02, pg.evaluate("()=>TP.ctl._S.v"))
    for v in ('third', 'first'):
        pg.click(f'.tpbar [data-v="{v}"]'); pg.evaluate("()=>TP.ctl.step(2)"); pg.screenshot(path=str(OUT / f'tp_{v}_{TH}.png'))
        ok(f'view {v}', pg.evaluate("()=>TP.ctl.view") == v)
    pg.click('.tpbar [data-v="over"]'); pg.evaluate("()=>TP.ctl.step(2)")
    # GM placing: pick a kind, click the page -> a new object stands up and is saved; move / size / remove
    pg.click('.tpbar [data-tp="edit"]'); pg.wait_for_timeout(300)
    ok('placing panel open', pg.evaluate("()=>!!document.querySelector('.tpedit .tpk')"))
    pg.click('.tpedit [data-tpc="settle"]'); pg.click('.tpedit [data-tpk="village"]')
    n0 = pg.evaluate("()=>P.map.objs.length")
    box = pg.evaluate("()=>{const r=TP.host.getBoundingClientRect();return [r.left+r.width*.5,r.top+r.height*.55]}")
    pg.mouse.click(box[0], box[1]); pg.wait_for_timeout(300); pg.evaluate("()=>TP.ctl.step(2)")
    ok('click on the page places a village', pg.evaluate("()=>P.map.objs.length") == n0 + 1 and pg.evaluate("()=>P.map.objs.at(-1).k") == 'village')
    nid = pg.evaluate("()=>P.map.objs.at(-1).id")
    ok('the new piece stands up', pg.evaluate(f"()=>TP.ctl._S.hinges.some(h=>h.objId==='{nid}'&&h.p>0.9)"))
    pg.screenshot(path=str(OUT / f'tp_place_{TH}.png'))
    pg.evaluate(f"()=>tpOnEdit({{type:'scale',id:'{nid}',f:1.5}})"); pg.evaluate(f"()=>tpOnEdit({{type:'move',id:'{nid}',x:.33,y:.4}})"); pg.evaluate("()=>TP.ctl.step(1)")
    o = pg.evaluate(f"()=>P.map.objs.find(o=>o.id==='{nid}')")
    ok('move + size saved', abs(o['x'] - .33) < 1e-3 and abs(o['s'] - 1.5) < 1e-3, o)
    pg.evaluate(f"()=>tpOnEdit({{type:'delete',id:'{nid}'}})"); pg.evaluate("()=>TP.ctl.step(1.5)"); pg.wait_for_timeout(1200)
    ok('removed piece folds away', pg.evaluate(f"()=>!P.map.objs.some(o=>o.id==='{nid}')&&!TP.ctl._S.hinges.some(h=>h.objId==='{nid}')"))
    pg.click('.tpbar [data-tp="edit"]'); pg.wait_for_timeout(200)
    ok('placing panel closed', pg.evaluate("()=>!document.querySelector('.tpedit')?.isConnected"))
    # speech bubbles ("…") above the paper view, in every view
    for v in ('over', 'third', 'first'):
        pg.click(f'.tpbar [data-v="{v}"]'); pg.evaluate("()=>TP.ctl.step(2)")
        pg.evaluate("()=>mapSay({who:'c:c1',name:'레온'},[null,'저 앞에 마을이 보인다!'])"); pg.wait_for_timeout(400)
        r = pg.evaluate("()=>{const e=document.querySelector('.mapwrap>.tpsay .say');if(!e)return null;const b=e.getBoundingClientRect(),w=document.querySelector('.mapwrap').getBoundingClientRect(),t=e.closest('.tpsay');return{in:b.left>=w.left&&b.right<=w.right&&b.top>=w.top&&b.bottom<=w.bottom,top:+getComputedStyle(t).zIndex>+getComputedStyle(TP.host).zIndex&&t.parentNode===TP.host.parentNode,low:e.closest('.tpsay').classList.contains('tplow')}}")
        pg.screenshot(path=str(OUT / f'tp_say_{v}_{TH}.png'))
        ok(f'bubble shows in {v} view (on screen, on top)', bool(r and r['in'] and r['top']), r)
    pg.click('.tpbar [data-v="over"]'); pg.evaluate("()=>TP.ctl.step(2)")
    # print set change (GM select) -> saved + folds and rebuilds
    pg.evaluate("()=>{const s=document.querySelector('.tpbar select');s.value='high';s.dispatchEvent(new Event('change',{bubbles:true}))}"); pg.wait_for_timeout(3500)
    ok('theme saved to the room data', pg.evaluate("()=>P.map.paper") == 'high')
    pg.wait_for_function("()=>TP.ctl._S.theme==='high'&&!TP.ctl._S.building", timeout=120000)
    pg.evaluate("()=>TP.ctl.step(4)"); pg.screenshot(path=str(OUT / f'tp_high_{TH}.png'))
    ok('theme switched', pg.evaluate("()=>TP.ctl._S.theme") == 'high')
    # every UI theme prints the same world: the layout must not change with the skin
    L0 = pg.evaluate("()=>JSON.stringify(TP.ctl.layout())")
    for sk in ('ff', 'octo', 'metaphor'):
        pg.evaluate(f"()=>applyTheme('{sk}')"); pg.wait_for_function(f"()=>TP.ctl.skin==='{sk}'&&!TP.ctl._S.building&&TP.ctl._S.hinges.length>=15", timeout=120000); pg.wait_for_timeout(2500)
        pg.wait_for_function("()=>!TP.ctl._S.building", timeout=120000)
        pg.evaluate("()=>TP.ctl.step(4)"); pg.screenshot(path=str(OUT / f'tp_skin_{sk}.png'))
        ok(f'skin {sk}: same layout as before', pg.evaluate("()=>JSON.stringify(TP.ctl.layout())") == L0)
    pg.evaluate(f"()=>applyTheme('{TH}')"); pg.wait_for_timeout(3000); pg.wait_for_function("()=>!TP.ctl._S.building", timeout=120000)
    # leaving and re-entering the tab folds it open again
    pg.evaluate("()=>{tab='combat';render()}"); pg.wait_for_timeout(300)
    ok('paper view detached on other tabs', pg.evaluate("()=>!TP.host.isConnected"))
    pg.evaluate("()=>{tab='map';render()}"); pg.wait_for_timeout(1200); pg.evaluate("()=>TP.ctl.step(0.2)")
    up = pg.evaluate("()=>TP.ctl._S.hinges.filter(h=>h.p>0.97).length/TP.ctl._S.hinges.length")
    ok('re-entering the tab replays the unfolding', up < 0.8, round(up, 2))
    # GM route drawing switches to the flat map
    pg.evaluate("()=>{V.mode='route';V.draft=[];renderMap()}"); pg.wait_for_timeout(300)
    ok('route drawing uses the flat map', pg.evaluate("()=>!TP.host.isConnected"))
    pg.evaluate("()=>{V.mode='';renderMap()}"); pg.wait_for_timeout(800)
    # toggle off
    pg.click('.tpbar [data-tp="on"]'); pg.wait_for_timeout(300)
    ok('toggle off -> flat map', pg.evaluate("()=>!TP.host.isConnected&&localStorage.getItem('fu.paper')==='0'"))
    pg.click('.tpbar [data-tp="on"]'); pg.wait_for_timeout(1200)
    ok('toggle on -> paper again', pg.evaluate("()=>TP.host.isConnected"))
    b.close()
print('errors:', errs[:6]); print('PASS' if all(R) and not errs else 'FAILED')
