# screenshots the Fabula sheet per theme with test heroes (offline, never touches Firebase)
# usage: python -I -X utf8 shot_sheet.py <outdir> [themes] [tab]
import json,sys,pathlib
from playwright.sync_api import sync_playwright
T=pathlib.Path(r'C:/Users/PC/Downloads/newfabula-play/tests');U=pathlib.Path(r'C:/Users/PC/Downloads/newbula-sheet/index.html').as_uri();OUT=pathlib.Path(sys.argv[1]);OUT.mkdir(exist_ok=True)
TH=sys.argv[2].split(',') if len(sys.argv)>2 else ['metaphor','ff','octo']
with sync_playwright() as p:
    br=p.chromium.launch(channel='msedge',headless=True)
    for th in TH:
        pg=br.new_page(viewport={'width':1600,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(U);pg.wait_for_timeout(1500)
        ch=pg.evaluate("src=>{try{eval(src);const b=T.base();for(const c of Object.values(b))c.owner='GM';return b}catch(e){return 'ERR '+e.message}}",(T/'t_auto.js').read_text(encoding='utf-8'))
        if isinstance(ch,str):print(ch);ch={}
        pg.evaluate("s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}",{'fu.user':'GM','fu.role':json.dumps('gm'),'fu.room':'','fu.fbcfg':'offline','fu.theme':json.dumps(th),'fu.chars':json.dumps(ch)})
        pg.reload();pg.wait_for_timeout(2500)
        for _ in range(8):
            if not pg.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"):break
            pg.keyboard.press('Enter');pg.wait_for_timeout(1500)
        o=pg.get_by_text('오프라인으로만 쓰기')
        if o.count() and o.first.is_visible():o.first.click();pg.wait_for_timeout(800)
        print('dbg',pg.evaluate("()=>[typeof USER!=='undefined'?USER:'?',Object.keys(JSON.parse(localStorage.getItem('fu.chars')||'{}')).length]"))
        sel=pg.locator('select').first;opts=sel.locator('option').evaluate_all("o=>o.map(x=>x.value)");print('opts',opts)
        v=[x for x in opts if 'c1' in x] or [x for x in opts if x]
        if v:pg.evaluate("v=>{const s=document.getElementById('pick');s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))}",v[0])
        pg.wait_for_timeout(1500);pg.screenshot(path=str(OUT/f'sheet_{th}.png'))
        pg.evaluate("()=>{const f=(col)=>{const c=document.createElement('canvas');c.width=90;c.height=150;const g=c.getContext('2d');g.fillStyle=col;g.beginPath();g.arc(45,30,18,0,7);g.fill();g.fillRect(28,48,34,95);return c.toDataURL()};IMG.cache.set('t-spr',f('#3a6ea5'));IMG.cache.set('t-atk',f('#c0392b'));const c=CH[cur];c.sprite='t-spr';c.motions={atk:'t-atk'};normalizeChar(c);render()}")
        pg.wait_for_timeout(400)
        t=pg.locator('[data-tab="img"]').last
        if t.count():t.click();pg.wait_for_timeout(1300)
        m=pg.locator('.imgs.mo')
        if m.count():m.first.scroll_into_view_if_needed();pg.wait_for_timeout(500);pg.screenshot(path=str(OUT/f'sheet_{th}_mo.png'))
        print('mo slots',m.locator('.imgc').count() if m.count() else 0)
        print(th,errs[:3]);pg.close()
    br.close()
