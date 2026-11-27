# the room media sweep only keeps images whose id sits in a known field; c.motions{atk,spell,...} was unknown,
# so motion art got deleted from the room and other players never saw it. Count every value under 'motions' as an image.
import sys
for p in sys.argv[1:]:
    b=open(p,'rb').read()
    o=b"else if(value&&typeof value==='object')for(const[k,v]of Object.entries(value))this.refs(v,out,k);"
    n=b"else if(value&&typeof value==='object')for(const[k,v]of Object.entries(value))this.refs(v,out,field==='motions'?'img':k);// battle motions: every value is an image id"
    if n in b:print('already',p);continue
    assert b.count(o)==1,p;b=b.replace(o,n);open(p,'wb').write(b);print('ok',p)
