# WebGL hit impact: frame captures (page clock stepped) + checks; offline, never touches Firebase
# usage: python -I -X utf8 tests/hitfx_test.py [theme] [outdir]
import json,sys,pathlib
from playwright.sync_api import sync_playwright
D=pathlib.Path(__file__).parent;TH=sys.argv[1] if len(sys.argv)>1 else 'metaphor'
OUT=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else D/'shots');OUT.mkdir(exist_ok=True)
U=(D.parent/'index.html').as_uri();R=[]
def ok(lab,c,info=''):R.append(bool(c));print('OK  ' if c else 'FAIL',lab,'' if c else info)
ART=r"""()=>{const fig=(col)=>{const c=document.createElement('canvas');c.width=120;c.height=220;const g=c.getContext('2d');g.fillStyle=col;g.beginPath();g.arc(60,36,24,0,7);g.fill();g.fillRect(34,60,52,100);g.fillRect(36,158,18,60);g.fillRect(66,158,18,60);return c.toDataURL()};
 IMG.cache.set('t-h',fig('#3a6ea5'));IMG.cache.set('t-f',fig('#7a2a3a'));T.reset();CH.c1.sprite='t-h';saveC();for(const e of P.combat.enemies)e.img='t-f';saveP();renderCombat()}"""
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=b.new_page(viewport={'width':1600,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='warning' and 'hit fx' in m.text and errs.append(m.text))
    pg.goto(U);pg.evaluate("s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}",{'fu.user':json.dumps('GM'),'fu.role':json.dumps('gm'),'fu.room':'','fu.fbcfg':'offline','fu.theme':json.dumps(TH),'fu.play.tab':json.dumps('combat')})
    pg.reload();pg.wait_for_timeout(2500)
    for _ in range(8):
        if not pg.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"):break
        pg.keyboard.press('Enter');pg.wait_for_timeout(1500)
    o=pg.get_by_text('오프라인으로만 쓰기')
    if o.count() and o.first.is_visible():o.first.click();pg.wait_for_timeout(800)
    pg.evaluate((D/'t_auto.js').read_text(encoding='utf-8'));pg.evaluate("()=>{document.querySelector('#tabs [data-tab=\"combat\"]')?.click()}");pg.wait_for_timeout(500)
    pg.evaluate(ART);pg.wait_for_timeout(1500)
    fk=pg.evaluate("()=>'e:'+P.combat.enemies[0].id")
    pg.clock.install();pg.clock.pause_at(pg.evaluate("()=>Date.now()")+1000)
    def hit(k,dmg,ty='화염',cr=False):
        pg.evaluate("([k,d,ty,cr])=>{const u=unitOf(k);u.o.hit={t:Date.now(),ty,cr};u.o.hp=Math.max(0,u.o.hp-d);k.startsWith('c:')?saveC():saveP();renderCombat()}",[k,dmg,ty,cr])
    # foe, fire, mid damage
    hit(fk,12);T=0
    for ms in [16,60,120,200,320,480,700]:
        pg.clock.run_for(ms-T);T=ms;pg.screenshot(path=str(OUT/f'hfx_{TH}_foe_{ms:03d}.png'),clip={'x':700,'y':120,'width':700,'height':520})
        if ms==16:
            st=pg.evaluate("k=>({glh:document.querySelector(`#units [data-k=\"${k}\"]`).classList.contains('glh'),hs:document.getElementById('units').classList.contains('hstop'),n:HFX.list.length,cv:!!document.querySelector('#arena>canvas.hfx'),fail:HFX.fail})",fk)
            ok('foe hit: GL active (canvas, effect, hit-stop)',st['cv'] and st['n']==1 and st['glh'] and st['hs'] and not st['fail'],st)
    pg.clock.run_for(1200)
    st=pg.evaluate("k=>({glh:document.querySelector(`#units [data-k=\"${k}\"]`).classList.contains('glh'),n:HFX.list.length,tr:document.getElementById('units').style.translate,bt:document.querySelector(`#units [data-k=\"${k}\"] .body`).style.transform,hs:document.getElementById('units').classList.contains('hstop'),raf:HFX.raf})",fk)
    ok('foe hit: everything restored after',not st['glh'] and st['n']==0 and not st['tr'] and not st['bt'] and not st['hs'] and not st['raf'],st)
    # hero, physical crit
    hit('c:c1',25,'물리',True);T=0
    for ms in [16,140,260,420,650]:
        pg.clock.run_for(ms-T);T=ms;pg.screenshot(path=str(OUT/f'hfx_{TH}_hero_crit_{ms:03d}.png'),clip={'x':150,'y':120,'width':700,'height':520})
    pg.clock.run_for(1500)
    # AoE: every foe at once + KO
    ks=pg.evaluate("()=>P.combat.enemies.map(e=>'e:'+e.id)")
    for i,k in enumerate(ks):hit(k,999 if i==0 else 8,'번개')
    pg.clock.run_for(30);n=pg.evaluate("()=>HFX.list.length");ok(f'AoE: one effect per foe ({n}/{len(ks)})',n==len(ks),n)
    pg.clock.run_for(150);pg.screenshot(path=str(OUT/f'hfx_{TH}_aoe.png'))
    pg.clock.run_for(2500);ok('AoE: cleaned up',pg.evaluate("()=>HFX.list.length===0&&!HFX.raf"))
    # spam on one unit: replaces, never piles up
    for i in range(30):hit('c:c1',1,'냉기');pg.clock.run_for(40)
    n=pg.evaluate("()=>HFX.list.length");ok(f'spam: no pile-up ({n})',n<=1,n)
    pg.clock.run_for(2000);ok('spam: cleaned up',pg.evaluate("()=>HFX.list.length===0&&!document.querySelector('.spr.glh')"))
    pg.evaluate("()=>{for(const e of P.combat.enemies)e.hp=e.maxHp;saveP();renderCombat()}");pg.clock.run_for(1500)
    # heal shows no impact; effects-off setting falls back to nothing
    pg.evaluate("()=>{CH.c1.hp+=5;saveC();renderCombat()}");pg.clock.run_for(30);ok('heal: no impact',pg.evaluate("()=>HFX.list.length===0"))
    pg.evaluate("()=>{VOL.fx=false}");hit(fk,1);pg.clock.run_for(30);ok('effects off: no impact',pg.evaluate("()=>HFX.list.length===0"));pg.evaluate("()=>{VOL.fx=true}")
    # tab switch mid-effect: arena rebuilt, canvas re-attaches next hit
    hit(fk,1);pg.clock.run_for(30);pg.evaluate("()=>{document.querySelector('#tabs [data-tab=\"stage\"]')?.click()}");pg.clock.run_for(300)
    pg.evaluate("()=>{document.querySelector('#tabs [data-tab=\"combat\"]')?.click()}");pg.clock.run_for(600);hit(fk,1);pg.clock.run_for(30)
    ok('arena rebuilt: canvas re-attached',pg.evaluate("()=>!!document.querySelector('#arena>canvas.hfx')&&HFX.list.length===1"))
    b.close()
print('errors:',errs[:5]);print(f'{sum(R)}/{len(R)}','PASS' if all(R) and not errs else 'FAILED')
