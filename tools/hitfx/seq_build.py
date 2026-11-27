# GPT frame sheets (4x2 frames on pure black) -> transparent webp sheets embedded as FXDATA['<theme>/vfxseq/<name>']
# usage: python -I -X utf8 tools/hitfx/seq_build.py <raw dir> <play index.html>
#   raw files: <theme>_<name>.png  e.g. metaphor_hit-physical.png, ff_crit.png, octo_ko.png
import sys,io,base64,pathlib,re,json
from PIL import Image
import numpy as np
RAW=pathlib.Path(sys.argv[1]);P=pathlib.Path(sys.argv[2]);C,R=4,2;CELL_H=256
def key_alpha(im):
    a=np.asarray(im.convert('RGB')).astype(np.float32)/255
    m=a.max(axis=2);al=np.clip((m-.06)/.94,0,1)**.85# black (and JPEG-ish near-black noise) -> clear, bright -> solid
    rgb=np.where(al[...,None]>0,np.clip(a/np.maximum(al[...,None],1e-3),0,1),0)# un-premultiply so it composites like the source on black
    return Image.fromarray((np.dstack([rgb,al])*255+.5).astype(np.uint8),'RGBA')
def build(f):
    im=key_alpha(Image.open(f));W,H=im.size;cw,ch=W/C,H/R
    # each frame is recentred on its own alpha-weighted centre (GPT drifts a little from cell to cell),
    # on a padded cell so nothing is clipped; a common centre keeps the playback steady
    PAD=1.2;pw,ph=round(cw*PAD),round(ch*PAD);out_w=round(CELL_H*pw/ph);sheet=Image.new('RGBA',(out_w*C,CELL_H*R));cs=[]
    for i in range(C*R):
        x,y=i%C,i//C;c=im.crop((round(x*cw),round(y*ch),round((x+1)*cw),round((y+1)*ch)));a=np.asarray(c)[...,3].astype(np.float64)
        if a.sum()>50:yy,xx=np.mgrid[:a.shape[0],:a.shape[1]];cx,cy=(a*xx).sum()/a.sum(),(a*yy).sum()/a.sum()
        else:cx,cy=c.width/2,c.height/2
        cs.append((c,cx,cy))
    big=[(cx,cy) for c,cx,cy in cs[2:6]]# the big middle frames decide the shared centre
    for i,(c,cx,cy) in enumerate(cs):
        # big middle frames lock to their own centre (removes GPT's drift); the small spark/ember frames use the shared one
        mx,my=sum(b[0] for b in big)/4,sum(b[1] for b in big)/4
        tx,ty=((cx+mx)/2,(cy+my)/2) if 2<=i<=5 else (mx,my)# half-way: steadier without wiping out intended motion
        cell=Image.new('RGBA',(pw,ph));cell.paste(c,(round(pw/2-tx),round(ph/2-ty)))
        cell=cell.resize((out_w,CELL_H),Image.LANCZOS);px=np.asarray(cell).copy();px[:3,:,3]=0;px[-3:,:,3]=0;px[:,:3,3]=0;px[:,-3:,3]=0
        sheet.paste(Image.fromarray(px,'RGBA'),((i%C)*out_w,(i//C)*CELL_H))
    b=io.BytesIO();sheet.save(b,'WEBP',quality=88,method=4);return sheet,b.getvalue()
data={};prev=RAW/'preview';prev.mkdir(exist_ok=True)
for f in sorted(RAW.glob('*.png')):
    m=re.match(r'(metaphor|ff|octo)_(hit-\w+|crit|ko)\.png$',f.name)
    if not m:continue
    sheet,wb=build(f);k=f'{m.group(1)}/vfxseq/{m.group(2)}';data[k]='data:image/webp;base64,'+base64.b64encode(wb).decode()
    bg=Image.new('RGBA',sheet.size,(40,44,52,255));bg.alpha_composite(sheet);bg.convert('RGB').save(prev/f.name)
    print(k,len(wb)//1024,'KB')
b=P.read_bytes();S=b'/* vfxseq frames */';E=b'/* end vfxseq frames */'
blk=S+b'Object.assign(FXDATA,'+json.dumps(data,separators=(',',':')).encode()+b');'+E
if S in b:i=b.index(S);j=b.index(E,i)+len(E);b=b[:i]+blk+b[j:]
else:
    a=b'/* ================= hit impact (WebGL)';assert b.count(a)==1;b=b.replace(a,blk+b'\n'+a)
P.write_bytes(b);print('embedded',len(data),'sheets')
