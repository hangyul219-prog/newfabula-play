# end-to-end battle motion: real upload in the SHEET (file chooser) -> PLAY window picks it up -> real 판정 click swaps the sprite
# offline only (both pages share this browser's storage); usage: python -I -X utf8 tests/motion_e2e.py [theme] [outdir]
import json,sys,pathlib
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
D=pathlib.Path(__file__).resolve().parent;TH=sys.argv[1] if len(sys.argv)>1 else 'metaphor'
OUT=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else D/'shots');OUT.mkdir(exist_ok=True)
PLAY=(D.parent/'index.html').as_uri();SHEET=(D.parent.parent/'newbula-sheet'/'index.html').as_uri()
def fig(path,col,arm):
    im=Image.new('RGBA',(240,440),(0,0,0,0));g=ImageDraw.Draw(im);g.ellipse((80,20,160,100),fill=col);g.rectangle((70,100,170,300),fill=col);g.rectangle((75,300,115,430),fill=col);g.rectangle((125,300,165,430),fill=col)
    g.line((170,140,170+90*arm,140-80),fill=col,width=26);im.save(path)
SPR,ATK=OUT/'e2e_spr.png',OUT/'e2e_atk.png';fig(SPR,(60,110,165,255),1);fig(ATK,(200,50,40,255),-1)
R=[]
def ok(lab,c,info=''):R.append(bool(c));print('OK  ' if c else 'FAIL',lab,'' if c else info,flush=True)
def boot(pg):
    pg.wait_for_timeout(2500)
    for _ in range(8):
        if not pg.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"):break
        pg.keyboard.press('Enter');pg.wait_for_timeout(1500)
    o=pg.get_by_text('오프라인으로만 쓰기')
    if o.count() and o.first.is_visible():o.first.click();pg.wait_for_timeout(800)
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True);ctx=b.new_context(viewport={'width':1600,'height':900});errs=[]
    P=ctx.new_page();P.on('pageerror',lambda e:errs.append('play '+str(e)))
    P.goto(PLAY,timeout=90000);P.evaluate("s=>{localStorage.clear();for(const k in s)localStorage.setItem(k,s[k])}",{'fu.user':json.dumps('GM'),'fu.role':json.dumps('gm'),'fu.room':'','fu.fbcfg':'offline','fu.theme':json.dumps(TH),'fu.play.tab':json.dumps('combat')})
    P.reload(timeout=90000);boot(P);P.evaluate((D/'t_auto.js').read_text(encoding='utf-8'));P.evaluate("()=>{document.querySelector('#tabs [data-tab=\"combat\"]')?.click();T.reset();saveC();renderCombat()}");P.wait_for_timeout(800)
    P.evaluate("()=>localStorage.setItem('fu.user','GM')")# the sheet reads the raw name
    S=ctx.new_page();S.on('pageerror',lambda e:errs.append('sheet '+str(e)))
    S.goto(SHEET,timeout=90000);S.wait_for_timeout(2500)
    for _ in range(6):
        if not S.evaluate("()=>{const t=document.getElementById('title');return !!t&&t.isConnected&&getComputedStyle(t).display!=='none'}"):break
        S.keyboard.press('Enter');S.wait_for_timeout(1200)
    o=S.get_by_text('오프라인으로만 쓰기')
    if o.count() and o.first.is_visible():o.first.click();S.wait_for_timeout(800)
    S.evaluate("()=>{const s=document.getElementById('pick');const v=[...s.options].map(o=>o.value).find(v=>v.includes('c1'));s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))}");S.wait_for_timeout(1200)
    S.screenshot(path=str(OUT/f'e2e_sheet0_{TH}.png'));print('tabs',S.evaluate("()=>[...document.querySelectorAll('[data-tab]')].map(e=>e.dataset.tab+':'+(e.offsetParent?1:0)).join(' ')"),S.evaluate("()=>typeof cur!=='undefined'?cur:'?'"))
    S.evaluate("()=>{tab='img';render()}");S.wait_for_timeout(1200)
    # base sprite + attack motion, both through the real file chooser
    for sel,f in [('[data-act="up-sprite"]',SPR),('[data-act="up-mo"][data-k="atk"]',ATK)]:
        with S.expect_file_chooser() as fc:S.locator(sel).first.click()
        fc.value.set_files(str(f));S.wait_for_timeout(2500)
    m=S.evaluate("()=>{const c=CH[cur];return {sprite:c.sprite,motions:c.motions}}");ok('sheet saved sprite + attack motion',m['sprite'] and m['motions'].get('atk'),m)
    S.screenshot(path=str(OUT/f'e2e_sheet_{TH}.png'))
    P.bring_to_front();P.wait_for_timeout(2500)
    pm=P.evaluate("()=>({sprite:CH.c1.sprite,motions:CH.c1.motions})");ok('play window received the motion',pm['motions'].get('atk')==m['motions'].get('atk'),pm)
    cur="()=>{const im=document.querySelector('#units [data-k=\"c:c1\"] img');return {id:im?.dataset.img,w:im?.naturalWidth,src:(im?.currentSrc||'').slice(0,12)}}"
    P.wait_for_timeout(1500);st=P.evaluate(cur);ok('idle shows the uploaded sprite',st['id']==m['sprite'] and st['w']>0,st)
    # real attack: open 레온's action, pick 공격 and a target, press the 판정 button
    P.evaluate("()=>{T.open('레온');T.act('atk');AF.targets=[T.k(P.combat.enemies[0].name)];AF.step='tgt';renderAct()}");P.wait_for_timeout(600)
    P.locator('#modal [data-ar="go"]').first.click();P.wait_for_timeout(1800)
    st=P.evaluate(cur);ok('after 판정: attack motion shown and loaded',st['id']==m['motions']['atk'] and st['w']>0,st);P.screenshot(path=str(OUT/f'e2e_play_atk_{TH}.png'))
    S.bring_to_front();S.wait_for_timeout(500);P.bring_to_front()
    fin=P.locator('#modal [data-ar="apply"],#modal [data-ar="finish"]').first
    if fin.count():fin.click();P.wait_for_timeout(700)
    fin=P.locator('#modal [data-ar="finish"]').first
    if fin.count():fin.click()
    P.wait_for_timeout(2500);st=P.evaluate(cur);ok('after 완료: back to the base sprite (min hold done)',st['id']==m['sprite'],st)
    # the SHEET's own weapon-attack button fires the motion too (players often roll from the sheet)
    S.bring_to_front();S.evaluate("()=>{tab='eq';render()}");S.wait_for_timeout(1000)
    btn=S.locator('[data-act="attack"]');print('sheet attack buttons',btn.count())
    if btn.count():
        btn.first.click(force=True);S.wait_for_timeout(300);P.bring_to_front();P.wait_for_timeout(700)
        st=P.evaluate(cur);ok('sheet 공격 button -> play shows attack motion',st['id']==m['motions']['atk'],st);P.screenshot(path=str(OUT/f'e2e_play_sheetatk_{TH}.png'))
        P.wait_for_timeout(2200);st=P.evaluate(cur);ok('sheet attack: back after the hold',st['id']==m['sprite'],st)
    else:ok('sheet attack button found',False)
    ok('no page errors',not errs,errs[:3])
    b.close()
print(f'{sum(R)}/{len(R)}','PASS' if all(R) else 'FAILED')
