/*tpaper*/
// 종이 여행 지도: the travel tab's world map as a pop-up paper book (tools/travel_paper). The 2D map stays underneath
// for the GM's editing (pins, routes); the paper view sits over it, follows the same data, and folds open each time the
// tab is entered. P.map.paper = the print set every window uses (GM picks it); the camera is each viewer's own:
// the view (위에서/3인칭/1인칭) is never sent to the room, and each window remembers its own pick (fu.paper.view).
const TP={ctl:null,mod:null,host:null,bar:null,pan:null,edit:false,cat:'tree',kind:null,loading:null,wasMap:false,preEdit:null,
  view:(()=>{try{const v=localStorage.getItem('fu.paper.view');return['over','third','first'].includes(v)?v:'over'}catch{return 'over'}})(),
  on:(()=>{try{return localStorage.getItem('fu.paper')!=='0'}catch{return true}})(),
  NAMES:{core:'코어 룰북',high:'하이 판타지',techno:'테크노 판타지',natural:'내추럴 판타지'}};
function tpEnsure(){
  if(TP.loading)return TP.loading;
  TP.loading=import('tp/travel3d.js').then(m=>{TP.mod=m;
    const assets=JSON.parse(byId('tpaper-data').textContent);
    TP.host=document.createElement('div');TP.host.className='tphost';
    TP.ctl=m.mountTravel(TP.host,{assets,theme:P.map.paper||'core',skin:tpSkin(),view:TP.view,onView:v=>{TP.view=v;if(!TP.edit)try{localStorage.setItem('fu.paper.view',v)}catch{}tpBar()},
      onPick:p=>{V.pop=p.id;renderLoc()},onEdit:tpOnEdit});
    return TP.ctl}).catch(e=>{console.error(e);toast('종이 지도를 불러오지 못했어요 (인터넷 연결 확인)',true);TP.on=false;TP.loading=null;throw e});
  return TP.loading}
function tpBar(){const w=$('.mapwrap');if(!w||!P.map.img){TP.bar?.remove();return}
  if(!TP.bar){TP.bar=document.createElement('div');TP.bar.className='tpbar';
    TP.bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.tp;
      if(a==='on'){TP.on=!TP.on;try{localStorage.setItem('fu.paper',TP.on?'1':'0')}catch{}TP.wasMap=false;renderMap()}
      else if(a==='view')TP.ctl?.setView(b.dataset.v);
      else if(a==='replay')TP.ctl?.replay()
      else if(a==='edit'&&GM){TP.edit=!TP.edit;if(TP.edit)TP.preEdit=TP.view;TP.ctl?.edit(TP.edit);if(TP.edit){TP.view='over'}
        else if(TP.preEdit){const v=TP.preEdit;TP.preEdit=null;TP.ctl?.setView(v)}tpBar()}});
    TP.bar.addEventListener('change',e=>{if(e.target.dataset.tp==='theme'&&GM){P.map.paper=e.target.value;saveP();TP.ctl?.setTheme(P.map.paper)}})}
  const on=tpActive(),th=P.map.paper||'core';
  TP.bar.innerHTML=`<button class="btn${on?' gold':''}" data-tp="on">종이 지도</button>${on?`<span class="tpseg">${[['over','위에서'],['third','3인칭'],['first','1인칭']].map(([v,n])=>`<button class="btn${TP.view===v?' gold':''}" data-tp="view" data-v="${v}">${n}</button>`).join('')}</span>
    ${GM?`<select class="sel" data-tp="theme">${Object.entries(TP.NAMES).map(([k,n])=>`<option value="${k}"${k===th?' selected':''}>${n}</option>`).join('')}</select>`:`<span class="tpth">${TP.NAMES[th]}</span>`}<button class="btn" data-tp="replay" title="다시 펼치기">다시 펼치기</button>${GM?`<button class="btn${TP.edit?' gold':''}" data-tp="edit">배치</button>`:''}`:''}`;
  if(TP.bar.parentNode!==w)w.append(TP.bar);tpPanel()}
