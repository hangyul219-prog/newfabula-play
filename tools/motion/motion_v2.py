# battle motions v2: also fired by the SHEET's attack / spell / skill buttons; every window holds a finished
# motion for MO_HOLD ms counted from when IT saw the change (no clock skew); motion art is preloaded
# usage: python -X utf8 tools/motion/motion_v2.py <sheet index.html> <play index.html>   (re-runnable)
import sys,re
sheet,play=sys.argv[1],sys.argv[2]
NEW_PLAY='''const MO_MAX=45000,MO_HOLD=1500,MOSEEN={},MOPRE=new Set();
const HITMO={},HIT_MS=900;
/* c.mo={a,t,open}: open from 판정 until 완료 (play tool) or false at once (sheet buttons) */
function moImg(c){if(c.motions)for(const v of Object.values(c.motions))if(v&&!MOPRE.has(v)){MOPRE.add(v);IMG.url(v).catch?.(()=>{})}// preload so the swap is instant in every window
  if(c.motions?.hit&&(HITMO['c:'+c.id]||0)>Date.now())return c.motions.hit;const m=c.mo,id=m&&c.motions?.[m.a];if(!id)return'';
  if(m.a==='guard'&&c.guard)return id;const now=Date.now();if(Math.abs(now-(+m.t||0))>600000)return'';// stale leftovers (10 min, skew-tolerant)
  let S=MOSEEN[c.id];if(!S||S.t!==m.t)S=MOSEEN[c.id]={t:m.t,at:now,end:m.open===true?0:now};else if(m.open!==true&&!S.end)S.end=now;
  if(m.open===true){if(now-S.at<MO_MAX)return id;return''}
  const left=S.end+MO_HOLD-now;if(left>0){if(!S.tm)S.tm=setTimeout(()=>{S.tm=0;renderCombat()},left+30);return id}return''}
function moSet(u){if(!u?.pc)return;const a=AF.act;if(!a)return;u.o.mo={a,t:Date.now(),open:true};saveC();if(u.o.motions?.[a])renderCombat()}
function moEnd(u){if(!u?.pc||!u.o.mo||u.o.mo.open!==true)return;u.o.mo={...u.o.mo,open:false};saveC();renderCombat()}
'''
b=open(play,'rb').read()
i=b.index(b'const MO_MAX=45000');j=b.index(b'function roster(){',i)
b=b[:i]+NEW_PLAY.encode()+b[j:]
open(play,'wb').write(b);print('play ok')
b=open(sheet,'rb').read()
HOOK="const MA=c&&{attack:'atk',cast:'spell',skpop:'skill','hero-use':'skill'}[a];if(MA&&c.motions?.[MA]){c.mo={a:MA,t:Date.now(),open:false};save()}// 전투 모션 from the sheet's own buttons\n  switch(a){\n  /* wizards */"
if HOLD:=b'// \xec\xa0\x84\xed\x88\xac \xeb\xaa\xa8\xec\x85\x98 from the sheet' not in b:
    o=b"  switch(a){\n  /* wizards */";assert b.count(o)==1,b.count(o);b=b.replace(o,("  "+HOOK).encode())
    open(sheet,'wb').write(b);print('sheet ok')
else:print('sheet already')
