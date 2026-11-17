# Sync merge check: Firebase path split/rejoin (NET.flat/unflat) must give back exactly what went in,
# and a rejoin (NET.first) must keep both this browser's offline edit and the room's edit. Offline only; never touches Firebase.
# usage: python -I -X utf8 tests/sync_test.py      (needs: pip install playwright, Microsoft Edge)
import pathlib,sys
from playwright.sync_api import sync_playwright
URL=(pathlib.Path(__file__).resolve().parent.parent/'index.html').as_uri()
JS=r"""()=>{const out=[],eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),rt=(k,v)=>NET.unflat(k,NET.rflat(NET.nest(NET.flat(k,v))));
 const chars={c1:{id:'c1',name:'레온','a.b':1,empty:{},stand:[{img:'i1',label:'기본'}],pop:{id:'p1',n:'고통',d:'설명'},bonds:[]}};
 const play={stage:{bg:'',slots:[null,{who:'c:c1',expr:0}],lines:[{id:'l2',who:'narr',text:'둘',t:2},{id:'l1',who:'c:c1',text:'하나',t:1,emo:'excl'}]},
  npcs:[{id:'n2',name:'B'},{id:'n1',name:'A'}],combat:{positions:{'c:c1':{x:.3,y:.6}}}};
 const chat=[{id:'m1',t:1,text:'a'},{id:'m2',t:2,text:'b'}];
 for(const[k,v]of[['fu.chars',chars],['fu.play',play],['fu.chat',chat]]){const back=rt(k,v);out.push([k+' round trip',eq(back,v),eq(back,v)?'':JSON.stringify(back).slice(0,300)])}
 // rejoin after offline play: c1 changed here, c2 changed in the room meanwhile -> both survive
 const k='fu.chars',base={c1:{id:'c1',name:'A',hp:10},c2:{id:'c2',name:'B',hp:5}},fb=NET.flat(k,base),on=NET.on,room=NET.room;
 NET.on=false;NET.room='T';const B0={room:'T',k:{[k]:Object.fromEntries(Object.entries(fb).map(([p,x])=>[p,NET.h(x)]))}};
 LS.set(k,{...base,c1:{...base.c1,hp:7}});NET.first(k,NET.flat(k,{...base,c2:{...base.c2,hp:1}}),B0,'T');const m=LS.get(k,{});
 out.push(['rejoin keeps both edits',m.c1?.hp===7&&m.c2?.hp===1,JSON.stringify(m)]);NET.on=on;NET.room=room;return out}"""
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True);pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(URL);pg.evaluate("()=>{localStorage.clear();localStorage.setItem('fu.fbcfg','offline')}");pg.reload();pg.wait_for_function("()=>typeof NET==='object'&&typeof LS==='object'")
    res=pg.evaluate(JS);b.close()
bad=[r for r in res if not r[1]]
for name,ok,info in res:print('PASS' if ok else 'FAIL',name,info if not ok else '')
if errs:print('page errors:',errs[:3])
sys.exit(1 if bad or errs else 0)
