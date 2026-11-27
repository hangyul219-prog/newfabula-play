# stress test for battle motions (offline, two windows of one browser = the same 'storage' path online sync uses)
# usage: python -I -X utf8 tests/motion_stress.py [theme] [outdir]
import json,sys,pathlib,random
from playwright.sync_api import sync_playwright
D=pathlib.Path(__file__).parent;TH=sys.argv[1] if len(sys.argv)>1 else 'metaphor'
OUT=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else D/'shots');OUT.mkdir(exist_ok=True)
U=(D.parent/'index.html').as_uri()
ACTS=['atk','spell','skill','guard','hinder','study','obj','item','other']
ART=r"""
(()=>{const fig=(col,arm)=>{const c=document.createElement('canvas');c.width=60;c.height=100;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(20,10,20,85);g.save();g.translate(40,30);g.rotate(arm);g.fillRect(0,-4,24,8);g.restore();return c.toDataURL()};
 const ids=['spr',...%s,'hit'];ids.forEach((a,i)=>{for(const c of['c1','c2','c3','c4'])IMG.cache.set(`t-${c}-${a}`,fig(`hsl(${i*33},70%%,45%%)`,i*.4))})})()
""" % json.dumps(ACTS)
SEED=r"""
(acts)=>{T.reset();for(const id of['c1','c2','c3','c4']){const c=CH[id];if(!c)continue;c.sprite=`t-${id}-spr`;c.sprites=[{n:'기본',img:c.sprite}];
  c.motions=Object.fromEntries([...acts,'hit'].map(a=>[a,`t-${id}-${a}`]))}saveC();renderCombat();return Object.keys(CH)}
"""
IMGOF="k=>document.querySelector(`#units [data-k=\"${k}\"] img`)?.dataset.img||''"
R=[]
def ok(lab,cond,info=''):
    R.append((lab,bool(cond)));print('OK  ' if cond else 'FAIL',lab,'' if cond else info)
