// ---------------- Batch 2: 오늘의 특선, 유통기한, 마법구·비밀 제조법, 교역 포인트, 매의 눈·미끼 함정, 파일럿, 충직한 동료·대소환 ----------------
T.run('오늘의 특선: 3맛 일치 시 일반 효과 무시 + 특선 효과 적용',()=>{
  T.reset((C)=>{C.c2.classes.push(T.sk('구르메',[['요리',2]]));C.c2.heroics.push({n:'오늘의 특선'});
    C.c2.cook={ing:{단맛:3,신맛:3,짠맛:3},book:{}};C.c2.specialTastes=['단맛','신맛','짠맛'];C.c2.specialFx=['1:빛','3','8'];
    efxAdd(T.u('고블린 대장'),{n:'원소의 장막',k:'resist',v:'불',spell:true,end:'scene'});
    C.c1.status={dazed:true}});
  const hp0=T.st('고블린 대장').hp;
  T.open('미라');T.act('skill','요리');T.roll();T.pick('mode','무료 공격');T.pick('i1','단맛');T.pick('i2','신맛');T.pick('i3','짠맛');
  T.pick('spec','오늘의 특선');T.pick('specCure','혼란');T.apply();
  T.ok('오늘의 특선 무료 공격 연계',AF.act==='atk'&&AF.x?.cook?.special?.length===3);
  T.tg('고블린 대장');T.dice(...H(7,6));T.roll();T.apply();
  T.ok('빛 20 피해 적용',hp0-T.st('고블린 대장').hp===20,hp0-T.st('고블린 대장').hp);
  T.ok('장면 지속 주문 제거',!T.st('고블린 대장').efx.some(x=>x.startsWith('resist:')));
  // 아군 대상 + 8번 상태 이상 회복
  T.next();T.open('미라');T.act('skill','요리');T.roll();T.pick('mode','나·아군');T.pick('i1','단맛');T.pick('i2','신맛');T.pick('i3','짠맛');
  T.pick('ctg','레온');T.pick('spec','오늘의 특선');T.pick('specCure','혼란');T.apply();
  T.ok('특선 8번 혼란 회복',!T.st('레온').status.includes('dazed'),T.st('레온').status);
});

T.run('유통기한: 요리·치유약·연금술 HP 회복 → 독 피해 (2+명 절반, 속성 고정)',()=>{
  // 1) 요리
  T.reset((C)=>{C.c2.classes.push(T.sk('구르메',[['요리',2],['정성 가득',1]]),T.sk('머천트',[['유통기한',2]]));
    C.c2.cook={ing:{쓴맛:3,짠맛:3},book:{'쓴맛+짠맛':{e:3,p:null}}};
    P.combat.enemies[1].efx=[{n:'변환',k:'ttype',v:'화염',end:'scene'}];P.combat.enemies[2].status={}});
  const s0=T.st('슬라임').hp,f0=T.st('불 정령').hp;
  T.open('미라');T.act('skill','요리');T.roll();T.pick('mode','나·아군');T.pick('i1','쓴맛');T.pick('i2','짠맛');
  T.pick('ctg','슬라임');T.pick('ctg','불 정령');T.pick('exp','독 피해');T.apply();
  T.ok('요리 유통기한 2명 절반 독 피해 15',s0-T.st('슬라임').hp===15&&f0-T.st('불 정령').hp===15,(s0-T.st('슬라임').hp)+','+(f0-T.st('불 정령').hp));
  // 2) 치유약 (1명 30)
  T.reset((C)=>{C.c2.classes.push(T.sk('머천트',[['유통기한',2]]));});
  const e0=T.st('슬라임').hp;
  T.open('미라');T.act('item');AF.item=RULES.items.findIndex(x=>x.n==='치유약');AF.expItem=true;T.tg('슬라임');T.roll();T.apply();
  T.ok('치유약 유통기한 독 30 피해',e0-T.st('슬라임').hp===30,e0-T.st('슬라임').hp);
  // 3) 연금술 배합 (HP 50 → 독 30)
  T.reset((C)=>{C.c2.classes.push(T.sk('팅커러',[['도구',2]]),T.sk('머천트',[['유통기한',2]]));C.c2.picks={도구:['연금술 기초']}});
  const a0=T.st('슬라임').hp;
  T.open('미라');T.act('skill','도구');T.roll();T.pick('gm','연금술');T.pick('gt','기초');T.dice([8,20],[16,20]);T.apply();
  T.pick('gd1','주사위 1');T.pick('gd2','아무 눈: HP');T.pick('gu','슬라임');T.pick('gexp','독 피해');T.apply();
  T.ok('연금술 유통기한 독 30 피해',a0-T.st('슬라임').hp===30,a0-T.st('슬라임').hp);
});

