# WebGL hit impact: real-time checks + long random soak + texture-leak check + a few captures; offline, never touches Firebase
# usage: python -I -X utf8 tests/hitfx_test.py [theme] [outdir]
import json,sys,pathlib,random
from playwright.sync_api import sync_playwright
D=pathlib.Path(__file__).resolve().parent;TH=sys.argv[1] if len(sys.argv)>1 else 'metaphor'
OUT=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else D/'shots');OUT.mkdir(exist_ok=True)
U=(D.parent/'index.html').as_uri();R=[]
def ok(lab,c,info=''):R.append(bool(c));print('OK  ' if c else 'FAIL',lab,'' if c else info,flush=True)
SETUP=r"""()=>{const fig=(col)=>{const c=document.createElement('canvas');c.width=120;c.height=220;const g=c.getContext('2d');g.fillStyle=col;g.beginPath();g.arc(60,36,24,0,7);g.fill();g.fillRect(34,60,52,100);g.fillRect(36,158,18,60);g.fillRect(66,158,18,60);return c.toDataURL()};
 IMG.cache.set('t-h',fig('#3a6ea5'));IMG.cache.set('t-f',fig('#7a2a3a'));T.reset();CH.c1.sprite='t-h';saveC();for(const e of P.combat.enemies)e.img='t-f';saveP();renderCombat();
 // count live GL textures (sprite copies are made and deleted per hit; art textures are cached once)
 const gp=WebGLRenderingContext.prototype,ct=gp.createTexture,dt=gp.deleteTexture;window.__tex=0;gp.createTexture=function(){window.__tex++;return ct.apply(this,arguments)};gp.deleteTexture=function(t){if(t)window.__tex--;return dt.apply(this,arguments)}}"""
HIT="""([k,d,ty,cr])=>{const u=unitOf(k);u.o.hit={t:Date.now(),ty,cr};u.o.hp=Math.max(0,u.o.hp-d);k.startsWith('c:')?saveC():saveP();renderCombat();
 const el=document.querySelector(`#units [data-k="${k}"]`),top=document.querySelector('#arena>.hfx-top'),n=top?.lastElementChild,nb=n?.getBoundingClientRect(),bb=el?.querySelector('.body').getBoundingClientRect();
 return {glh:el?.classList.contains('glh'),hs:document.getElementById('units').classList.contains('hstop'),n:HFX.list.length,cv:!!document.querySelector('#arena>canvas.hfx'),fail:HFX.fail,
  num:!!n&&n.classList.contains('dmgn'),numAbove:nb&&bb?nb.bottom<=bb.top+2&&Math.abs((nb.left+nb.right)/2-(bb.left+bb.right)/2)<bb.width:false}}"""
