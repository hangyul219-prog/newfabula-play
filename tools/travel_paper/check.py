import sys,glob,json
from PIL import Image, ImageDraw
t=sys.argv[1];fs=sorted(glob.glob(f'pieces/{t}/*.png'));O=json.load(open(f'pieces/{t}/outlines.json'))
n=len(fs);W=Image.new('RGBA',(min(n,6)*230,((n+5)//6)*250),(60,60,60,255));d=ImageDraw.Draw(W)
for i,f in enumerate(fs):
  im=Image.open(f);im.thumbnail((210,220));ox,oy=(i%6)*230+10,(i//6)*250+235-im.size[1];W.alpha_composite(im,(ox,oy))
  import os;nm=os.path.basename(f)[:-4];h=im.size[1]
  pts=[(ox+im.size[0]/2+x*h,oy+h-y*h) for x,y in O[nm]['pts']];d.line(pts+[pts[0]],fill=(0,255,255,255),width=1);d.text((ox,oy+h+2),nm,fill='white')
W.save(f'check_{t}.png')
