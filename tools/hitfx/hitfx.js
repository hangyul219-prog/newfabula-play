/* ================= hit impact (WebGL): hit-stop, silhouette flash + RGB split, knockback, screen shake, the theme's drawn hit art burst with zoom-smear and noise burn-out, shards cut from that art ================= */
const HFX={gl:null,cv:null,prog:null,buf:null,loc:{},tex:new Map(),list:[],raf:0,fail:false,shake:{a:0,t0:0,dur:0},
 TINT:{physical:[1,1,1],fire:[1,.55,.22],ice:[.6,.9,1],bolt:[1,.96,.55],air:[.72,1,.82],earth:[.9,.68,.4],dark:[.72,.5,1],light:[1,.97,.82],poison:[.74,1,.4]},
 VS:`attribute vec2 p;uniform vec4 R;uniform float A;uniform vec2 C;varying vec2 v;void main(){v=p;vec2 q=(p-.5)*R.zw;q=vec2(q.x*cos(A)-q.y*sin(A),q.x*sin(A)+q.y*cos(A));vec2 s=R.xy+q;gl_Position=vec4(s.x/C.x*2.-1.,1.-s.y/C.y*2.,0,1);}`,
 FS:`precision mediump float;varying vec2 v;uniform sampler2D T;uniform int M;uniform vec3 K;uniform float F,G,U,S;uniform vec2 X;uniform vec4 B;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
  void main(){
   if(M==0){float a=texture2D(T,v).a,r=texture2D(T,v+X).a,b=texture2D(T,v-X).a;
     vec3 c=K*a*F+vec3(1.,.18,.2)*r*G+vec3(.2,.8,1.)*b*G;gl_FragColor=vec4(c,max(a*F,max(r,b)*G));return;}
   if(M==1){vec2 d=v-.5;vec4 c=vec4(0);for(int i=0;i<5;i++){c+=texture2D(T,.5+d*(1.-S*float(i)));}c/=5.;
     float l=dot(c.rgb,vec3(.3,.59,.11)),q=n(v*7.+U*3.)*.65+l*.35,w=smoothstep(U-.08,U+.04,q),e=w*(1.-smoothstep(U+.04,U+.16,q));
     c.rgb=mix(c.rgb,K*c.a,e*.45);gl_FragColor=c*w*F;return;}
   vec2 t=B.xy+v*B.zw;if(M==3){gl_FragColor=texture2D(T,t)*F;return;}float m=1.-smoothstep(.36,.5,abs(v.x-.5)+abs(v.y-.5)*.55);gl_FragColor=texture2D(T,t)*m*F;}`,
 init(){if(this.gl||this.fail)return!!this.gl;try{const cv=document.createElement('canvas');cv.className='hfx';const gl=cv.getContext('webgl',{premultipliedAlpha:true,alpha:true,antialias:true});if(!gl)throw 0;
   const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);return o},pr=gl.createProgram();
   gl.attachShader(pr,sh(gl.VERTEX_SHADER,this.VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,this.FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw 'link';gl.useProgram(pr);
   const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);const pl=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
   for(const k of['R','A','C','T','M','K','F','G','U','S','X','B'])this.loc[k]=gl.getUniformLocation(pr,k);
   gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
   cv.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;this.tex.clear();this.list=[];this.fail=true;this.cleanup()});
   Object.assign(this,{gl,cv,prog:pr,buf});return true}catch(e){console.warn('hit fx: WebGL off',e);this.fail=true;return false}},
 mkTex(src){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);for(const[k,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));if(src)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);return t},
 seq(name){const th=document.documentElement.dataset.theme||'metaphor',key=[th+'/vfxseq/'+name,'metaphor/vfxseq/'+name].find(k=>FXDATA[k]);if(!key)return null;const r=this.art(null,key);if(r&&!r.m)r.m={c:4,r:2,n:8,ms:62,...((typeof FXSEQ!=='undefined'&&FXSEQ[key])||{})};return r},
 art(name,fixed){const th=document.documentElement.dataset.theme||'metaphor',key=th+'/vfx/'+name,src=fixed?FXDATA[fixed]:FXDATA[key]||FXDATA['metaphor/vfx/'+name];if(!src)return null;let r=this.tex.get(src);
   if(!r){r={t:null,ok:false};this.tex.set(src,r);const im=new Image();im.onload=()=>{if(!this.gl)return;r.t=this.mkTex(im);r.ok=true;r.im=im};im.src=src}return r},
 attach(){const ar=byId('arena'),un=byId('units');if(!ar||!un)return false;if(this.cv.parentNode!==ar||this.cv.previousElementSibling!==un)un.after(this.cv);
   if(!this.top){this.top=document.createElement('div');this.top.className='hfx-top'}if(this.top.previousElementSibling!==this.cv)this.cv.after(this.top);return true},
 /* the damage number would sit under the burst: lift the newest one onto a layer over the canvas, same spot, same theme look */
 liftNum(el){const n=[...el.querySelectorAll('.body>.dmgn')].pop(),bd=el.querySelector('.body');if(!n||!bd)return;const a=byId('arena').getBoundingClientRect(),r=bd.getBoundingClientRect(),ph=parseFloat(n.style.getPropertyValue('--ph'))||0;
   n.style.left=(r.left+r.width/2-a.left).toFixed(1)+'px';n.style.bottom=(a.bottom-(r.top-ph)).toFixed(1)+'px';n.style.top='auto';this.top.append(n)},
 /* one hit on one unit: el = .spr, d = HP change (<0), ty = VFX_TY name, cr = crit, ko */
 hit(el,u,d,ty,cr,ko){if(!this.init()||!this.attach())return false;const now=performance.now(),rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
   const p=Math.min(1.25,Math.max(.4,Math.abs(d)/Math.max(1,u.max||1)*3))*(cr?1.35:1),hs=rm?0:Math.round(55+55*Math.min(p,1)+(cr?60:0)),dir=(u.pc||u.ally)?-1:1;
   const e={el,u,k:u.k,t0:now,hs,p,dir,cr,ko,tint:this.TINT[ty]||this.TINT.physical,img:el.querySelector('.bob img'),sp:null,spOk:true,seed:Math.random()*6.28,
     bursts:[{art:this.art('hit-'+ty),seq:this.seq('hit-'+ty),at:0,sz:1.15},...(cr?[{art:this.art('crit'),seq:this.seq('crit'),at:90,sz:1.35}]:[]),...(ko?[{art:this.art('ko'),seq:this.seq('ko'),at:380,sz:1.3}]:[])],shards:[],shDone:false};
   for(const x of this.list)if(x.k===e.k){x.dead=true}// a new hit on the same unit replaces the old one
   this.reap();
   this.list.push(e);el.classList.add('glh');try{this.liftNum(el)}catch{}
   if(hs){const un=byId('units');un.classList.add('hstop');clearTimeout(this._hs);this._hs=setTimeout(()=>un.classList.remove('hstop'),hs)}
   const a=rm?0:(2+7*Math.min(p,1))*(cr?1.5:1);if(a>=this.shake.a*Math.max(0,1-(now-this.shake.t0)/this.shake.dur||0)){this.shake={a,t0:now+hs*.5,dur:260+(cr?120:0)}}
   if(!this.raf)this.raf=requestAnimationFrame(t=>this.frame(t));clearTimeout(this._sw);this._sw=setTimeout(()=>this.sweep(),this.MAXT+50);return true},
 spriteTex(e){if(!e.spOk)return null;const im=e.img;if(!im||!im.complete||!im.naturalWidth||getComputedStyle(im).display==='none')return null;const gl=this.gl;
   if(!e.sp)e.sp=this.mkTex(null);gl.bindTexture(gl.TEXTURE_2D,e.sp);if(e.src!==im.currentSrc){try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);e.src=im.currentSrc}catch(err){e.spOk=false;e.el.classList.remove('glh');return null}}return e.sp},
 contentRect(im,cr){const nw=im.naturalWidth,nh=im.naturalHeight,k=Math.min(im.clientWidth/nw,im.clientHeight/nh)||0,s=cr.width/(im.clientWidth||1),w=nw*k*s,h=nh*k*s;return{x:cr.left+(cr.width-w)/2,y:cr.bottom-h,w,h}},
 quad(tex,x,y,w,h,rot,M,o){const gl=this.gl,L=this.loc;gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform4f(L.R,x,y,w,h);gl.uniform1f(L.A,rot||0);gl.uniform1i(L.M,M);
   gl.uniform3fv(L.K,o.K||[1,1,1]);gl.uniform1f(L.F,o.F??1);gl.uniform1f(L.G,o.G||0);gl.uniform1f(L.U,o.U??-1);gl.uniform1f(L.S,o.S||0);gl.uniform2f(L.X,...(o.X||[0,0]));gl.uniform4f(L.B,...(o.B||[0,0,1,1]));gl.drawArrays(gl.TRIANGLE_STRIP,0,4)},
 frame(now){this.raf=0;const gl=this.gl;if(!gl)return;const cv=this.cv;if(!cv.isConnected&&!this.attach()){for(const e of this.list)e.dead=true;this.reap();return this.cleanup()}
   const box=cv.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),W=Math.round(box.width*dpr),H=Math.round(box.height*dpr);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
   gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(this.loc.C,W,H);
   // screen shake on the field layers (the canvas reads rects, so it follows)
   const S=this.shake,st=(now-S.t0)/S.dur,sa=st>=0&&st<1?S.a*(1-st)*(1-st):0,sx=sa?(Math.random()*2-1)*sa:0,sy=sa?(Math.random()*2-1)*sa*.6:0;
   for(const id of['units','bgl']){const n=byId(id);if(n)n.style.translate=sa?`${sx.toFixed(1)}px ${sy.toFixed(1)}px`:''}
   for(const e of this.list){if(e.dead||!e.el.isConnected){e.dead=true;continue}const t=now-e.t0,a=t-e.hs,bd=e.el.querySelector('.body');
     // knockback: shoved back during the hit-stop, then a damped wobble home; squash on impact
     let ox=0,sxk=1,syk=1;const A=e.dir*e.p*(e.u.pc||e.u.ally?14:16);if(t<e.hs){ox=A*.75}else if(a<420){ox=A*Math.exp(-a/85)*Math.cos(a/30);const q=Math.exp(-a/70);sxk=1+.06*e.p*q;syk=1-.05*e.p*q}
     if(bd)bd.style.transform=(t<e.hs+420)?`translateX(${ox.toFixed(1)}px) scale(${sxk.toFixed(3)},${syk.toFixed(3)})`:'';
     const sp=this.spriteTex(e),im=e.img;let rc=null;
     if(im&&im.isConnected){const r=im.getBoundingClientRect();if(r.width>2)rc=this.contentRect(im,r)}
     if(!rc){const sl=e.el.querySelector('.sil')||e.el.querySelector('.bob'),r=sl?.getBoundingClientRect();if(r&&r.width>2)rc={x:r.left,y:r.top,w:r.width,h:r.height}}// no art: the silhouette stands in
     const cx=rc?rc.x+rc.w/2:0,cy=rc?rc.y+rc.h*.55:0,base=rc?rc.h:120;
     // silhouette flash + RGB split over the sprite
     if(sp&&rc){const fl=t<e.hs?1:Math.max(0,1-a/(200+80*e.p)),g=t<e.hs?0:Math.max(0,1-a/220)*.55,off=(.018+.02*Math.min(1,e.p))*Math.max(0,1-Math.max(0,a)/220)*e.dir;
       const K=t<e.hs?[1,1,1]:e.tint.map(c=>1+(c-1)*Math.min(1,a/90));
       if(fl>0||g>0)this.quad(sp,(rc.x-box.left+rc.w/2)*dpr,(rc.y-box.top+rc.h/2)*dpr,rc.w*dpr,rc.h*dpr,0,0,{K,F:fl*.92,G:g,X:[off,0]})}
     // drawn hit art: zoom-smear burst, then burns out through noise
     let alive=t<e.hs+460;
     for(const b of e.bursts){const bt=t-b.at;const Q=b.seq?.ok&&b.seq;
       if(Q){const m=Q.m,dur=m.n*m.ms;if(bt<0){alive=true;continue}if(bt>=dur)continue;alive=true;// drawn frame sheet: plays frame by frame, neighbours cross-faded
         const fp=bt/m.ms,f=Math.min(m.n-1,Math.floor(fp)),w=fp-f,cw=1/m.c,ch=1/m.r,asp=(Q.im.naturalWidth/m.c)/(Q.im.naturalHeight/m.r),H=b.sz*base*2.4*(.96+.1*bt/dur),Wd=H*asp*(e.seed>3.14?-1:1),rot=(e.seed%1-.5)*.2;
         const fr=(i,a)=>{if(a<=.01)return;this.quad(Q.t,(cx-box.left)*dpr,(cy-box.top-H*.04)*dpr,Wd*dpr,H*dpr,rot,3,{F:a,B:[(i%m.c)*cw,Math.floor(i/m.c)*ch,cw,ch]})};
         fr(f,f<m.n-1?1-w*.5:1-w);if(f<m.n-1)fr(f+1,w*.5);continue}
       if(bt<0||!b.art?.ok){alive=alive||bt<900;continue}const k=bt/760;if(k>=1)continue;alive=true;
       const ease=1-Math.pow(1-Math.min(1,k*1.9),4),sc=(.5+.6*ease)*b.sz*base,rot=(e.seed-3.14)*.07+(k*.06*e.dir);
       this.quad(b.art.t,(cx-box.left)*dpr,(cy-box.top)*dpr,sc*dpr,sc*dpr,rot,1,{K:e.tint,F:Math.min(1,bt/40),U:-.25+1.3*Math.max(0,(k-.22)/.78),S:.035*Math.max(0,1-k/.3)})}
     // shards cut from the same art, thrown away from the attacker
     const b0=e.bursts[0];if(!e.shDone&&t>=e.hs*.6&&b0.art?.ok&&rc){e.shDone=true;const n=Math.round(8+8*Math.min(1,e.p)+(e.cr?6:0));
       for(let i=0;i<n;i++){const ang=(Math.random()*1.7-.85)+(e.dir>0?0:Math.PI)+(Math.random()<.25?Math.PI:0),sp2=(260+Math.random()*520)*(.6+.5*Math.min(1,e.p))*(base/300),s=.12+Math.random()*.14;
         e.shards.push({x:cx,y:cy,vx:Math.cos(ang)*sp2,vy:Math.sin(ang)*sp2-220*(base/300),r:Math.random()*6.28,vr:(Math.random()*2-1)*14,life:.42+Math.random()*.36,age:0,sz:(10+Math.random()*16)*(base/300)*1.6,
           B:[.3+Math.random()*(.4-s),.3+Math.random()*(.4-s),s,s]})}e.last=now}
     if(e.shards.length){const dt=Math.min(.05,(now-(e.last||now))/1000);e.last=now;
       for(const s of e.shards){s.age+=dt;if(s.age>=s.life)continue;alive=true;s.vy+=1100*(base/300)*dt;s.vx*=1-1.8*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.r+=s.vr*dt;
         const f=1-s.age/s.life,spd=Math.hypot(s.vx,s.vy),st2=1+Math.min(2.2,spd/600);
         this.quad(b0.art.t,(s.x-box.left)*dpr,(s.y-box.top)*dpr,s.sz*st2*dpr,s.sz*dpr,Math.atan2(s.vy,s.vx),2,{F:f,B:s.B})}}
     if(!alive){e.dead=true}}
   this.reap();
   if(this.list.length||sa)this.raf=requestAnimationFrame(t=>this.frame(t));else this.cleanup()},
 reap(){const gl=this.gl;for(const e of this.list)if(e.dead){if(!this.list.some(x=>!x.dead&&x.el===e.el)){e.el.classList.remove('glh');const bd=e.el.querySelector('.body');if(bd)bd.style.transform=''}if(e.sp&&gl)gl.deleteTexture(e.sp);e.sp=null}// a unit hit again keeps its class/transform for the new effect
   this.list=this.list.filter(e=>!e.dead)},
 /* rAF stops in a hidden tab (and in headless runs): this timer still ends every effect, so no unit is left flashed or shoved */
 sweep(){const now=performance.now();for(const e of this.list)if(now-e.t0>this.MAXT)e.dead=true;this.reap();
   if(this.list.length){clearTimeout(this._sw);this._sw=setTimeout(()=>this.sweep(),400)}else{if(this.raf){cancelAnimationFrame(this.raf);this.raf=0}this.shake.a=0;this.cleanup()}},MAXT:1800,
 cleanup(){for(const id of['units','bgl']){const n=byId(id);if(n)n.style.translate=''}if(this.gl){const gl=this.gl;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)}}};