// each viewer's own UI theme picks the art (same layout for everyone); the world style is the GM's, for the room
function tpSkin(){const t=document.documentElement.dataset.theme;return t==='ff'||t==='octo'?t:'metaphor'}
{const _at=applyTheme;applyTheme=function(){const r=_at.apply(this,arguments);TP.ctl?.setSkin(tpSkin());return r}}
// the paper view is off while the GM places a pin or draws a route (those need the flat map)
function tpActive(){return TP.on&&!!P.map.img&&V.mode!=='pin'&&V.mode!=='route'}
function tpData(url){const M=P.map;return{img:url,pins:(M.pins||[]).filter(p=>GM||!p.hidden),routes:(M.routes||[]).map(r=>({id:r.id,pts:r.pts,prog:r.prog||0})),party:M.party,objs:M.objs||[],activeRoute:V.route||null}}
async function tpSync(){
  const w=$('.mapwrap');tpBar();
  const entering=!TP.wasMap;TP.wasMap=true;
  if(!w||!tpActive()){TP.host?.remove();w?.classList.remove('tpon');return}
  const ctl=await tpEnsure().catch(()=>null);if(!ctl)return;
  const w2=$('.mapwrap');if(!w2||!tpActive())return;
  if(TP.host.parentNode!==w2)w2.querySelector('.map')?.after(TP.host);w2.classList.add('tpon');
  const url=await IMG.url(P.map.img);if(!url)return;
  const first=!ctl._S.data;await ctl.setData(tpData(url),{rise:entering});
  if(entering&&!first)ctl.replay();
  if((P.map.paper||'core')!==ctl.theme)ctl.setTheme(P.map.paper||'core')}
{const _rm=renderMap;renderMap=function(){const r=_rm.apply(this,arguments);tpSync();return r}}
{const _r=render;render=function(){const r=_r.apply(this,arguments);if(tab!=='map')TP.wasMap=false;return r}}
// the progress slider moves the carriage live (routeProg only re-renders the location box)
{const _rp=routeProg;routeProg=function(){const r=_rp.apply(this,arguments);if(TP.ctl&&tpActive()&&TP.ctl._S.data)TP.ctl.setData({...TP.ctl._S.data,routes:tpData('').routes,party:P.map.party,activeRoute:V.route||null});return r}}
// ---- GM placing: a picker of every printed piece; click the page to stand one up, drag to move, wheel = size, Delete
function tpPanel(){const w=$('.mapwrap');
  if(!GM||!TP.edit||!tpActive()||!w||!TP.mod){TP.pan?.remove();return}
  if(!TP.pan){TP.pan=document.createElement('div');TP.pan.className='tpedit';
    TP.pan.addEventListener('click',e=>{const b=e.target.closest('[data-tpc],[data-tpk],[data-tpa]');if(!b)return;
      if(b.dataset.tpc){TP.cat=b.dataset.tpc;tpPanel()}
      else if(b.dataset.tpk){TP.kind=TP.kind===b.dataset.tpk?null:b.dataset.tpk;TP.ctl?.place(TP.kind);tpPanel()}
      else{const id=TP.ctl?.selected;if(!id)return;const a=b.dataset.tpa;
        if(a==='del')tpOnEdit({type:'delete',id});else tpOnEdit({type:'scale',id,f:a==='up'?1.15:1/1.15})}})}
  const C=TP.mod.CATALOG,cat=C[TP.cat]?TP.cat:'tree',sel=TP.ctl?.selected,so=sel&&tpFind(sel);
  TP.pan.innerHTML=`<div class="tpcats">${Object.entries(C).map(([k,c])=>`<button class="btn${k===cat?' gold':''}" data-tpc="${k}">${c.name}</button>`).join('')}</div>
   <div class="tpgrid">${C[cat].items.map(([k,n])=>`<button class="tpk${TP.kind===k?' on':''}" data-tpk="${k}" title="${n}"><img src="${TP.ctl.thumb(k)}" alt=""><span>${n}</span></button>`).join('')}</div>
   <div class="tpsel">${so?`<b>${esc(tpName(so.k))}</b><button class="btn" data-tpa="down">작게</button><button class="btn" data-tpa="up">크게</button>${so.pin?'':'<button class="btn x" data-tpa="del">치우기</button>'}`:`<span class="muted">${TP.kind?'지도를 눌러 세우기':'목록에서 고르거나, 세운 조각을 눌러 고르기'}</span>`}</div>
   <div class="tphelp muted">끌기: 옮기기 · 휠: 크기 · Delete: 치우기</div>`;
  if(TP.pan.parentNode!==w)w.append(TP.pan)}
