# motion art is fetched AND trimmed ahead of time, so a swap (above all the short hit motion) shows at once even on a slow PC
import sys
p=sys.argv[1];b=open(p,'rb').read()
R=[(b"MOPRE.add(v);IMG.url(v).catch?.(()=>{})",b"MOPRE.add(v);moWarm(v)"),
   (b"const HITMO={},HIT_MS=900;",b"const HITMO={},HIT_MS=1200;\nfunction moWarm(id){IMG.url(id).then(u=>{if(!u||TRIM.has(id))return;const im=new Image();im.onload=()=>{if(!TRIM.has(id)){const pr=trimCut(im);TRIM.set(id,pr);pr.then(v=>TRIMV.set(id,v))}};im.src=u}).catch(()=>{})}")]
for o,n in R:
    if n in b:continue
    assert b.count(o)==1,o;b=b.replace(o,n)
open(p,'wb').write(b);print('ok')
