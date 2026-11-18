// ---------------- Batch 3: 커스텀 클래스 생성기 (스탯·방어·패시브·액티브·영웅 기술·migrateChar 보존) ----------------
T.run('커스텀 클래스: 능력치 보너스·방어·마방·migrateChar 영웅 기술 보존',()=>{
  T.reset((C)=>{
    const d0=derive(C.c1);
    const lib=[{id:'cw_test1',name:'성좌 기사',src:'CUSTOM',custom:true,bonus:'hp|mp',free:[],skills:[{n:'성좌 수호',max:5,sl:2,d:'방어 증가'}],heroic:{n:'전설 성좌',src:'CUSTOM',custom:true,req:'성좌 기사 마스터',d:'방어 +1',fx:{kind:'defBonus',val:1,perSl:0,cond:'all'}}}];
    SYNC.set('fu.customClasses',lib);
    C.c1.classes.push(
      {name:'성좌 기사',custom:true,bonus:'hp|mp',pick:'mp',free:[],heroic:lib[0].heroic,skills:[{n:'성좌 수호',max:5,sl:2,d:'방어 증가',fx:{kind:'defBonus',val:1,perSl:1,cond:'all'}}]},
      {name:'차원 기술사',custom:true,bonus:'ip',free:[],skills:[{n:'차원 외투',max:3,sl:1,d:'마방 증가',fx:{kind:'mdefBonus',val:2,perSl:0,cond:'all'}}]}
    );
    C.c1.heroics.push({n:'전설 성좌',custom:true});
    const d1=derive(C.c1);
    T.ok('hp|mp→mp 선택 시 MP +5',d1.maxMp-d0.maxMp===5,`${d0.maxMp}->${d1.maxMp}`);
    T.ok('ip 보너스 클래스 IP +2',d1.maxIp-d0.maxIp===2,`${d0.maxIp}->${d1.maxIp}`);
    T.ok('defBonus(1+1*2)+영웅(1) = DEF +4',d1.def-d0.def===4,`${d0.def}->${d1.def}`);
    T.ok('mdefBonus(2) = MDEF +2',d1.mdef-d0.mdef===2,`${d0.mdef}->${d1.mdef}`);
    migrateChar(C.c1);
    T.ok('migrateChar 후 커스텀 클래스·영웅 기술 보존',C.c1.classes.some(k=>k.name==='성좌 기사'&&k.skills[0]?.sl===2)&&C.c1.heroics.some(h=>h.n==='전설 성좌'&&h.custom));
    SYNC.set('fu.customClasses',[]);
  });
});