function tpName(k){for(const c of Object.values(TP.mod.CATALOG))for(const[kk,n]of c.items)if(kk===k)return n;return k}
// a placed thing by its paper id: {k, s, obj} for objects, {k, s, pin} for a pin's building
function tpFind(id){if(id.startsWith('pin:')){const p=P.map.pins.find(x=>'pin:'+x.id===id);return p&&{k:TP.mod.pinBuilding(p),s:p.bs||1,pin:p}}
  const o=(P.map.objs||[]).find(x=>x.id===id);return o&&{k:o.k,s:o.s||1,obj:o}}
function tpOnEdit(ev){if(!GM)return;const M=P.map;M.objs||(M.objs=[]);
  if(ev.type==='select'){tpPanel();return}
  if(ev.type==='place'){const o={id:'o'+uid(),k:ev.k,x:+ev.x.toFixed(4),y:+ev.y.toFixed(4),s:1};M.objs.push(o);TP.ctl.select(o.id)}
  else{const f=tpFind(ev.id);if(!f)return;const t=f.obj||f.pin;
    if(ev.type==='move'){t.x=+ev.x.toFixed(4);t.y=+ev.y.toFixed(4)}
    else if(ev.type==='scale'){const v=clamp((f.s||1)*ev.f,.4,3);if(f.pin)t.bs=+v.toFixed(3);else t.s=+v.toFixed(3)}
    else if(ev.type==='delete'){if(f.pin){toast('장소 핀의 건물은 핀 메뉴에서 바꾸거나 지워요');return}M.objs=M.objs.filter(x=>x.id!==ev.id);TP.ctl.select(null)}}
  saveP();tpSync();tpPanel()}
// pin editor: which building stands for this place on the paper map
{const _pf=pinForm;pinForm=function(p,isNew){const r=_pf.apply(this,arguments);if(!TP.mod)return r;
  const C=TP.mod.CATALOG,g=$('#modal .g'),cur=p.bld||'';
  g?.insertAdjacentHTML('beforeend',`<label class="span4">종이 지도 건물<select class="sel" id="pbld"><option value="">자동 (종류에 맞춤)</option>${['settle','dungeon','landmark','travel'].map(c=>`<optgroup label="${C[c].name}">${C[c].items.map(([k,n])=>`<option value="${k}"${k===cur?' selected':''}>${n}</option>`).join('')}</optgroup>`).join('')}</select></label>`);
  const b=$('#psave'),go=b.onclick;b.onclick=()=>{const v=$('#pbld')?.value;if(v)p.bld=v;else delete p.bld;go()};return r}}
// speech bubbles ("…" / '…' in chat) and skill popups on the paper map: the flat map they were made for lies under the
// paper view, so they move above it and follow their anchor every frame — the speaker's token (or the carriage) from
// above and from behind; in first person the carriage is behind the seat, so the line shows low in the middle
function tpHoist(sel,anchor){const w=$('.mapwrap');if(!w||!TP.ctl||!TP.host?.isConnected)return;
  for(const el of $$(sel,byId('map'))){w.append(el);el.classList.add('tpsay');
    const go=()=>{if(!el.isConnected||!TP.host?.isConnected)return;const p=TP.ctl.screenOf(anchor),W=w.clientWidth,H=w.clientHeight;
      let x=p?p.x:W/2,y=p?p.y:H*.72;el.classList.toggle('tplow',!p);
      // keep the bubble on screen: its box sits above the point, so the point stays the box height below the top edge
      const b=el.firstElementChild?.getBoundingClientRect(),bh=b?.height||80,bw=b?.width||200;
      x=clamp(x,bw/2+12,W-bw/2-12);y=clamp(y,bh+16,H-24);el.style.left=x+'px';el.style.top=y+'px';requestAnimationFrame(go)};go()}}
function tpAnchorFor(k){const[t0,id]=String(k||'').split(':'),tk=t0==='c'&&P.map.toks?.find(x=>x.cid===id);return tk?{x:tk.x,y:tk.y}:'car'}
{const _ms=mapSay;mapSay=function(m,q){const r=_ms.apply(this,arguments);if(tpActive())tpHoist('.mapsay:not(.skhost)',tpAnchorFor(m.at||m.who));return r}}
{const _sk=skShow;skShow=function(c,p){const r=_sk.apply(this,arguments);if(tpActive()&&!byId('arena'))tpHoist('.skhost',tpAnchorFor('c:'+c.id));return r}}
/*/tpaper*/