IDLE="()=>({n:HFX.list.length,glh:document.querySelectorAll('.spr.glh').length,tr:document.getElementById('units').style.translate,hs:document.getElementById('units').classList.contains('hstop'),raf:HFX.raf,bt:[...document.querySelectorAll('#units .body')].some(b=>b.style.transform),nums:document.querySelector('#arena>.hfx-top')?.children.length||0,tex:window.__tex,art:HFX.tex.size})"
def clean(s,tex0):return s['n']==0 and s['glh']==0 and not s['tr'] and not s['hs'] and not s['raf'] and not s['bt'] and s['nums']==0 and s['tex']-s['art']<=0
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=b.new_page(viewport={'width':1600,'height':900});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type in('warning','error') and ('hit fx' in m.text or 'CONTEXT_LOST' in m.text) and errs.append(m.text))
    pg.on('crash',lambda:errs.append('RENDERER CRASH'))
    pg.goto(U);pg.evaluate("s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}",{'fu.user':json.dumps('GM'),'fu.role':json.dumps('gm'),'fu.room':'','fu.fbcfg':'offline','fu.theme':json.dumps(TH),'fu.play.tab':json.dumps('combat')})
    pg.reload();pg.wait_for_timeout(2500)
    for _ in range(8):
        if not pg.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"):break
        pg.keyboard.press('Enter');pg.wait_for_timeout(1500)
    o=pg.get_by_text('오프라인으로만 쓰기')
    if o.count() and o.first.is_visible():o.first.click();pg.wait_for_timeout(800)
    ok('title closed',pg.evaluate("()=>!document.getElementById('title')||getComputedStyle(document.getElementById('title')).display==='none'"))
    pg.evaluate((D/'t_auto.js').read_text(encoding='utf-8'));pg.evaluate("()=>{document.querySelector('#tabs [data-tab=\"combat\"]')?.click()}");pg.wait_for_timeout(500)
    pg.evaluate(SETUP);pg.wait_for_timeout(1500)
    fk=pg.evaluate("()=>'e:'+P.combat.enemies[0].id");hit=lambda k,d,ty='화염',cr=False:pg.evaluate(HIT,[k,d,ty,cr])
    # 1. one foe hit: GL path, hit-stop, number lifted over the burst
    s=hit(fk,12);ok('foe hit: GL active, hit-stop on',s['cv'] and s['n']==1 and s['glh'] and s['hs'] and not s['fail'],s)
    ok('damage number lifted over the effect, above the head',s['num'] and s['numAbove'],s)
    for ms in [60,120,200,320]:pg.wait_for_timeout(ms-([0,60,120,200,320][[60,120,200,320].index(ms)]));pg.screenshot(path=str(OUT/f'hfx_{TH}_foe_{ms:03d}.png'),clip={'x':650,'y':100,'width':760,'height':560})
    pg.wait_for_timeout(1600);tex0=pg.evaluate("()=>window.__tex");st=pg.evaluate(IDLE);ok('foe hit: fully restored',clean(st,tex0),st)
    # 2. hero crit
    hit('c:c1',25,'물리',True);pg.wait_for_timeout(150);pg.screenshot(path=str(OUT/f'hfx_{TH}_hero_crit.png'),clip={'x':100,'y':100,'width':760,'height':560})
    pg.wait_for_timeout(2000);st=pg.evaluate(IDLE);ok('hero crit: restored',clean(st,tex0),st)
    # 3. AoE + KO
    ks=pg.evaluate("()=>P.combat.enemies.map(e=>'e:'+e.id)")
    for i,k in enumerate(ks):hit(k,999 if i==0 else 8,'번개')
    n=pg.evaluate("()=>HFX.list.length");ok(f'AoE: one effect per foe ({n}/{len(ks)})',n==len(ks),n)
    pg.wait_for_timeout(150);pg.screenshot(path=str(OUT/f'hfx_{TH}_aoe.png'))
    pg.wait_for_timeout(2500);st=pg.evaluate(IDLE);ok('AoE: restored',clean(st,tex0),st)
    pg.evaluate("()=>{for(const e of P.combat.enemies)e.hp=e.maxHp;saveP();for(const c of Object.values(CH))c.hp=999;saveC();renderCombat()}");pg.wait_for_timeout(1500)
    # 4. spam on one unit: the running effect keeps its state (regression: the replaced one used to strip it)
    lost=0
    for i in range(30):
        s=hit('c:c1',1,'냉기');pg.wait_for_timeout(40)
        if not pg.evaluate("()=>document.querySelector('#units [data-k=\"c:c1\"]').classList.contains('glh')"):lost+=1
    n=pg.evaluate("()=>HFX.list.length");ok(f'spam: no pile-up ({n})',n<=1,n);ok(f'spam: running effect keeps its state (lost {lost}/30)',lost==0,lost)
    pg.wait_for_timeout(2000);st=pg.evaluate(IDLE);ok('spam: restored',clean(st,tex0),st)
    # 5. heal / effects off / tab switch
    pg.evaluate("()=>{CH.c1.hp+=5;saveC();renderCombat()}");ok('heal: no impact',pg.evaluate("()=>HFX.list.length===0"))
    pg.evaluate("()=>{VOL.fx=false}");hit(fk,1);ok('effects off: no impact',pg.evaluate("()=>HFX.list.length===0"));pg.evaluate("()=>{VOL.fx=true}")
    hit(fk,1);pg.wait_for_timeout(30);pg.evaluate("()=>{document.querySelector('#tabs [data-tab=\"stage\"]')?.click()}");pg.wait_for_timeout(500)
    pg.evaluate("()=>{document.querySelector('#tabs [data-tab=\"combat\"]')?.click()}");pg.wait_for_timeout(1200);s=hit(fk,1)
    ok('arena rebuilt: canvas + number layer re-attached',s['cv'] and s['n']==1 and s['num'],s);pg.wait_for_timeout(1800)
    # 6. soak: 200 random hits on random units, random type/crit/spacing, invariants every 25
    TY=['물리','화염','냉기','번개','바람','대지','어둠','빛','독'];random.seed(11);ks=pg.evaluate("()=>[...Object.keys(CH).map(k=>'c:'+k),...P.combat.enemies.map(e=>'e:'+e.id)]")
    h0=pg.evaluate("()=>performance.memory?.usedJSHeapSize||0");bad=0;mx=0
    for i in range(200):
        if i%40==0:pg.evaluate("()=>{for(const e of P.combat.enemies)e.hp=e.maxHp;saveP();for(const c of Object.values(CH))c.hp=999;saveC();renderCombat()}")
        hit(random.choice(ks),random.randint(1,9),random.choice(TY),random.random()<.2);pg.wait_for_timeout(random.choice([10,30,60,120,250]))
        mx=max(mx,pg.evaluate("()=>HFX.list.length"))
        if i%25==24:
            v=pg.evaluate("()=>HFX.list.every(e=>!e.dead&&e.el.isConnected&&e.el.classList.contains('glh'))")
            if not v:bad+=1;print('  soak invariant broken at',i,pg.evaluate("()=>HFX.list.map(e=>[e.k,!!e.dead,e.el.isConnected,e.el.classList.contains('glh'),e.el===document.querySelector(`#units [data-k=\"${e.k}\"]`)])"))
    ok(f'soak: invariants held (max {mx} live effects)',bad==0 and mx<=len(ks),bad)
    pg.wait_for_timeout(2500);st=pg.evaluate(IDLE);ok('soak: fully restored, no texture leak',clean(st,tex0),{**st,'tex0':tex0})
    cdp=pg.context.new_cdp_session(pg);cdp.send('HeapProfiler.collectGarbage');h1=pg.evaluate("()=>performance.memory?.usedJSHeapSize||0")
    ok(f'soak: JS heap growth {round((h1-h0)/1e6,1)} MB',h1-h0<30e6,(h0,h1))
    ok('no renderer crash, no page errors',not errs,errs[:3])
    b.close()
print(f'{sum(R)}/{len(R)}','PASS' if all(R) else 'FAILED')