T.run('커스텀 패시브 전투: atkAcc·atkDmg(근접/위기)·spellDmg·healBonus·extraFx 비중복',()=>{
  // 1) baseline melee attack damage & spell damage & heal
  T.reset();
  T.open('레온');T.act('atk');T.tg('고블린 대장');T.dice(...H(7,6));T.roll();
  const baseAtkDmg=dmgOf('고블린 대장').dmg;
  T.open('미라');T.act('spell','풀구르');T.tg('불 정령');T.dice(...H(7,6));T.roll();
  const baseSpellDmg=dmgOf('불 정령').dmg;
  T.reset(C=>{C.c1.hp=10});
  T.open('미라');T.act('spell','치유');T.tg('레온');T.roll();T.apply();
  const baseHealHp=T.st('레온').hp;

  // 2) equip custom passive skills
  T.reset(C=>{
    C.c1.classes.push({name:'검성 커스텀',custom:true,bonus:'hp',skills:[
      {n:'예리한 눈',max:5,sl:2,d:'명중 보너스 4',fx:{kind:'atkAcc',val:2,perSl:1,cond:'melee'}},
      {n:'분노 폭발',max:5,sl:2,d:'위기 시 추가 피해 5',fx:{kind:'atkDmg',val:1,perSl:2,cond:'crisis'}}
    ]});
    C.c2.classes.push({name:'대마도 커스텀',custom:true,bonus:'mp',skills:[
      {n:'마력 증폭',max:5,sl:2,d:'주문 추가 피해 5',fx:{kind:'spellDmg',val:3,perSl:1,cond:'all'}},
      {n:'자애로운 빛',max:5,sl:2,d:'회복량 보너스 8',fx:{kind:'healBonus',val:4,perSl:2,cond:'all'}}
    ]});
    C.c1.hp=10;C.c1.mp=10;
  });
  // check extraFx does not double-list automated custom skills
  const efxList=extraFx(T.u('레온')).concat(extraFx(T.u('미라')));
  T.ok('자동화된 커스텀 스킬은 수동 extraFx 미노출',!efxList.some(x=>['예리한 눈','분노 폭발','마력 증폭','자애로운 빛'].includes(x.n)),efxList.map(x=>x.n));

  // atkAcc (+4 melee only) & atkDmg crisis (not active above crisis, active at hp=10)
  T.open('레온');T.act('atk');
  const oAtk=autoOpt(T.u('레온'),actOptions(T.u('레온'),'atk')[AF.opt]);
  T.ok('atkAcc(melee) +4 반영',oAtk.acc>=4,oAtk.acc);
  T.tg('고블린 대장');T.dice(...H(7,6));T.roll();
  T.ok('위기 상태(hp=10) atkDmg +5 적용',dmgOf('고블린 대장').dmg-baseAtkDmg===5,`${baseAtkDmg}->${dmgOf('고블린 대장').dmg}`);

  // non-crisis: hp full -> crisis bonus 0
  CH.c1.hp=derive(CH.c1).maxHp;saveC();
  T.next();T.open('레온');T.act('atk');T.tg('고블린 대장');T.dice(...H(7,6));T.roll();
  T.ok('비위기 상태 시 crisis atkDmg 미적용',dmgOf('고블린 대장').dmg===baseAtkDmg,dmgOf('고블린 대장').dmg);

  // spellDmg +5 on 풀구르
  T.next();T.open('미라');T.act('spell','풀구르');T.tg('불 정령');T.dice(...H(7,6));T.roll();
  T.ok('spellDmg +5 반영',dmgOf('불 정령').dmg-baseSpellDmg===5,`${baseSpellDmg}->${dmgOf('불 정령').dmg}`);

  // healBonus +8 on 치유 & 치유약, NOT on 엘릭서 MP
  CH.c1.hp=10;CH.c1.mp=10;saveC();
  T.next();T.open('미라');T.act('spell','치유');T.tg('레온');T.roll();T.apply();
  T.ok('치유 주문 healBonus +8 적용',T.st('레온').hp-baseHealHp===8,`${baseHealHp}->${T.st('레온').hp}`);
  CH.c1.hp=10;saveC();
  T.next();T.open('미라');T.act('item');AF.item=RULES.items.findIndex(x=>x.n==='엘릭서');T.tg('레온');T.roll();T.apply();
  T.ok('엘릭서 MP 회복에는 healBonus 미적용 (MP +50)',T.st('레온').mp===60,T.st('레온').mp);
});