T.run('마법구 + 비밀 제조법 + 교역 포인트(들어 본 적 있어! / 개인 재고)',()=>{
  T.reset((C)=>{C.c2.classes.push(T.sk('팅커러',[['도구',3],['비밀 제조법',2]]),T.sk('머천트',[['들어 본 적 있어!',2],['개인 재고',2]]));
    C.c2.picks={도구:['마도기술 기초','마도기술 고급','마도기술 최상급']};C.c2.tp=2;
    C.c2.magispheres=[{...T.S('플레어'),cls:'엘리멘탈리스트'},{...T.S('치유'),cls:'스피리티스트'}]});
  const ip0=T.st('미라').ip,hpE0=T.st('고블린 대장').hp;
  T.open('미라');T.act('skill','도구');T.roll();T.pick('gm','마법구');T.pick('gmagi','플레어');T.apply();
  T.ok('마법구 제작 IP −2 및 시전 연계',T.st('미라').ip===ip0-2&&AF.act==='spell'&&AF.x?.magiSpell?.n==='플레어');
  T.tg('고블린 대장');T.dice(...H(7,6));T.roll();T.apply();
  // 고블린 대장 화염 취약(×2): (7+25+2)*2 = 68
  T.ok('플레어(HR 7+25)+비밀 제조법(+2) 취약=68',hpE0-T.st('고블린 대장').hp===68,hpE0-T.st('고블린 대장').hp);
  // 들어 본 적 있어! + 개인 재고
  T.next();
  T.open('미라');T.act('study');T.tg('고블린 대장');T.dice(...H(3,3));T.roll();
  const tot0=AF.res.e.total;autoTpStudy('c2');
  T.ok('들어 본 적 있어! TP −1, 판정 +4',T.st('미라').ip===ip0-2&&auTp(CH.c2)===1&&AF.res.e.total===tot0+4,AF.res.e.total-tot0);
  AF.res=null;
  const ip1=T.st('미라').ip;
  T.act('item');AF.item=RULES.items.findIndex(x=>x.n==='치유약');AF.tpIp='c2';T.tg('레온');T.roll();T.apply();
  T.ok('개인 재고 TP −1로 치유약 IP 면제',auTp(CH.c2)===0&&T.st('미라').ip===ip1,auTp(CH.c2)+','+T.st('미라').ip);
});

T.run('매의 눈(피해 보너스 / 무료 공격) + 미끼 함정 설치 및 파괴 반격',()=>{
  T.reset((C,P)=>{C.c3.classes.push(T.sk('샤프슈터',[['매의 눈',2]]));C.c3.heroics.push({n:'미끼 함정'});P.combat.enemies[1].aff={물리:'im'}});
  const mp0=T.st('카이').mp;
  T.open('카이');T.act('guard');T.roll();T.pick('hawk','원거리 공격 피해');T.pick('decoy','설치');T.apply();
  T.ok('미끼 함정 설치 (MP −10, HP 20)',mp0-T.st('카이').mp===10&&P.combat.decoy?.hp===20,JSON.stringify(P.combat.decoy));
  T.next();
  T.open('카이');T.act('atk');T.tg('고블린 대장');T.dice(...H(7,6));T.roll();
  T.ok('매의 눈 다음 원거리 피해 +4',dmgOf('고블린 대장').dmg>=19,dmgOf('고블린 대장').dmg);
  T.apply();
  P.combat.decoy.hp=10;saveP();
  T.next();T.open('고블린 대장');T.act('atk');T.tg('레온');T.dice(...H(8,8),[4,10]);T.roll();
  T.apply();
  T.ok('미끼 함정 파괴',!P.combat.decoy&&T.log().includes('미끼 함정: 파괴!'),T.log());
  auQueueRun([{k:'c:c3',kind:'decoy',tk:'e:e1',sl:2}]);
  T.ok('미끼 함정 무료 반격 연계 (저항·면역 무시)',AF.k==='c:c3'&&AF.x?.decoy===1&&AF.act==='atk',AF.k+':'+AF.act);
  const im0=T.st('슬라임').hp;
  T.tg('슬라임');T.dice(...H(7,6));T.roll();T.apply();
  T.ok('면역 적(슬라임)에게도 물리 피해 통과',im0-T.st('슬라임').hp>0,im0-T.st('슬라임').hp);
  T.reset((C)=>{C.c3.classes.push(T.sk('샤프슈터',[['매의 눈',2]]));});
  T.open('카이');T.act('guard');T.roll();T.pick('hawk','무료 공격');T.apply();
  T.ok('매의 눈 즉시 무료 공격 연계 (HR 0)',AF.act==='atk'&&AF.x?.hr0===1&&AF.x?.ranged===1);
});

