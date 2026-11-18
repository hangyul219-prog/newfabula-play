// ---------------- Batch 1: 인지 집중·하이퍼코그니션, 주문 모방·키메라의 영혼, 마법 상징, 도박, 계시, 쌍방패 사용자, 삼연참 ----------------
T.run('인지 집중: 명중·살펴보기 +SL, 회복 +SL×2 / 하이퍼코그니션: 주문·소절 MP 감소',()=>{
  T.reset((C)=>{C.c2.classes.push({name:'에스퍼',skills:[{n:'인지 집중',sl:2,max:5},{n:'하이퍼코그니션',sl:2,max:5}]});C.c1.hp=10});
  T.open('미라');T.act('spell','치유');T.tg('레온');T.roll();T.apply();
  const baseHp=T.st('레온').hp;
  T.reset((C)=>{C.c2.classes.push({name:'에스퍼',skills:[{n:'인지 집중',sl:2,max:5},{n:'하이퍼코그니션',sl:2,max:5}]});C.c1.hp=10});
  autoFocusPick('c:c2','c:c1');
  const mp0=T.st('미라').mp;
  T.open('미라');T.act('spell','치유');T.tg('레온');T.roll();T.apply();
  T.ok('치유 HP +4 추가 회복',T.st('레온').hp-baseHp===4,T.st('레온').hp+' vs '+baseHp);
  T.ok('하이퍼코그니션 치유 MP 10−4=6',mp0-T.st('미라').mp===6,mp0-T.st('미라').mp);
  // focus on dazed enemy: accuracy +2, study +2, hypercognition MP reduction on 1 target (-4)
  T.reset((C,P)=>{C.c2.classes.push({name:'에스퍼',skills:[{n:'인지 집중',sl:2,max:5},{n:'하이퍼코그니션',sl:2,max:5}]});P.combat.enemies[0].status={dazed:true}});
  autoFocusPick('c:c2','e:e1');
  T.open('미라');T.act('study');T.tg('고블린 대장');T.dice(...H(4,4));T.roll();
  T.ok('살펴보기 +2 → 4+4+2=10',AF.res.e.total===10,AF.res.e.total);AF.res=null;
  T.act('spell','풀구르');T.tg('고블린 대장');
  const o=autoOpt(T.u('미라'),actOptions(T.u('미라'),'spell')[AF.opt]);
  T.ok('명중 +2',o.acc>=2,o.acc);
  const mp1=T.st('미라').mp;T.dice(...H(7,7));T.roll();
  T.ok('공격 주문 MP 10−4=6',mp1-T.st('미라').mp===6,mp1-T.st('미라').mp);
  // 하이퍼코그니션 on 챈터 소절
  T.reset((C,P)=>{C.c3.classes.push({name:'챈터',skills:[{n:'마기챈트',sl:1,max:10}]},{name:'에스퍼',skills:[{n:'인지 집중',sl:2,max:5},{n:'하이퍼코그니션',sl:2,max:5}]});P.combat.enemies[0].status={dazed:true}});
  autoFocusPick('c:c3','e:e1');
  const mp2=T.st('카이').mp;T.open('카이');T.act('skill','마기챈트');T.roll();T.pick('vol','높음');T.pick('key','불꽃');T.pick('tone','섬뜩한');T.apply();
  T.ok('높음 소절 적 3명(집중 포함) MP 30−2=28',mp2-T.st('카이').mp===28,mp2-T.st('카이').mp);
});

T.run('주문 모방(MIG+WLP)·키메라의 영혼',()=>{
  T.reset((C)=>{C.c2.classes.push({name:'키메리스트',skills:[{n:'주문 모방',sl:2,max:10}]});C.c2.heroics.push({n:'키메라의 영혼'});C.c2.attr.mig=12;C.c2.attr.ins=6;C.c2.chimeristAttr='mig';
    C.c2.spells.push({n:'괴수 숨결',cls:'키메리스트',sp:'야수',off:true,mp:10,tg:'생물 하나',du:'즉시',d:'바람 피해 HR + 10을 준다.'})});
  T.open('미라');T.act('spell','괴수 숨결');
  const o=autoOpt(T.u('미라'),actOptions(T.u('미라'),'spell')[AF.opt]);
  T.ok('MIG+WLP 사용',o.a1==='mig'&&o.a2==='wlp',o.a1+'+'+o.a2);
  T.tg('고블린 대장');T.dice(...H(7,6));T.roll();T.pick('chimsoul','피해 +5');T.apply();
  T.ok('바람 피해 +5 버프 유지',efx(CH.c2).some(e=>e.k==='chimDmg'&&e.v.includes('바람')));
  T.next();T.open('미라');T.act('spell','괴수 숨결');T.tg('고블린 대장');T.dice(...H(7,6));T.roll();
  T.ok('바람 피해 +5 적용',dmgOf('고블린 대장').dmg>=22,dmgOf('고블린 대장').dmg);
});

T.run('마법 상징: 상징 지닌 아군이 시전자 주문 시전 + 상징 파괴',()=>{
  T.reset((C)=>{C.c2.classes.push({name:'심볼리스트',skills:[{n:'마법 상징',sl:2,max:3}]});C.c1.efx=[{n:'보호의 상징',k:'symbol',v:'보호의 상징',src:'c:c2',end:'scene'}]});
  const mp0=T.st('레온').mp;
  T.open('레온');T.act('spell','치유');T.tg('레온');T.roll();T.apply();
  T.ok('레온 MP −10',mp0-T.st('레온').mp===10,mp0-T.st('레온').mp);
  T.ok('지닌 상징 파괴',!symOf(CH.c1));
  // exceeds SL×10 (20): rejected
  T.reset((C)=>{C.c2.classes.push({name:'심볼리스트',skills:[{n:'마법 상징',sl:1,max:3}]});C.c1.efx=[{n:'보호의 상징',k:'symbol',v:'보호의 상징',src:'c:c2',end:'scene'}];C.c2.spells.push({n:'고가 주문',mp:20,tg:'생물 하나',du:'즉시',d:'체력 20 회복'})});
  T.open('레온');T.act('spell');
  T.ok('SL×10 초과는 목록에 없음',!actOptions(T.u('레온'),'spell').some(x=>x.n==='고가 주문'));
});

