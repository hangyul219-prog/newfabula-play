# action window (Metaphor/default) hugs its content instead of running to the bottom of the screen;
# scroll mode (wheel) keeps the full height it needs. FF/Octo already size to content (their rules are more specific).
import sys
p=sys.argv[1];b=open(p,'rb').read()
CSS=b"\n/*actx-fit*/.actx:not(:has(.whl)){bottom:auto;max-height:calc(100vh - 84px)}.actx:not(:has(.whl)) .act-main{flex:0 1 auto}/*end actx-fit*/"
if b'/*actx-fit*/' in b:print('already');sys.exit()
a=b".actx{position:fixed;left:0;top:70px;bottom:14px;z-index:60;width:clamp(300px,24vw,420px);display:flex;pointer-events:none;isolation:isolate}"
assert b.count(a)==1;b=b.replace(a,a+CSS);open(p,'wb').write(b);print('ok')