T.run('파일럿: 압축 기술·확장 장갑·좌석·보조 공격·출력 강화·터보·유연한 구성',()=>{
  const wm=GEAR_CATALOG.find(x=>x.kind==='modules'&&x.moduleKind==='weapon');
  const wm2=GEAR_CATALOG.filter(x=>x.kind==='modules'&&x.moduleKind==='weapon')[1]||wm;
  // 1) 외골격 압축 탑승 IP 0
  T.reset((C)=>{C.c1.classes.push(T.sk('파일럿',[['개인 탈것',3],['압축 기술',1]]));
    C.c1.vehicle={frame:'외골격',driving:false,hands:[wm.id,''],armor:'TF|modules|중장갑',support:['TF|modules|출력 강화']}});
  autoCompressBoard('c:c1');
  T.ok('외골격 압축 탑승 IP 0 · acted 처리',CH.c1.vehicle.driving===true&&CH.c1.ip===6&&!!P.combat.acted['c:c1'],gearVehicleErrors(CH.c1).join(','));
  // 2) 메카: 확장 장갑+좌석·보조 공격·유연한 구성
  T.reset((C)=>{C.c1.classes.push(T.sk('파일럿',[['개인 탈것',3],['유연한 구성',2]]));
    C.c1.vehicle={frame:'메카',driving:true,hands:[wm.id,''],armor:'TF|modules|중장갑',support:['TF|modules|확장 장갑','TF|modules|좌석','TF|modules|보조 공격'],aux:wm2.id,passengers:['c2'],inactive:[wm2.id]}});
  T.ok('확장 장갑+좌석 → 탑승자 방어도/마방 증가',derive(CH.c2).def>=12,derive(CH.c2).def);
  T.ok('보조 공격 무기 actOptions 포함',actOptions(T.u('레온'),'atk').some(o=>o.n===wm2.n));
  const actH=CH.c1.vehicle.hands[0];
  CH.c1.vehicle.hands[0]='';CH.c1.vehicle.inactive=CH.c1.vehicle.inactive.filter(x=>x!==wm2.id);CH.c1.vehicle.hands[0]=wm2.id;CH.c1.vehicle.inactive.push(actH);
  T.ok('유연한 구성 swap 유효',gearVehicleErrors(CH.c1).length===0,gearVehicleErrors(CH.c1).join(','));
  // 3) 메카: 출력 강화+터보 판정 보너스
  T.reset((C)=>{C.c1.classes.push(T.sk('파일럿',[['개인 탈것',3]]));
    C.c1.vehicle={frame:'메카',driving:true,hands:[wm.id,''],support:['TF|modules|출력 강화','TF|modules|터보']}});
  T.open('레온');T.act('obj');AF.vpow=true;AF.vturb=true;T.dice(...H(3,3));T.roll();
  T.ok('출력 강화+터보 (+4)',AF.res.e.total===10,AF.res.e.total);
});

T.run('충직한 동료 + 아케이니스트 대소환',()=>{
  T.reset((C)=>{C.c4.classes.push(T.sk('웨이페어러',[['충직한 동료',2]]));C.c4.heroics.push({n:'영웅의 동료'});
    C.c4.companion={name:'포치',sp:'야수',attr:{dex:8,ins:8,mig:10,wlp:8},dmg:6};
    C.c2.level=30;C.c2.classes.push(T.sk('아케이니스트',[['결속과 소환',2]]));C.c2.heroics.push({n:'대소환'});C.c2.picks={아르카나:['대장간','참나무']} });
  autoCompSummon('c:c4');
  const cp=P.combat.allies.find(a=>a.id==='comp_c4');
  T.ok('충직한 동료 소환 (HP 40, 명중 +2)',cp&&cp.maxHp===40&&cp.atk[0].acc===2,cp?.maxHp+','+cp?.atk?.[0]?.acc);
  autoCompAct('c:c4');T.act('atk');T.tg('고블린 대장');T.dice(...H(7,6));T.roll();T.apply();
  T.ok('동료 행동 후 주인 acted 소비',!!P.combat.acted['c:c4']&&T.st('고블린 대장').hp<80);
  const fp0=T.st('미라').fp,hp0=T.st('미라').hp;
  T.open('미라');T.act('skill','결속과 소환');T.roll();T.pick('arc','대장간');T.pick('grand','악마 병사');T.pick('grandA','MIG');T.pick('grandR','화염');T.pick('grandR','번개');T.pick('grandU','원거리');T.pick('grandU','추가 피해');T.apply();
  const gs=P.combat.allies.find(a=>a.id==='arc_c2');
  T.ok('대소환 악마 병사 소환 (FP −1, HP 절반, Lv 30)',gs&&gs.lv===30&&gs.ownTurn&&T.st('미라').fp===fp0-1&&T.st('미라').hp===hp0-Math.floor(hp0/2),gs?.name+','+T.st('미라').fp);
  xactOpen('a:arc_c2','more');T.act('skill',gs.skills[0].n);T.roll();T.pick('arcDisT','고블린 대장');T.pick('arcDisPay','사라짐');T.apply();
  T.ok('대소환 해제 후 사라짐',!P.combat.allies.some(a=>a.id==='arc_c2'));
});
