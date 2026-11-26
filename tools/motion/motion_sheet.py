import sys
p = sys.argv[1]
b = open(p, 'rb').read()

def rep(old, new, n=1):
    global b
    old = old.encode(); new = new.encode()
    assert b.count(old) == n, (old[:80], b.count(old))
    b = b.replace(old, new)

if b'MOTION_ACTS' in b:
    print('already'); sys.exit()

# action list (same keys as the play tool's ACTS)
rep("function pImages(c){",
"const MOTION_ACTS=[['atk','공격','ATTACK'],['spell','주문','SPELL'],['skill','스킬','SKILL'],['guard','방어','GUARD'],['hinder','방해','HINDER'],['study','조사','STUDY'],['obj','목표','OBJECTIVE'],['item','소지품','INVENTORY'],['other','기타','OTHER']];\n"
"function pMotions(c){const m=c.motions||{};return card('전투 모션','MOTIONS',`<p class=\"muted\" style=\"margin:0 0 10px\">플레이툴에서 그 행동을 발동하면 전장 스프라이트가 이 그림으로 바뀌고, 행동이 끝나면 원래대로 돌아와요. 방어 모션은 방어 태세가 풀릴 때까지 유지돼요. 비워 둔 칸은 기본 스프라이트 그대로예요.</p>\n"
"  <div class=\"imgs mo\"><div class=\"imgc mo-base\"><div class=\"pic\" data-act=\"up-sprite\" title=\"전투 스프라이트 올리기\">${c.sprite?`<img data-img=\"${c.sprite}\" alt=\"\">`:'투명 PNG'}</div><b>기본</b><small class=\"muted\">BATTLE SPRITE</small></div>${MOTION_ACTS.map(([k,lab,en])=>`<div class=\"imgc\"><div class=\"pic\" data-act=\"up-mo\" data-k=\"${k}\" title=\"${lab} 모션 올리기\">${m[k]?`<img data-img=\"${m[k]}\" alt=\"\">`:'투명 PNG'}</div><b>${lab}</b><small class=\"muted\">${en}</small>${m[k]?`<div><button class=\"btn x\" data-act=\"clr-mo\" data-k=\"${k}\">지우기</button></div>`:''}</div>`).join('')}</div>`)}\n"
"function pImages(c){")

rep("""  +card('전투 스프라이트 모음','SPRITES',""", """  +pMotions(c)
  +card('전투 스프라이트 모음','SPRITES',""")

rep("""  case'clr-full':""", """  case'up-mo':{const k=t.dataset.k;const id=await pickImage(2000);if(id&&CH[c.id]){const o=CH[c.id];o.motions={...(o.motions||{}),[k]:id};save();render()}break}
  case'clr-mo':{const k=t.dataset.k;if(c.motions){delete c.motions[k];save();render()}break}
  case'clr-full':""")

rep("if(c.sprite&&!c.sprites.some(s=>s.img===c.sprite))c.sprites.unshift({n:'기본',img:c.sprite});",
    "if(c.sprite&&!c.sprites.some(s=>s.img===c.sprite))c.sprites.unshift({n:'기본',img:c.sprite});\n c.motions=Object.fromEntries(Object.entries(c.motions&&typeof c.motions==='object'?c.motions:{}).filter(([k,v])=>v&&typeof v==='string'));")

rep(".imgs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}",
    ".imgs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}\n.imgs.mo{grid-template-columns:repeat(5,1fr)}.imgs.mo .mo-base{outline:2px solid currentColor;outline-offset:-2px}@media (max-width:700px){.imgs.mo{grid-template-columns:repeat(3,1fr)}}")

open(p, 'wb').write(b)
print('ok')