T.run('도박: MP 20 → 의지 2개 중 9+ 고르고 랜덤 속성 30 피해',()=>{
  T.reset((C)=>{C.c2.attr.wlp=10});const mp0=T.st('미라').mp;
  T.open('미라');T.act('spell');
  const gi=actOptions(T.u('미라'),'spell').findIndex(x=>x.n==='도박');
  if(gi<0){CH.c2.spells.push(T.S('도박'))}
  T.act('spell','도박');T.dice([9,10],[2,10]);T.roll();
  T.ok('MP −20',mp0-T.st('미라').mp===20,mp0-T.st('미라').mp);
  T.dice([5,6]);T.pick('gdie','1번: 9');T.pick('gtg','슬라임');T.apply();
  T.ok('화염 30 → 슬라임 0',T.st('슬라임').hp===0,T.st('슬라임').hp);
});

T.run('계시: FP 2로 아르카나 유지한 채 해제 효과 발동 (비전의 원 없음)',()=>{
  T.reset((C)=>{C.c2.classes.push({name:'아르카니스트',skills:[{n:'결속과 소환',sl:1,max:1},{n:'비전의 원',sl:2,max:4}]});C.c2.heroics.push({n:'계시'});C.c2.efx=[{n:'하늘의 아르카나',k:'arcana',v:'하늘',end:'scene'}]});
  const fp0=T.st('미라').fp;
  T.open('미라');T.act('skill','결속과 소환');T.roll();T.pick('dis','뇌우');T.pick('disT','슬라임');T.pick('arcRev','발동');T.apply();
  T.ok('FP −2',fp0-T.st('미라').fp===2,fp0-T.st('미라').fp);
  T.ok('슬라임 번개 40 → 0',T.st('슬라임').hp===0,T.st('슬라임').hp);
  T.ok('아르카나 유지',auArc(CH.c2)?.v==='하늘');
  T.ok('행동 소모·비전의 원 없음',P.combat.acted['c:c2']===true&&AF.finished);
});

T.run('쌍방패 사용자: 방패 둘 방어 합산 + 쌍방패(MIG+MIG, HR+5+방어 숙련) 공격',()=>{
  const s=RULES.shields[0];
  T.reset((C)=>{C.c3.classes.push({name:'가디언',skills:[{n:'쌍방패 사용자',sl:1,max:1},{n:'방어 숙련',sl:3,max:5}]});C.c3.equip.shield={gid:s.id,name:s.n,def:s.def,mdef:s.mdef,sp:s.sp||''};C.c3.equip.shield2={gid:s.id,name:s.n,def:s.def,mdef:s.mdef,sp:s.sp||''}});
  T.ok('방패 둘 방어 합산',derive(CH.c3).def===8+2*s.def,derive(CH.c3).def);
  T.open('카이');T.act('atk','쌍방패');
  const o=actOptions(T.u('카이'),'atk')[AF.opt];
  T.ok('MIG+MIG · HR+5+3=8',o.a1==='mig'&&o.a2==='mig'&&o.dmg===8,JSON.stringify(o));
  T.tg('고블린 대장');T.dice(...H(6,5));T.roll();T.apply();
  T.ok('피해 6+8=14',80-T.st('고블린 대장').hp===14,80-T.st('고블린 대장').hp);
});

T.run('삼연참: 단검·검 세 자루(갑옷 칸 포함) 연속 3회 공격 (HR 0 · 다중 불가)',()=>{
  const w1=RULES.weapons.find(w=>w.hand==='한손'&&w.range==='근접'&&['단검','검'].includes(w.cat));
  const eq=w=>({...w,name:w.n});
  T.reset((C)=>{C.c1.heroics.push({n:'삼연참'});C.c1.equip={main:eq(w1),off:eq(w1),tri:eq(w1),armor:{name:'판금',base:12,def:0,mdef:0,init:0,martial:true},shield:{},acc:{}}});
  T.ok('갑옷 무시(DEX 방어)',derive(CH.c1).def===8,derive(CH.c1).def);
  T.open('레온');T.act('atk');autoTgtPick('tri');
  T.ok('다중 1',tMax(T.u('레온'),actOptions(T.u('레온'),'atk')[AF.opt])===1);
  T.tg('고블린 대장');T.dice(...H(7,6));T.roll();
  T.ok('첫 공격 HR 0',dmgOf('고블린 대장').dmg===w1.dmg,dmgOf('고블린 대장').dmg);
  T.apply();T.ok('2타',AF.x?.triStep===1&&AF.opt===1);
  T.tg('고블린 대장');T.dice(...H(7,6));T.roll();T.apply();
  T.ok('3타',AF.x?.triStep===2&&AF.opt===2);
  T.tg('고블린 대장');T.dice(...H(7,6));T.roll();T.apply();
  T.ok('3타 뒤 종료',AF.finished&&80-T.st('고블린 대장').hp===3*w1.dmg,80-T.st('고블린 대장').hp);
});
