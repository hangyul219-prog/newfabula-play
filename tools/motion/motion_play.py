import sys
p = sys.argv[1]
b = open(p, 'rb').read()

def rep(old, new, n=1):
    global b
    if not FIRST: return
    old = old.encode(); new = new.encode()
    assert b.count(old) == n, (old[:80], b.count(old))
    b = b.replace(old, new)

FIRST = b'function moImg' not in b
if not FIRST: print('round1 already')

rep("if(c.sprite&&!c.sprites.some(s=>s.img===c.sprite))c.sprites.unshift({n:'기본',img:c.sprite});",
    "if(c.sprite&&!c.sprites.some(s=>s.img===c.sprite))c.sprites.unshift({n:'기본',img:c.sprite});\n c.motions=Object.fromEntries(Object.entries(c.motions&&typeof c.motions==='object'?c.motions:{}).filter(([k,v])=>v&&typeof v==='string'));")

# roster picks the motion art while an action is being carried out
rep("img:c.sprite||c.full||'',face:c.portrait",
    "img:moImg(c)||c.sprite||c.full||'',face:c.portrait")

rep("function roster(){",
"""/* battle motions: the sheet's 「전투 모션」 art per action; shown from the moment the action fires until it is finished (guard: while guarding) */
const MO_MAX=45000;
function moImg(c){const m=c.mo,id=m&&c.motions?.[m.a];if(!id)return'';if(m.a==='guard')return c.guard?id:'';return Date.now()-(+m.t||0)<MO_MAX?id:''}
function moSet(u){if(!u?.pc)return;const a=AF.act;if(!a)return;u.o.mo={a,t:Date.now()};saveC();if(u.o.motions?.[a]){renderCombat();clearTimeout(moSet.tm);moSet.tm=setTimeout(()=>renderCombat(),MO_MAX+50)}}
function moEnd(u){if(!u?.pc||!u.o.mo||u.o.mo.a==='guard')return;delete u.o.mo;saveC();renderCombat()}
function roster(){""")

rep("const pre=AF.pre;AF.pre=null;const xb=", "moSet(u);const pre=AF.pre;AF.pre=null;const xb=")

rep("autoFinish();AF.finished=true;lastAct();", "autoFinish();moEnd(unitOf(AF.k));AF.finished=true;lastAct();")

# a short pop when the art swaps
rep("if(u.img&&im.dataset.img!==u.img){im.dataset.img=u.img;hydrate(el)}",
    "if(u.img&&im.dataset.img!==u.img){if(im.dataset.img){im.classList.remove('mo-pop');void im.offsetWidth;im.classList.add('mo-pop')}im.dataset.img=u.img;hydrate(el)}")

rep("#units .spr img{-webkit-user-drag:none}",
    "#units .spr img{-webkit-user-drag:none}\n#units .spr img.mo-pop{animation:moPop .22s ease-out}@keyframes moPop{0%{transform:scale(.94) translateY(2%)}60%{transform:scale(1.04)}100%{transform:none}}", n=2)

if FIRST: open(p, 'wb').write(b); print('ok')

# round 2: guard motion shows from the moment it fires (guard flag is set later in actRoll) and drops when the next turn ends the guard
b = open(p, 'rb').read()
def rep2(old, new):
    global b
    o=old.encode();assert b.count(o)==1,(old,b.count(o));b=b.replace(o,new.encode())
if b'u.o.mo.g=1' not in b:
    rep2("if(m.a==='guard')return c.guard?id:'';", "if(m.a==='guard')return c.guard||!m.g&&Date.now()-(+m.t||0)<MO_MAX?id:'';")
    rep2("function moEnd(u){if(!u?.pc||!u.o.mo||u.o.mo.a==='guard')return;", "function moEnd(u){if(!u?.pc||!u.o.mo)return;if(u.o.mo.a==='guard'){u.o.mo.g=1;saveC();return renderCombat()}")
    rep2("u.o.guard=false;u.o.heroNap=false;u.pc?saveC():saveP()}", "u.o.guard=false;u.o.heroNap=false;if(u.o.mo?.a==='guard')delete u.o.mo;u.pc?saveC():saveP();renderCombat()}")
    open(p,'wb').write(b);print('ok2')
