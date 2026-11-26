# inserts the WebGL hit-impact module into the play tool (re-runnable: replaces the block between markers)
import sys,pathlib
p=sys.argv[1];b=open(p,'rb').read();js=pathlib.Path(__file__).with_name('hitfx.js').read_bytes().replace(b'\r\n',b'\n')
S=b'/* ================= hit impact (WebGL)';E=b'/* ================= end hit impact */\n'
if S in b:
    i=b.index(S);j=b.index(E,i)+len(E);b=b[:i]+js+E+b[j:]
else:
    a=b'/* battle VFX: one picture per effect and theme'; assert b.count(a)==1; b=b.replace(a,js+E+a)
def rep(o,n):
    global b
    o=o.encode();n=n.encode()
    if n in b:return
    assert b.count(o)==1,(o[:60],b.count(o));b=b.replace(o,n)
rep("vfxShow(el,'hit-'+(VFX_TY[fresh?h.ty:'물리']||'physical'));if(fresh&&h.cr)",
    "if(VOL.fx!==false&&HFX.hit(el,u,d,VFX_TY[fresh?h.ty:'물리']||'physical',!!(fresh&&h.cr),u.hp<=0))return;vfxShow(el,'hit-'+(VFX_TY[fresh?h.ty:'물리']||'physical'));if(fresh&&h.cr)")
rep(".spr.hit .body{animation:hit .5s}",
    ".spr.hit .body{animation:hit .5s}\n.hfx{position:absolute;inset:0;z-index:1;pointer-events:none;width:100%;height:100%}.hfx-top{position:absolute;inset:0;z-index:1;pointer-events:none}.spr.glh .body{animation:none!important;filter:none}.units.hstop .bob,.units.hstop .shadow,.units.hstop .dmgn,.units.hstop .slice{animation-play-state:paused!important}")
rep("el.className=`spr${auFly(u.o)?' flying':''}","el.className=`spr${auFly(u.o)?' flying':''}${typeof HFX!=='undefined'&&HFX.list.some(e=>e.k===u.k&&!e.dead)?' glh':''}")
open(p,'wb').write(b);print('ok')