def boot(pg):
    pg.reload();pg.wait_for_timeout(2500)
    for _ in range(8):
        if not pg.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"):break
        pg.keyboard.press('Enter');pg.wait_for_timeout(1500)
    o=pg.get_by_text('오프라인으로만 쓰기')
    if o.count() and o.first.is_visible():o.first.click();pg.wait_for_timeout(800)
    pg.evaluate((D/'t_auto.js').read_text(encoding='utf-8'))
    pg.evaluate("()=>{document.querySelector('#tabs [data-tab=\"combat\"]')?.click()}");pg.wait_for_timeout(500)
    pg.evaluate(ART)
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True);ctx=b.new_context(viewport={'width':1600,'height':900})
    A=ctx.new_page();errs=[];A.on('pageerror',lambda e:errs.append('A '+str(e)))
    A.goto(U);A.evaluate("s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}",{'fu.user':json.dumps('GM'),'fu.role':json.dumps('gm'),'fu.room':'','fu.fbcfg':'offline','fu.theme':json.dumps(TH),'fu.play.tab':json.dumps('combat')})
    boot(A);ids=A.evaluate(SEED,ACTS);A.wait_for_timeout(600)
    B=ctx.new_page();B.on('pageerror',lambda e:errs.append('B '+str(e)));B.goto(U);boot(B);B.wait_for_timeout(800)
    img=lambda pg,k:pg.evaluate(IMGOF,k)
    # 1. every action fires its own motion, both windows; non-guard reverts on finish
    for a in ACTS:
        A.evaluate("a=>{P.combat.acted={};for(const k in CH)CH[k].guard=false;T.open('레온');T.act(a);const u=unitOf(AF.k);const L=a==='skill'?actorSkills(u.o):actOptions(u,a);AF.opt=0;"
                   "const pool=actPool?actPool(u):[];AF.targets=['atk','spell','hinder','study'].includes(a)?[T.k(P.combat.enemies[0].name)]:[];try{actRoll()}catch(e){}}",a)
        A.wait_for_timeout(350);B.wait_for_timeout(250)
        fired=A.evaluate("()=>CH.c1.mo?.a")
        ok(f'[{a}] fired (mo set)',fired==a,fired)
        ok(f'[{a}] window A shows motion',img(A,'c:c1')==f't-c1-{a}',img(A,'c:c1'))
        ok(f'[{a}] window B shows motion',img(B,'c:c1')==f't-c1-{a}',img(B,'c:c1'))
        A.evaluate("()=>{try{if(AF.res?.apply&&!AF.res.applied)actApply()}catch(e){};actFinish()}");A.wait_for_timeout(300);B.wait_for_timeout(100)
        ok(f'[{a}] just finished: held in A',img(A,'c:c1')==f't-c1-{a}',img(A,'c:c1'));ok(f'[{a}] just finished: held in B',img(B,'c:c1')==f't-c1-{a}',img(B,'c:c1'))
        A.wait_for_timeout(1600);B.wait_for_timeout(100)
        want=f't-c1-{a}' if a=='guard' else 't-c1-spr'
        ok(f'[{a}] after finish A',img(A,'c:c1')==want,img(A,'c:c1'));ok(f'[{a}] after finish B',img(B,'c:c1')==want,img(B,'c:c1'))
    A.evaluate("()=>{P.combat.acted={};T.open('레온');actFinish()}");A.wait_for_timeout(300)
    ok('guard ends at own next turn',img(A,'c:c1')=='t-c1-spr',img(A,'c:c1'))
    # 2. hit during an action: hit wins for ~0.9s, then the action motion comes back; heal never shows hit
    A.evaluate("()=>{P.combat.acted={};T.open('레온');T.act('atk');AF.targets=[T.k(P.combat.enemies[0].name)];actRoll()}");A.wait_for_timeout(300)
    A.evaluate("()=>{CH.c1.hp-=3;saveC();renderCombat()}");A.wait_for_timeout(200);B.wait_for_timeout(100)
    ok('hit over action (A)',img(A,'c:c1')=='t-c1-hit',img(A,'c:c1'));ok('hit seen in B',img(B,'c:c1')=='t-c1-hit',img(B,'c:c1'))
    A.wait_for_timeout(1000);B.wait_for_timeout(100)
    ok('back to action motion after hit (A)',img(A,'c:c1')=='t-c1-atk',img(A,'c:c1'));ok('back to action motion (B)',img(B,'c:c1')=='t-c1-atk',img(B,'c:c1'))
    A.evaluate("()=>{try{if(AF.res?.apply&&!AF.res.applied)actApply()}catch(e){};actFinish()}");A.wait_for_timeout(1700)
    # 3. hit spam: 25 drops 60ms apart -> stays hit while hammered, then base; render calls stay bounded
    A.evaluate("()=>{window.__rc=0;const o=window.renderCombat;window.renderCombat=function(){window.__rc++;return o.apply(this,arguments)}}")
    for i in range(25):A.evaluate("()=>{CH.c1.hp-=1;saveC();renderCombat()}");A.wait_for_timeout(60)
    ok('during hit spam = hit',img(A,'c:c1')=='t-c1-hit',img(A,'c:c1'))
    A.wait_for_timeout(1200);ok('after hit spam = base',img(A,'c:c1')=='t-c1-spr',img(A,'c:c1'))
    rc=A.evaluate("()=>window.__rc");ok(f'render calls bounded ({rc})',rc<200,rc)
    A.evaluate("()=>{window.__rc=0}");A.wait_for_timeout(3000);rc=A.evaluate("()=>window.__rc");ok(f'idle: no render loop ({rc} in 3s)',rc<=3,rc)
    # 4. random soak: 4 heroes, 80 random actions with random hits; invariant checked after every step
    names=A.evaluate("()=>['c1','c2','c3','c4'].filter(k=>CH[k]).map(k=>[k,CH[k].name])")
    random.seed(7);bad=0
    for step in range(80):
        cid,nm=random.choice(names);a=random.choice(ACTS)
        A.evaluate("([n,a])=>{P.combat.acted={};for(const k in CH){CH[k].hp=Math.max(CH[k].hp,30)}T.open(n);T.act(a);AF.opt=0;AF.targets=['atk','spell','hinder','study'].includes(a)?[T.k(P.combat.enemies[0].name)]:[];try{actRoll()}catch(e){}}",[nm,a])
        A.wait_for_timeout(120)
        if img(A,'c:'+cid)!=f't-{cid}-{a}':bad+=1;print('  soak fire',step,cid,a,img(A,'c:'+cid))
        if random.random()<.3:
            A.evaluate("id=>{CH[id].hp-=2;saveC();renderCombat()}",cid);A.wait_for_timeout(80)
            if img(A,'c:'+cid)!=f't-{cid}-hit':bad+=1;print('  soak hit',step,cid,img(A,'c:'+cid))
            A.wait_for_timeout(950)
        A.evaluate("()=>{try{if(AF.res?.apply&&!AF.res.applied)actApply()}catch(e){};try{actFinish()}catch(e){}}");A.wait_for_timeout(1650)
        st=A.evaluate("id=>({g:!!CH[id].guard,mo:CH[id].mo?.a||''})",cid);want=f't-{cid}-guard' if (a=='guard' and st['g']) else f't-{cid}-spr'
        if img(A,'c:'+cid)!=want:bad+=1;print('  soak finish',step,cid,a,st,img(A,'c:'+cid))
    ok('random soak 80 steps, 4 heroes',bad==0,bad)
    # 5. stale motion (window closed mid-action) expires; missing art keeps the sprite visible
    A.evaluate("()=>{for(const k in CH){CH[k].guard=false;delete CH[k].mo}CH.c1.mo={a:'atk',t:Date.now()-3600000,open:true};saveC();renderCombat()}");A.wait_for_timeout(300)
    ok('stale motion (1h) ignored',img(A,'c:c1')=='t-c1-spr',img(A,'c:c1'))
    A.evaluate("()=>{CH.c1.motions.atk='no-such-image';saveC();P.combat.acted={};T.open('레온');T.act('atk');AF.targets=[T.k(P.combat.enemies[0].name)];actRoll()}");A.wait_for_timeout(2500)
    vis=A.evaluate("()=>{const im=document.querySelector('#units [data-k=\"c:c1\"] img');return {id:im.dataset.img,w:im.getBoundingClientRect().width,src:(im.currentSrc||'').slice(0,20)}}")
    ok('missing motion art -> hero still visible',vis['w']>5,vis)
    A.evaluate("()=>{try{actFinish()}catch(e){}}");A.wait_for_timeout(300)
    # 6. foes/allies untouched, hero without motions unchanged
    A.evaluate("()=>{delete CH.c2.motions;saveC();P.combat.acted={};T.open(P.combat.enemies[0].name);T.act('atk');AF.targets=[T.k('미라')];try{actRoll()}catch(e){}}");A.wait_for_timeout(400)
    ok('foe action: no motion data written',A.evaluate("()=>!P.combat.enemies[0].mo"))
    ok('hero without motions keeps sprite when hit',img(A,'c:c2')=='t-c2-spr',img(A,'c:c2'))
    A.evaluate("()=>{try{if(AF.res?.apply&&!AF.res.applied)actApply()}catch(e){};actFinish()}")
    A.screenshot(path=str(OUT/f'stress_{TH}.png'))
    b.close()
print('errors:',errs[:5]);n=sum(1 for r in R if not r[1]);print(f'{len(R)-n}/{len(R)} passed');print('PASS' if not n and not errs else 'FAILED')
