// in-page scenario tests for combat automation. Dice are forced through Math.random only when rd() asks.
(()=>{const T=window.T={res:[],q:[]};const orig=Math.random;
Math.random=function(){if(T.q.length&&/\bat rd\b/.test(new Error().stack||''))return T.q.shift();return orig()};
T.dice=(...p)=>{for(const[f,n]of p)T.q.push((f-.5)/n)};// [face, die size]
T.W=n=>{const w=RULES.weapons.find(x=>x.n===n)||RULES.weapons.find(x=>x.cat===n);return{...w,name:w.n}};
T.S=n=>{for(const L of Object.values(RULES.spells)){const s=L.find(x=>x.n===n);if(s)return{...s,mp:parseInt(s.mp)||0,mpTxt:String(s.mp)}}throw Error('spell '+n)};
T.sk=(cls,L)=>({name:cls,skills:L.map(([n,sl])=>({n,sl,max:10}))});
const A={dex:8,ins:8,mig:8,wlp:8};
T.base=()=>({
 c1:{id:'c1',name:'레온',owner:'GM',level:20,attr:{...A},hp:60,mp:40,ip:6,fp:3,bonus:{hp:20},classes:[T.sk('다크블레이드',[['고통',2],['어둠의 피',1],['그림자 일격',2]]),T.sk('웨폰마스터',[['뼈 분쇄',2],['돌파',2],['반격',1]]),T.sk('퓨리',[['광란',1],['도발',1],['버티기',1]])],
   heroics:[{n:'심장 분쇄'},{n:'분쇄 일격'},{n:'되든 안 되든'},{n:'찰나'}],bonds:[{to:'고블린 대장',adm:'',loy:'불신',aff:'증오'},{to:'미라',adm:'존경',loy:'',aff:''}],equip:{main:T.W('검'),off:{},armor:{},shield:{}},status:{},spells:[]},
 c2:{id:'c2',name:'미라',owner:'GM',level:20,attr:{...A},hp:50,mp:90,ip:6,fp:3,bonus:{mp:30},classes:[T.sk('엘리멘탈리스트',[['대격변',2],['마법검',2]]),T.sk('엔트로피스트',[['MP 흡수',2]]),T.sk('스피리티스트',[['치유의 힘',2],['지원 마법',1],['생명 마법',1]]),T.sk('키메리스트',[['흡수',1]]),T.sk('인보커',[['원소의 조화',1]])],
   heroics:[{n:'정화의 달빛'},{n:'비전 표식'},{n:'힘의 마법'},{n:'수리마법'},{n:'비마구스'},{n:'덧없는 평온'},{n:'오라술사의 굴절'}],bonds:[{to:'레온',adm:'',loy:'충성',aff:'애정'},{to:'카이',adm:'존경',loy:'',aff:''}],equip:{main:T.W('비전'),off:{},armor:{},shield:{}},status:{},
   spells:['풀구르','원소의 장막','원소 무기','비상 일격','소용돌이','테라','가속','변칙','어둠의 무기','마법 해제','정신 흡수','활력 흡수','거울','오메가','정지','움브라','오라','각성','장벽','격노 유발','환각','룩스','자비','강화','영혼 무기','무기력','치유','플레어'].map(T.S)},
 c3:{id:'c3',name:'카이',owner:'GM',level:20,attr:{...A},hp:55,mp:80,ip:4,fp:3,bonus:{},classes:[T.sk('오레이터',[['규탄',2],['격려',2],['너를 향한 믿음',1],['설득력',1]]),T.sk('커맨더',[['주교의 칙령',2],['왕의 성채',1],['돌격 기병',1],['분쇄의 전차',1],['여왕의 책략',1]]),T.sk('가디언',[['호위',1]]),T.sk('로그',[['영혼 훔치기',2],['고속',1]]),T.sk('샤프슈터',[['경고 사격',2]])],
   heroics:[{n:'반복'},{n:'드러난 신경'},{n:'타불라 라사'},{n:'끝없는 전장'},{n:'완벽한 조준'},{n:'약탈'},{n:'은신'},{n:'힘내!'},{n:'현명한 조언'},{n:'불굴'},{n:'고요한 사냥꾼'}],bonds:[{to:'레온',adm:'존경',loy:'충성',aff:''}],equip:{main:T.W('활'),off:{},armor:{},shield:{}},status:{},spells:[]},
 c4:{id:'c4',name:'루',owner:'GM',level:20,attr:{...A},hp:60,mp:40,ip:6,fp:2,bonus:{},classes:[T.sk('뮤턴트',[['아크로모르포시스',2],['바이오파지',2],['탈피',1]]),T.sk('댄서',[['전쟁 무희',1],['춤',1]]),T.sk('로어마스터',[['아는 것이 힘',1]]),T.sk('에스퍼',[['사이코키네시스',1]]),T.sk('다크블레이드',[['어둠의 심장',1]]),T.sk('퓨리',[['불굴의 정신',1]])],
   heroics:[{n:'상위 아크로모르포시스'},{n:'상위 탈피'},{n:'밀물'},{n:'소용돌이 떼'},{n:'상태 이상 면역'},{n:'용감한 방패 강타'},{n:'강철 숲'}],bonds:[],equip:{main:{},off:{},armor:{},shield:{}},status:{},spells:[]}});
T.foe=(id,name,o)=>({id,name,sp:'몬스터',lv:10,rank:0,villain:false,up:0,maxHp:80,hp:80,maxMp:40,mp:40,def:9,mdef:9,init:8,attr:{...A},aff:{},status:{},img:'',flip:false,size:1,note:'',reveal:true,atk:[{n:'할퀴기',a1:'dex',a2:'mig',acc:0,dmg:5,type:'물리',range:'근접'},{n:'불꽃',a1:'ins',a2:'wlp',acc:0,dmg:10,type:'화염',range:'원거리'},{n:'어둠 송곳',a1:'dex',a2:'ins',acc:0,dmg:10,type:'어둠',range:'원거리'}],spells:[],skills:[],...o});
T.reset=(mod)=>{const ch=T.base();for(const k in CH)delete CH[k];Object.assign(CH,ch);
  P.party=['c1','c2','c3','c4'];P.combat={...defPlay().combat,started:true,round:1,first:'pc',acted:{},enemies:[T.foe('e1','고블린 대장',{rank:1,aff:{화염:'vu',독:'im'}}),T.foe('e2','슬라임',{lv:6,maxHp:30,hp:30,aff:{물리:'rs',냉기:'ab'}}),T.foe('e3','불 정령',{sp:'정령',maxHp:40,hp:40})]};P.clocks=[{name:'설득',size:6,filled:0}];
  if(mod)mod(CH,P);for(const c of Object.values(CH)){const d=derive(c);c.hp=Math.min(c.hp,d.maxHp);c.mp=Math.min(c.mp,d.maxMp)}saveC();saveP();T.q=[];$('#modal').innerHTML='';Object.keys(AF).forEach(x=>delete AF[x])};
T.k=n=>{const c=Object.values(CH).find(x=>x.name===n);if(c)return'c:'+c.id;const e=P.combat.enemies.find(x=>x.name===n);if(e)return'e:'+e.id;throw Error('no unit '+n)};
T.u=n=>unitOf(T.k(n));
T.open=n=>{actOpen(T.k(n));if(!AF.k)throw Error('actOpen failed '+n)};
T.act=(act,opt)=>{const u=unitOf(AF.k);AF.act=act;AF.targets=[];AF.res=null;AF.step='tgt';if(opt!=null){const L=act==='skill'?actorSkills(u.o):actOptions(u,act);const i=L.findIndex(x=>x.n===opt);if(i<0)throw Error(`option ${opt} not in ${act}: ${L.map(x=>x.n)}`);AF.opt=i;if(act==='skill'){AF._pf='';renderAct()}}};
T.tg=(...ns)=>{AF.targets=ns.map(T.k)};
T.roll=()=>{actRoll();T.q=[];if(!AF.res&&!AF.finished)throw Error('no result: '+[...document.querySelectorAll('.toast')].map(x=>x.textContent).slice(-1))};
T.group=id=>AF.res?.ch?.find(g=>g.id===id||g.id.startsWith(id+':'));
T.pick=(id,label)=>{const ci=AF.res.ch.findIndex(g=>g.id===id||g.id.startsWith(id+':'));if(ci<0)throw Error('no choice '+id+' in '+(AF.res.ch||[]).map(g=>g.id));const g=AF.res.ch[ci],vi=g.opts.findIndex(o=>o.l.includes(label));if(vi<0)throw Error(`no option ${label} in ${id}: ${g.opts.map(o=>o.l)}`);if(g.max>1?!g.sel.includes(vi):g.sel!==vi)autoChoose(ci,vi)};// sets, never toggles off
T.unpick=id=>{const g=T.group(id);if(g)g.sel=g.max>1?[]:null};
T.W1=()=>CH.c1.equip.main.name;
T.apply=()=>{if(AF.res?.apply)actApply();else actFinish()};
T.st=n=>{const t=T.u(n);return{hp:t.o.hp,mp:t.o.mp,ip:t.o.ip,fp:t.o.fp,status:Object.keys(t.o.status||{}).filter(s=>t.o.status[s]),efx:efx(t.o).map(e=>e.k+(e.v!=null?':'+e.v:'')),lock:t.o.lock||[]}};
T.log=n=>LS.get('fu.log',[]).slice(-(n||6)).map(e=>e.kind==='text'?e.who+': '+e.text:e.who+' roll '+e.total).join(' | ');
T.ok=(name,cond,detail)=>{T.res.push([name,!!cond,cond?'':String(detail??'')])};
T.run=(name,fn)=>{try{fn()}catch(e){T.res.push([name,false,'EXC '+e.message+' @ '+String(e.stack).split('\n')[1]])}};
T.next=()=>{P.combat.round++;P.combat.acted={};saveP()};
})();