T.run('커스텀 액티브 스킬·영웅 기술: activeDmg/Heal/Status/Buff 및 전체 대상 자동 적용',()=>{
  T.reset(C=>{
    const heroFx={n:'성좌 참격',src:'CUSTOM',custom:true,req:'마스터',d:'어둠 피해 25',fx:{kind:'activeDmg',val:25,perSl:0,type:'어둠',tgt:'one_foe',mp:20}};
    SYNC.set('fu.customClasses',[{id:'cw_act',name:'성기사단장',src:'CUSTOM',custom:true,bonus:'hp',free:[],heroic:heroFx,skills:[]}]);
    C.c1.classes.push({name:'성기사단장',custom:true,bonus:'hp',free:[],heroic:heroFx,skills:[
      {n:'성광 일섬',max:5,sl:2,d:'빛 피해 10+5×SL',fx:{kind:'activeDmg',val:10,perSl:5,type:'빛',tgt:'one_foe',mp:10}},
      {n:'유성 폭격',max:5,sl:1,d:'적 전체 화염 12',fx:{kind:'activeDmg',val:12,perSl:0,type:'화염',tgt:'all_foes',mp:15}},
      {n:'마비 독침',max:5,sl:1,d:'독 상태',fx:{kind:'activeStatus',val:0,perSl:0,stat:'poisoned',tgt:'one_foe',mp:5}},
      {n:'전투 함성',max:5,sl:1,d:'피해 +6',fx:{kind:'activeBuff',val:6,perSl:0,buff:'dmg+',tgt:'self',mp:5}},
      {n:'화염 결계',max:5,sl:1,d:'화염 저항',fx:{kind:'activeBuff',val:0,perSl:0,buff:'resist',type:'화염',tgt:'one_ally',mp:5}}
    ]});
    C.c2.classes.push({name:'축복사',custom:true,bonus:'mp',skills:[
      {n:'전체 격려가',max:5,sl:1,d:'아군 전체 HP +15',fx:{kind:'activeHeal',val:15,perSl:0,res:'hp',tgt:'all_allies',mp:10}}
    ]});
    C.c1.heroics.push({n:'성좌 참격',custom:true});
    C.c1.mp=60;C.c1.hp=20;C.c2.hp=20;
  });

  // activeDmg one_foe (10 + 5*2 = 20)
  const g0=T.st('고블린 대장').hp,mp0=T.st('레온').mp;
  T.open('레온');T.act('skill','성광 일섬');
  T.ok('커스텀 액티브 MP 선입력(10)',AF.mpc===10,AF.mpc);
  T.tg('고블린 대장');T.roll();T.apply();
  T.ok('성광 일섬 단일 빛 20 피해 & MP −10',g0-T.st('고블린 대장').hp===20&&mp0-T.st('레온').mp===10,`${g0-T.st('고블린 대장').hp},${mp0-T.st('레온').mp}`);

  // activeDmg all_foes without manual T.tg click (고블린 대장 화염 취약 => 24)
  T.next();
  const g1=T.st('고블린 대장').hp,s1=T.st('슬라임').hp,f1=T.st('불 정령').hp;
  T.open('레온');T.act('skill','유성 폭격');T.roll();T.apply();
  T.ok('유성 폭격 적 전체 자동 적용 (취약 24/12/12)',g1-T.st('고블린 대장').hp===24&&s1-T.st('슬라임').hp===12&&f1-T.st('불 정령').hp===12,`${g1-T.st('고블린 대장').hp}/${s1-T.st('슬라임').hp}/${f1-T.st('불 정령').hp}`);

  // activeStatus
  T.next();T.open('레온');T.act('skill','마비 독침');T.tg('고블린 대장');T.roll();T.apply();
  T.ok('마비 독침 poisoned 적용',T.st('고블린 대장').status.includes('poisoned'),T.st('고블린 대장').status);

  // activeBuff dmg+ (self, no T.tg click) & resist (one_ally -> 미라)
  T.next();T.open('레온');T.act('skill','전투 함성');T.roll();T.apply();
  T.ok('전투 함성 cwDmg:6 버프 적용',T.st('레온').efx.includes('cwDmg:6'),T.st('레온').efx);
  // verify cwDmg adds +6 to attack! (검 HR 6 + dmg 6 + cwDmg 6 = 18)
  T.next();
  const g2=T.st('고블린 대장').hp;
  T.open('레온');T.act('atk');T.tg('고블린 대장');T.dice(...H(6,5));T.roll();
  T.ok('cwDmg:6 다음 공격 피해 +6 반영',dmgOf('고블린 대장').dmg>=18,dmgOf('고블린 대장').dmg);
  AF.res=null;
  // 화염 결계 on 미라 (using sheet UI field ty:'화염') -> 불 정령 불꽃 (5+10=15) halved to 7
  T.next();T.open('레온');T.act('skill','화염 결계');T.tg('미라');T.roll();T.apply();
  T.ok('화염 결계 resist:화염 적용',T.st('미라').efx.includes('resist:화염'),T.st('미라').efx);
  const m0=T.st('미라').hp;
  T.next();T.open('불 정령');T.act('atk','불꽃');T.tg('미라');T.dice(...H(5,5));T.roll();T.apply();
  T.ok('화염 저항으로 불꽃 피해 절반 (7)',m0-T.st('미라').hp===7,m0-T.st('미라').hp);

  // activeHeal all_allies without manual click
  T.next();
  const l0=T.st('레온').hp,mi0=T.st('미라').hp;
  T.open('미라');T.act('skill','전체 격려가');T.roll();T.apply();
  T.ok('전체 격려가 아군 전체 HP +15',T.st('레온').hp-l0===15&&T.st('미라').hp-mi0===15,`${T.st('레온').hp-l0},${T.st('미라').hp-mi0}`);

  // active custom heroic skill directly from skill menu
  T.next();
  const f2=T.st('불 정령').hp;
  T.open('레온');T.act('skill','성좌 참격');T.tg('불 정령');T.roll();T.apply();
  T.ok('커스텀 액티브 영웅 기술 스킬 메뉴에서 직접 실행 (25 피해)',f2-T.st('불 정령').hp===25,f2-T.st('불 정령').hp);

  SYNC.set('fu.customClasses',[]);
});
