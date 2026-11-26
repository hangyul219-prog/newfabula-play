import sys
sheet, play = sys.argv[1], sys.argv[2]

def patch(p, pairs):
    b = open(p, 'rb').read()
    if "['hit','피격','HIT']".encode() in b or b'HITMO=' in b:
        print('already', p); return
    for old, new in pairs:
        o = old.encode(); assert b.count(o) == 1, (old[:70], b.count(o)); b = b.replace(o, new.encode())
    open(p, 'wb').write(b); print('ok', p)

patch(sheet, [
    ("['other','기타','OTHER']];\nfunction pMotions", "['other','기타','OTHER'],['hit','피격','HIT']];\nfunction pMotions"),
    ("방어 모션은 방어 태세가 풀릴 때까지 유지돼요.", "방어 모션은 방어 태세가 풀릴 때까지 유지돼요. 피격 모션은 HP가 깎일 때 잠깐 나와요."),
])

patch(play, [
    # hit motion: local to each window, driven by the HP drop every window sees
    ("function moImg(c){const m=c.mo,", "const HITMO={},HIT_MS=900;\nfunction moImg(c){if(c.motions?.hit&&(HITMO['c:'+c.id]||0)>Date.now())return c.motions.hit;const m=c.mo,"),
    ("const prev=HPMEM[u.k];if(prev!=null&&prev!==u.hp){popNum(el,u.hp-prev,u.show);",
     "const prev=HPMEM[u.k];if(prev!=null&&prev!==u.hp){popNum(el,u.hp-prev,u.show);if(u.hp<prev&&u.pc&&u.o.motions?.hit){HITMO[u.k]=Date.now()+HIT_MS;setTimeout(renderCombat,0);setTimeout(renderCombat,HIT_MS+30)}"),
])
