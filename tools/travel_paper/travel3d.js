// travel3d.js — the play tool's travel tab as a pop-up paper world.
// The GM's world map is the printed page; GPT-drawn die-cut pieces (mountains, trees, rocks, towns, dungeons...) stand
// up on hinges from it, a paper carriage rides the GM's route, and the camera can look from above (macro lens), from
// behind the carriage, or from its driver's seat. Four print sets (core / high / techno / natural) swap by folding
// everything down and raising the new set.
// mountTravel(el, { assets, theme, onView }) -> { setData, setTheme, setView, replay, dispose }
import * as THREE from 'three';
import { paperTextures, PAPER_LIGHT, paperMaterial, makeCard, hinge, paperLights, enableSoftShadows, PaperPost, fitShadow } from './lib/paperkit-3d.js';

export const THEMES = {
  core:    { name: '코어 룰북',     stock: '#e6d2a6', table: '#3b2a1c', sky: '#cdb48a', key: '#ffe2b4', fill: '#efd8b4', leak: '#7a4a22', haze: '#c9ad80', ink: '#3a2412', road: '#5a2e14', font: '"Gowun Batang","Nanum Myeongjo","Batang",serif' },
  high:    { name: '하이 판타지',   stock: '#ead9b2', table: '#2e2a3a', sky: '#cfc2a6', key: '#fff0d8', fill: '#e6dcc8', leak: '#5a4a6e', haze: '#cbbfa4', ink: '#2a2238', road: '#4e3a1c', font: '"Gowun Batang","Nanum Myeongjo","Batang",serif' },
  techno:  { name: '테크노 판타지', stock: '#dcc8a0', table: '#262626', sky: '#bfae8c', key: '#ffe6c4', fill: '#dcd6c4', leak: '#3a4a4a', haze: '#bba888', ink: '#16303a', road: '#e9f3ef', font: '"Gowun Batang","Nanum Myeongjo","Batang",serif' },
  natural: { name: '내추럴 판타지', stock: '#e2cfa0', table: '#2c2a1a', sky: '#c8b488', key: '#fff0c8', fill: '#e6dcc0', leak: '#4e4a22', haze: '#c4ae82', ink: '#2a2412', road: '#4a3418', font: '"Gowun Batang","Nanum Myeongjo","Batang",serif' },
};
// UI themes of the play tool: each prints the same world with art drawn after its own game (pieces/<skin>/<world>)
// and its own grade; the layout never depends on the skin, so every viewer sees mountains and towns in the same place
export const SKINS = {
  metaphor: { name: '메타포', pixel: false, key: '#fff2e0', grade: { tint: [1.02, 1.0, 0.97], saturation: 1.0, contrast: 1.12, exposure: 0.86 } },
  ff:       { name: 'FF',     pixel: false, key: '#fff4ea', grade: { tint: [1.02, 0.99, 0.98], saturation: 0.9,  contrast: 1.06, exposure: 0.88 } },
  octo:     { name: '옥토패스', pixel: true, key: '#fff0d8', grade: { tint: [1.03, 1.0, 0.95], saturation: 1.0, contrast: 1.18, exposure: 0.82 } },
};
export const BOARDS = {
  core:    { print: 'sepia(0.18) saturate(0.95) contrast(0.95)', road: 'ink', table: 6 },
  high:    { print: 'sepia(0.08) saturate(0.9) brightness(1.06) contrast(0.95)', road: 'gold', table: 5 },
  techno:  { print: 'grayscale(1) contrast(1.35) brightness(1.15)', road: 'rail', over: true, table: 6 },
  natural: { print: 'sepia(0.22) saturate(1.05) hue-rotate(-8deg)', road: 'vine', table: 0.5 },
};
// world units: the map is WD wide; heights of each kind of piece (the carriage is ~2.4 tall)
const WD = 120;
// every piece the GM can place: [kind, name, height]; the same list in every print set (pieces/<skin>/<world>/<kind>)
export const CATALOG = {
  tree:     { name: '나무', items: [['pine', '침엽수', 4.6], ['oak', '활엽수', 4.2], ['giant', '거목', 7], ['birch', '자작나무', 4.4], ['deadtree', '고사목', 3.8], ['palm', '야자수', 4.4], ['willow', '버드나무', 4.4], ['grove', '작은 숲', 5.2], ['forest', '큰 숲', 6]] },
  terrain:  { name: '지형', items: [['range', '산맥', 9], ['snowpeak', '설산', 10], ['volcano', '화산', 9], ['hill', '구릉', 4], ['cliff', '절벽', 6.5], ['pillar', '바위기둥', 6], ['mesa', '메사', 6], ['dune', '사구', 3], ['iceberg', '빙산', 4.5]] },
  small:    { name: '작은 것', items: [['bush', '덤불', 1.7], ['rocks', '바위', 2.4], ['flowers', '풀꽃', 1.3], ['reeds', '갈대', 1.6], ['cactus', '선인장', 2.4], ['mushroom', '거대 버섯', 2.6], ['crystal', '수정', 2.6], ['waterfall', '폭포', 5], ['log', '쓰러진 통나무', 1.4]] },
  settle:   { name: '정착지', items: [['village', '작은 마을', 5.5], ['city', '성벽 도시', 7.5], ['capital', '왕성(수도)', 10], ['port', '항구 도시', 6.5], ['fishing', '어촌', 4.5], ['farm', '농장·풍차', 5], ['mtvillage', '산악 마을', 6], ['fortress', '요새', 7], ['market', '시장·교역소', 4.5]] },
  dungeon:  { name: '던전', items: [['cave', '동굴', 6], ['labyrinth', '지하 미궁', 4.5], ['wizardtower', '마법사의 탑', 9], ['ruinedcastle', '폐성', 7.5], ['mine', '광산', 5.5], ['ruins', '고대 유적', 5], ['graveyard', '묘지', 4.5], ['demoncastle', '마왕성', 10], ['lair', '괴물 소굴', 5.5]] },
  landmark: { name: '명소', items: [['temple', '신전', 6.5], ['monastery', '수도원', 7], ['inn', '길가 여관', 4.5], ['gate', '관문', 5], ['lighthouse', '등대', 7.5], ['watchtower', '망루', 6], ['statue', '석상', 6.5], ['camp', '야영지', 3.5], ['worldtree', '세계수', 12]] },
  travel:   { name: '길·탈것', items: [['bridge', '다리', 2.6], ['boat', '나룻배', 2.2], ['signpost', '이정표', 2.4], ['portal', '마법진', 4], ['ship', '범선', 5.5], ['airship', '비공정', 6]] },
};
const KIND_H = { wagon: 3.3, wagonFront: 3.3, beast: 2.9 };
for (const c of Object.values(CATALOG)) for (const [k, , h] of c.items) KIND_H[k] = h;
// earlier piece names still found in older sets
const ALIAS = { range: 'mountain', beast: 'horse', village: 'town', capital: 'castle', cave: 'dungeon', temple: 'shrine' };
// a pin's building when the GM has not chosen one
export const pinBuilding = (p) => p.bld || (p.kind === 'town' ? (/성|왕도|수도|도시|제국|왕국|城|city|castle/i.test(p.name || '') ? 'capital' : 'village') : p.kind === 'dungeon' ? 'cave' : 'temple');
const rand = (s) => () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s ^= s >>> 16) >>> 0) / 4294967296);
const hash = (str) => { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = no; i.src = src; });

export function mountTravel(el, { assets, theme = 'core', skin = 'metaphor', view = 'over', onView = null, onPick = null, onEdit = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.domElement.className = 'tp3d';
  el.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.3, 900);
  const paper = paperTextures(renderer, { color: '#e9d7b0', seed: 4, unitsPerTile: 5, fibres: 1.4, mottle: 0.07, normalStrength: 3 });
  const lights = paperLights(scene, { target: new THREE.Vector3(), keyDir: [-0.8, 0.95, 0.55], shadowExtent: 70, distance: 140, mapSize: 4096 });
  enableSoftShadows(lights.key, { softness: 0.24, maxPenumbra: 1.6 });
  const post = new PaperPost(renderer, scene, camera, { focusBand: 0.3, ramp: 0.3, maxBlur: 16, tint: [1.05, 0.99, 0.93], saturation: 0.88, greenDesat: 0.05, exposure: 0.82, contrast: 1.14, vignette: 0.04, hazeStart: 60, hazeEnd: 200, hazeAmount: 0.25 });

  const S = { ed: { on: false, sel: null, place: null }, theme, skin: SKINS[skin] ? skin : 'metaphor', view, data: null, W: WD, D: WD, hinges: [], world: new THREE.Group(), protos: {}, img: null, mapKey: '', curve: null, v: 0, vT: 0, party: new THREE.Vector3(),
    cam: { tx: 0, tz: 0, dist: 78, yaw: 0, look: 0 }, t: 0, dead: false, building: false };
  scene.add(S.world);

  // ---- ground: the GM's map printed on paper, routes inked on it; a plain page beyond it -----------------------------
  const groundCanvas = document.createElement('canvas');
  let groundTex = null;
  const nrm = paper.normalMap.clone(); nrm.needsUpdate = true;
  const groundMat = paperMaterial({ color: '#ffffff', normalMap: nrm, normalScale: 0.6 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const tableMat = paperMaterial({ color: THEMES[theme].table, map: paper.map, normalMap: paper.normalMap, normalScale: 0.5 });
  const table = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), tableMat); table.rotation.x = -Math.PI / 2; table.position.y = -0.05; table.receiveShadow = true; scene.add(table);

  function paintGround() {
    const T = THEMES[S.theme], im = S.img, d = S.data || {};
    const k = Math.min(1, 4096 / Math.max(im.naturalWidth, im.naturalHeight));
    const w = groundCanvas.width = Math.round(im.naturalWidth * k), h = groundCanvas.height = Math.round(im.naturalHeight * k);
    const g = groundCanvas.getContext('2d');
    // the GM's map printed on old parchment: faded, sepia-toned ink, the parchment's own grain and stains through it
    const B = BOARDS[S.theme] || BOARDS.core, BP = S.boards?.[S.theme];
    if (B.over && BP?.paper) {   // a blueprint: the sheet is the ground, the map is printed into it as light and shade
      g.drawImage(BP.paper, 0, 0, w, h); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.9; g.filter = B.print; g.drawImage(im, 0, 0, w, h); g.filter = 'none'; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    } else { g.filter = B.print; g.drawImage(im, 0, 0, w, h); g.filter = 'none'; }
    g.globalCompositeOperation = 'multiply';
    const sheet = BP?.paper || S.parch;
    if (B.over && BP?.paper) {} else if (BP?.paper) g.drawImage(BP.paper, 0, 0, w, h);   // the world's own map sheet, one piece edge to edge (no seams)
    else if (sheet) { const pw = Math.min(w, h) * 0.9; for (let y = 0; y < h; y += pw) for (let x = 0; x < w; x += pw) g.drawImage(sheet, x, y, pw, pw); }
    else { g.fillStyle = g.createPattern(paper.sheet, 'repeat'); g.fillRect(0, 0, w, h); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = B.over ? 0 : 0.1; g.fillStyle = T.stock; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
    // routes: an inked dashed road over a pale cut band
    for (const r of d.routes || []) {
      if (!r.pts || r.pts.length < 2) continue;
      const P = r.pts.map(([x, y]) => [x * w, y * h]), u = w / 1200;
      const path = new Path2D(); path.moveTo(...P[0]);
      for (let i = 0; i < P.length - 1; i++) { const a = P[i - 1] || P[i], b = P[i], c = P[i + 1], e = P[i + 2] || c; path.bezierCurveTo(b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6, c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6, c[0], c[1]); }
      g.lineCap = g.lineJoin = 'round';
      // the road in this board's own hand: sepia ink dashes / gold leaf dashes / a rail with ties / a dotted vine
      g.globalAlpha = 0.92;
      if (B.road === 'rail') {
        g.strokeStyle = T.road; g.lineWidth = 7 * u; g.setLineDash([1.6 * u, 4.4 * u]); g.stroke(path);        // ties
        g.setLineDash([]); g.lineWidth = 4.6 * u; g.stroke(path); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 2.2 * u; g.stroke(path); g.globalCompositeOperation = 'source-over';   // two rails
      } else if (B.road === 'vine') {
        g.strokeStyle = T.road; g.lineWidth = 2 * u; g.stroke(path);
        g.lineWidth = 5.5 * u; g.setLineDash([0.1, 12 * u]); g.stroke(path); g.setLineDash([]);              // leaf buds
      } else if (B.road === 'gold') {
        g.strokeStyle = '#3a2a10'; g.lineWidth = 5.2 * u; g.setLineDash([12 * u, 7 * u]); g.stroke(path);
        g.strokeStyle = '#d4a63c'; g.lineWidth = 3.2 * u; g.stroke(path); g.setLineDash([]);
      } else { g.strokeStyle = T.road; g.lineWidth = 3.6 * u; g.setLineDash([11 * u, 8 * u]); g.stroke(path); g.setLineDash([]); }
      g.globalAlpha = 1;
    }
    // a new texture per paint: a canvas that changed size cannot be re-uploaded into the old one
    groundTex?.dispose(); groundTex = new THREE.CanvasTexture(groundCanvas); groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    groundMat.map = groundTex; groundMat.needsUpdate = true;
    S.W = WD; S.D = WD * h / w;
    ground.scale.set(S.W, S.D, 1);
    nrm.repeat.set(S.W / 5, S.D / 5); nrm.needsUpdate = true;
  }
  const toWorld = (x, y) => new THREE.Vector3((x - 0.5) * S.W, 0, (y - 0.5) * S.D);

  // ---- piece prototypes: each GPT piece printed once per theme, cloned for every instance --------------------------
  // the art for (skin, world); a set not drawn yet falls back to the skin's core set, then to metaphor's
  function artFor(sk, th) {
    const sets = assets.sets || { metaphor: assets }, chain = [sets[sk]?.[th], sets[sk]?.core, sets.metaphor?.[th], sets.metaphor?.core];
    const out = {}; for (const c of chain.reverse()) if (c) Object.assign(out, c); return out;
  }
  // the art of every kind is decoded up front, but a kind is printed (the slow part) only when a piece of it first
  // stands on the page: P[kind] prints on first use and keeps the card for every later clone
  async function protosFor(sk, th) {
    const key = sk + '/' + th, pixel = SKINS[sk]?.pixel;
    if (S.protos[key]) return S.protos[key];
    const set = artFor(sk, th), imgs = {};
    await Promise.all(Object.entries(set).map(async ([kind, a]) => { imgs[kind] = await loadImg(a.img).catch(() => null); }));
    const print = (kind) => {
      const a = set[kind], img = imgs[kind]; if (!a || !img) return undefined;
      const H = KIND_H[kind] || a.h || 3, pts = a.pts.map(([x, y]) => [x * H, y * H]), ar = a.aspect;
      const paint = (P) => {   // the die-cut margin is bare parchment; the art is printed on it
        const g = P.g; P.fill(THEMES[th].stock); g.imageSmoothingEnabled = !pixel;
        g.save(); g.translate(0, H); g.scale(1, -1);
        if (S.parch) { g.globalCompositeOperation = 'multiply'; g.drawImage(S.parch, -ar * H / 2, 0, Math.max(ar * H, H), Math.max(ar * H, H)); g.globalCompositeOperation = 'source-over'; }
        g.drawImage(img, -ar * H / 2, 0, ar * H, H); g.restore(); };
      return { H, img, ar, card: makeCard(pts, { holes: a.holes ? a.holes.map((h) => h.map(([x, y]) => [x * H, y * H])) : null, paint, paper, thickness: 0.07, edgeWidth: 0.05, pxPerUnit: Math.min(160, 560 / H), back: 'mirror', seed: hash(key + kind) % 997, contact: { amount: 0.1, height: H * 0.08, color: THEMES[th].leak } }) };
    };
    const cache = {};
    return (S.protos[key] = new Proxy(cache, { get: (t, k) => typeof k !== 'string' ? undefined : k in t ? t[k] : (t[k] = print(k)) }));
  }

  // ---- reading the map: where forests, mountains and water are, from the map's own colours -------------------------
  function classify(im) {
    const c = document.createElement('canvas'), n = 140, m = Math.max(8, Math.round(n * im.naturalHeight / im.naturalWidth));
    c.width = n; c.height = m; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, n, m);
    const px = g.getImageData(0, 0, n, m).data, cell = [];
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const o = (j * n + i) * 4, r = px[o] / 255, gg = px[o + 1] / 255, b = px[o + 2] / 255;
      const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), v = mx, s = mx ? (mx - mn) / mx : 0;
      let hdeg = 0; if (mx !== mn) { hdeg = mx === r ? 60 * (((gg - b) / (mx - mn)) % 6) : mx === gg ? 60 * ((b - r) / (mx - mn) + 2) : 60 * ((r - gg) / (mx - mn) + 4); if (hdeg < 0) hdeg += 360; }
      let t = 'plain';
      if (s > 0.18 && hdeg > 175 && hdeg < 255) t = 'water';
      else if (s > 0.2 && hdeg > 65 && hdeg < 175) t = v < 0.5 ? 'forest' : 'grass';
      else if (v > 0.86 && s < 0.1) t = 'snow';
      else if (hdeg >= 25 && hdeg < 50 && s > 0.45 && v > 0.55) t = 'waste';
      else if ((s < 0.22 && v < 0.62) || (hdeg >= 12 && hdeg < 45 && s > 0.3 && v < 0.58)) t = 'rock';
      cell.push(t);
    }
    return { n, m, cell, at: (x, y) => cell[Math.min(m - 1, Math.max(0, Math.floor(y * m))) * n + Math.min(n - 1, Math.max(0, Math.floor(x * n)))] };
  }

  // the layout: pins become towns / dungeons / landmarks with a printed name sign; the land around fills with nature
  // what stands on the page: the pins' buildings (with their name signs) and every object the GM placed; nothing else
  function layout(d) {
    const items = [];
    for (const p of d.pins || []) {
      const kind = pinBuilding(p), at = toWorld(p.x, p.y);
      at.z -= (KIND_H[kind] || 5) * 0.12;   // the building stands just behind its point, so the road reaches its door
      items.push({ id: 'pin:' + p.id, kind, at, s: p.bs || 1, pin: p });
    }
    for (const o of d.objs || []) items.push({ id: o.id, kind: o.k, at: toWorld(o.x, o.y), s: o.s || 1, obj: o });
    return items;
  }

  // a printed name sign (paper flag on a post) for a pin
  function signCard(name, th) {
    const T = THEMES[th], c = document.createElement('canvas'), g = c.getContext('2d'), fs = 46;
    g.font = `700 ${fs}px ${T.font}`; const tw = Math.ceil(g.measureText(name).width);
    const w = 2.2 + tw / fs * 1.05, h = 1.15, post = 1.0;
    const pts = [[-0.09, 0], [0.09, 0], [0.09, post], [w / 2, post], [w / 2, post + h], [-w / 2, post + h], [-w / 2, post], [-0.09, post]];
    const paint = (P) => {
      const g2 = P.g; P.fill(T.stock);
      if (S.parch) { g2.save(); g2.globalCompositeOperation = 'multiply'; g2.translate(-w / 2, post + h); g2.scale(1, -1); g2.drawImage(S.parch, 0, 0, w, h * 1.6); g2.restore(); }
      g2.fillStyle = T.ink; g2.fillRect(-0.09, 0, 0.18, post);
      g2.strokeStyle = T.ink; g2.globalAlpha = 0.55; g2.lineWidth = 0.035; g2.strokeRect(-w / 2 + 0.12, post + 0.12, w - 0.24, h - 0.24); g2.globalAlpha = 1;
      g2.save(); g2.translate(0, post + h / 2); g2.scale(1, -1); g2.font = `700 ${0.62}px ${T.font}`; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillStyle = T.ink; g2.fillText(name, 0, 0.04, w - 0.4); g2.restore();
    };
    return makeCard(pts, { paint, paper, thickness: 0.06, edgeWidth: 0.04, pxPerUnit: 90, back: 'kraft', seed: hash(name) % 991 });
  }

  // ---- the carriage: a paper model (two printed sides, front and back panels, a horse of two printed sides) --------
  function buildCarriage(P) {
    const g = new THREE.Group(); if (!P.wagon) return g;
    const W = P.wagon, F = P.wagonFront || P.wagon, Hh = P.beast || P.horse;
    const L = W.ar * W.H, wid = F ? Math.min(L * 0.55, (P.wagonFront ? F.ar * F.H : L * 0.45)) : L * 0.45;
    const sideR = W.card.clone(); sideR.position.set(0, 0, wid / 2);
    const sideL = W.card.clone(); sideL.scale.x = -1; sideL.rotation.y = Math.PI; sideL.position.set(0, 0, -wid / 2);
    g.add(sideR, sideL);
    if (P.wagonFront) {
      const k = wid / (F.ar * F.H), fr = F.card.clone(); fr.scale.setScalar(k); fr.rotation.y = Math.PI / 2; fr.position.set(L * 0.36, 0, 0);
      const bk = F.card.clone(); bk.scale.setScalar(k); bk.rotation.y = -Math.PI / 2; bk.position.set(-L * 0.36, 0, 0);
      g.add(fr, bk);
    }
    if (Hh) {
      const hl = Hh.ar * Hh.H, hx = L / 2 + hl * 0.42;
      const a = Hh.card.clone(); a.position.set(hx, 0, 0.22);
      const b = Hh.card.clone(); b.scale.x = -1; b.rotation.y = Math.PI; b.position.set(hx, 0, -0.22);
      g.add(a, b);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    g.userData.seat = L * 0.36 + 0.35;   // the driver's bench, just in front of the front panel
    return g;
  }

  // ---- build / rebuild the world for the current data + theme ------------------------------------------------------
  async function build(rise = true) {
    if (!S.data?.img) return;
    S.building = true;
    const th = S.theme, T = THEMES[th];
    if (assets.parchment && !S.parch) S.parch = await loadImg(assets.parchment).catch(() => null);
    S.boards ??= {};
    const bsrc = assets.boards?.[S.theme];
    if (bsrc && !S.boards[S.theme]) S.boards[S.theme] = { paper: bsrc.paper && await loadImg(bsrc.paper).catch(() => null), table: bsrc.table && await loadImg(bsrc.table).catch(() => null) };
    if (S.mapKey !== S.data.img || !S.img) { S.img = await loadImg(S.data.img); S.mapKey = S.data.img; }
    paintGround();
    const P = await protosFor(S.skin, th);
    Object.assign(post.o, SKINS[S.skin].grade);
    // theme light, shadow colour, page
    scene.background = new THREE.Color(T.sky); scene.fog = null;
    lights.key.color.set(SKINS[S.skin].key || T.key); lights.fill.color.set(T.fill); PAPER_LIGHT.leak.value.set(T.leak); tableMat.color.set(T.table);
    { const tb = S.boards[S.theme]?.table; if (tb) { const t = new THREE.Texture(tb); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; const rp = (BOARDS[S.theme] || BOARDS.core).table || 4; t.repeat.set(rp * 2, rp * 2); t.offset.set(rp < 1 ? 0 : 0.5, 0); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.needsUpdate = true; tableMat.map = t; tableMat.color.set('#ffffff'); } else { tableMat.map = paper.map; } tableMat.needsUpdate = true; }
    post.o.haze = T.haze; post.o.aoTint = T.leak; post.apply();
    // clear the old world
    for (const c of [...S.world.children]) S.world.remove(c);
    S.hinges = [];
    S.objH = new Map(); S.P = P;
    for (const it of layout(S.data)) addItem(it, 0);
    // the carriage
    const car = buildCarriage(P);
    S.car = { group: new THREE.Group(), hinge: null, seat: car.userData.seat || 1 };
    S.car.hinge = hinge(car, { open: 0, size: 0.35 });
    S.car.group.add(S.car.hinge.group); S.world.add(S.car.group); S.hinges.push(S.car.hinge);
    placeCar(true);
    S.building = false;
    if (rise) raise(); else for (const h of S.hinges) h.reset(1);
  }

  // one piece (and its name sign) on its own hinge; open = 0 lies flat, 1 stands
  function addItem(it, open) {
    const P = S.P, pr = P[it.kind] || P[ALIAS[it.kind]] || P.oak; if (!pr) return null;
    const H = KIND_H[it.kind] || pr.H, k = H / pr.H * it.s;   // an aliased stand-in keeps the catalogue height
    const m = pr.card.clone(); m.scale.setScalar(k);
    const h = hinge(m, { at: it.at, open, size: Math.min(1, H * it.s / 12) });
    h.kind = it.kind; h.face = true; h.ht = H * it.s; h.objId = it.id; h.obj = it.obj; S.world.add(h.group); S.hinges.push(h);
    const set = [h];
    if (it.pin && it.pin.name) {
      const sg = signCard(it.pin.name, S.theme); sg.scale.setScalar(1.7); const hs = hinge(sg, { at: it.at.clone().add(new THREE.Vector3(0, 0, H * it.s * 0.18 + 1.6)), open, size: 0.3 });
      hs.face = true; hs.sign = true; hs.ht = Math.max(2.5, new THREE.Box3().setFromObject(sg).getSize(new THREE.Vector3()).x * 0.9); h.pin = hs.pin = it.pin; hs.objId = it.id; S.world.add(hs.group); S.hinges.push(hs); set.push(hs);
    }
    S.objH.set(it.id, { set, it, k: k / it.s });
    return set;
  }
  function dropItem(id, anim = true) {
    const e = S.objH.get(id); if (!e) return; S.objH.delete(id);
    for (const h of e.set) { h.dead = true; if (anim) { h.want = 0; h.set(0, 0); } }
    setTimeout(() => { for (const h of e.set) { S.world.remove(h.group); S.hinges = S.hinges.filter((x) => x !== h); } }, anim ? 900 : 0);
  }
  // the GM's objects changed (placed, moved, resized, removed): only those pieces fold / unfold, the rest stays
  function syncObjs() {
    if (!S.P || !S.objH) return;
    const want = new Map(layout(S.data).map((it) => [it.id, it]));
    for (const [id, e] of [...S.objH]) {
      const it = want.get(id);
      if (!it || it.kind !== e.it.kind || (it.pin?.name || '') !== (e.it.pin?.name || '')) { dropItem(id); continue; }
      if (it.s !== e.it.s || !it.at.equals(e.it.at)) {   // moved or resized: the same card, re-planted
        const [h, hs] = e.set, H = KIND_H[it.kind] || 3;
        h.group.position.copy(it.at); h.pivot.children[0].scale.setScalar(e.k * it.s); h.ht = H * it.s;
        if (hs) hs.group.position.copy(it.at).add(new THREE.Vector3(0, 0, H * it.s * 0.18 + 1.6));
        e.it = it;
      } else e.it = it;
    }
    for (const [id, it] of want) if (!S.objH.has(id)) { const set = addItem(it, 0); if (set) set.forEach((h, i) => { h.want = 1; h.set(1, 0.05 + i * 0.25); }); }
  }

  // rise: a wave from the party outward (the nearest cards lie on top when folded, so they lift first)
  function raise() {
    const c = S.party;
    for (const h of S.hinges) { if (h.dead) continue; h.reset(0); h.want = 1; const p = h.group.getWorldPosition(new THREE.Vector3()); h.set(1, 0.12 + p.distanceTo(c) / S.W * 1.6 + (h.sign ? 0.35 : 0) + Math.random() * 0.06); }
    S.car.hinge.set(1, 0.05);
  }
  function fold() {
    const c = S.party; let far = 0;
    for (const h of S.hinges) { const p = h.group.getWorldPosition(new THREE.Vector3()), d = 1 - p.distanceTo(c) / S.W; far = Math.max(far, d); h.set(0, Math.max(0, d) * 0.7 + Math.random() * 0.05); }
    return 0.7 + 0.9;
  }

  // ---- the route the carriage follows --------------------------------------------------------------------------------
  function activeRoute(d) {
    const R = d.routes || []; if (d.activeRoute) { const r = R.find((x) => x.id === d.activeRoute); if (r) return r; }
    const going = R.filter((r) => (r.prog || 0) > 0);
    return going.find((r) => (r.prog || 0) < 1) || going.at(-1) || null;
  }
  function setCurve() {
    const r = S.data && activeRoute(S.data);
    S.route = r;
    S.curve = r && r.pts.length > 1 ? new THREE.CatmullRomCurve3(r.pts.map(([x, y]) => toWorld(x, y)), false, 'catmullrom', 0.5) : null;
    S.vT = r ? Math.max(0, Math.min(1, r.prog || 0)) : 0;
  }
  const _t = new THREE.Vector3();
  function placeCar(snap) {
    if (!S.car) return;
    if (snap) S.v = S.vT;
    let pos, dir;
    if (S.curve) { pos = S.curve.getPointAt(S.v); dir = S.curve.getTangentAt(Math.min(0.999, Math.max(0.001, S.v)), _t).setY(0).normalize(); }
    else if (S.data?.party) { pos = toWorld(S.data.party.x, S.data.party.y); dir = new THREE.Vector3(1, 0, 0); }
    else { pos = new THREE.Vector3(); dir = new THREE.Vector3(1, 0, 0); }
    S.party.copy(pos);
    S.car.group.position.copy(pos);
    const yaw = Math.atan2(-dir.z, dir.x);
    if (snap) S.car.yaw = yaw; else { let dy = yaw - S.car.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); S.car.yaw += dy * 0.12; }
    S.car.group.rotation.y = S.car.yaw;
    S.car.dir = new THREE.Vector3(Math.cos(S.car.yaw), 0, -Math.sin(S.car.yaw));
  }

  // ---- cameras: overview (macro lens from above), third person, first person ----------------------------------------
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), _p = new THREE.Vector3(), _l = new THREE.Vector3();
  let camInit = false;
  function camTarget(dt) {
    const c = S.cam, v = S.view;
    if (v === 'over') {
      const pitch = THREE.MathUtils.degToRad(50);
      if (!c.free) { c.tx += (S.party.x - c.tx) * Math.min(1, dt * 2); c.tz += (S.party.z - c.tz) * Math.min(1, dt * 2); }
      _l.set(c.tx, 0, c.tz);
      _p.set(c.tx + Math.sin(c.yaw) * Math.cos(pitch) * c.dist, Math.sin(pitch) * c.dist, c.tz + Math.cos(c.yaw) * Math.cos(pitch) * c.dist);
      return { fov: 28, focus: _l };
    }
    const f = S.car.dir || new THREE.Vector3(1, 0, 0), side = new THREE.Vector3(-f.z, 0, f.x);
    const look = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), c.look);
    if (v === 'third') {
      _p.copy(S.party).addScaledVector(look, -13).add(new THREE.Vector3(0, 7.5, 0));
      _l.copy(S.party).addScaledVector(look, 7).setY(1.2);
      return { fov: 38, focus: S.party.clone().setY(1.2) };
    }
    // first person: on the driver's bench, looking down the road
    _p.copy(S.party).addScaledVector(f, S.car.seat).add(new THREE.Vector3(0, 3.4, 0));
    _l.copy(_p).addScaledVector(look, 12).add(new THREE.Vector3(0, -1.6, 0));
    return { fov: 52, focus: _l.clone() };
  }
  function updateCamera(dt) {
    const T = camTarget(dt);
    const k = camInit ? 1 - Math.exp(-dt * (S.view === 'over' ? 6 : 4)) : 1; camInit = true;
    camPos.lerp(_p, k); camLook.lerp(_l, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    camera.fov += (T.fov - camera.fov) * k; camera.updateProjectionMatrix();
    post.focus.lerp(T.focus, k);
    const over = S.view === 'over';
    post.o.maxBlur = over ? 16 : S.view === 'third' ? 9 : 6; post.o.focusBand = over ? 0.3 : 0.42; post.o.ramp = over ? 0.3 : 0.5;
    post.o.hazeStart = over ? 60 : 25; post.o.hazeEnd = over ? 200 : 110; post.o.hazeAmount = over ? 0.22 : 0.45; post.apply();
    fitShadow(lights, S.view === 'over' ? camLook : S.party);
  }

  // ---- input: drag pans the overview / turns the head in first and third person; wheel zooms -------------------------
  const cv = renderer.domElement; let drag = null;
  const ray = new THREE.Raycaster(), _m = new THREE.Vector2(), _ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _gp = new THREE.Vector3();
  const aim = (e) => { const r = cv.getBoundingClientRect(); _m.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(_m, camera); };
  // the map point under the cursor (0..1), or null off the page
  const mapAt = (e) => { aim(e); if (!ray.ray.intersectPlane(_ground, _gp)) return null; const x = _gp.x / S.W + 0.5, y = _gp.z / S.D + 0.5; return x < 0 || x > 1 || y < 0 || y > 1 ? null : { x, y }; };
  // the placed piece under the cursor (its id), standing pieces only
  const pieceAt = (e) => {
    aim(e); const L = S.hinges.filter((h) => h.objId && !h.dead && h.p > 0.5);
    const hit = ray.intersectObjects(L.map((h) => h.group), true)[0]; if (!hit) return null;
    let o = hit.object; while (o && !L.some((h) => h.group === o)) o = o.parent; return L.find((h) => h.group === o)?.objId || null;
  };
  const editing = () => S.ed.on && S.view === 'over';
  cv.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, tx: S.cam.tx, tz: S.cam.tz, look: S.cam.look };
    if (editing()) {
      const id = pieceAt(e);
      if (id) { S.ed.sel = id; onEdit?.({ type: 'select', id }); drag.obj = id; drag.from = S.objH.get(id)?.it.at.clone(); }
    }
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.obj) {   // dragging a piece: it slides over the page, standing
      const q = mapAt(e), en = S.objH.get(drag.obj); if (!q || !en) return; drag.to = q;
      const at = toWorld(q.x, q.y); if (en.it.pin) at.z -= (KIND_H[en.it.kind] || 5) * 0.12;
      const [h, hs] = en.set; h.group.position.copy(at); if (hs) hs.group.position.copy(at).add(new THREE.Vector3(0, 0, (KIND_H[en.it.kind] || 3) * en.it.s * 0.18 + 1.6));
      return;
    }
    if (S.view === 'over') { const k = S.cam.dist / cv.clientHeight * 0.9; S.cam.free = true; S.cam.tx = drag.tx - dx * k; S.cam.tz = drag.tz - dy * k / Math.sin(THREE.MathUtils.degToRad(50)); }
    else S.cam.look = Math.max(-2.4, Math.min(2.4, drag.look - dx * 0.006));
  });
  const up = (e) => {
    const d = drag; drag = null; if (!d) return;
    const click = Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 5;
    if (d.obj) { if (!click && d.to) onEdit?.({ type: 'move', id: d.obj, x: d.to.x, y: d.to.y }); return; }
    if (!click) return;
    if (editing()) {
      const q = mapAt(e);
      if (S.ed.place && q) onEdit?.({ type: 'place', k: S.ed.place, x: q.x, y: q.y });
      else if (S.ed.sel) { S.ed.sel = null; onEdit?.({ type: 'select', id: null }); }
      return;
    }
    if (!onPick) return;
    aim(e);
    const hit = ray.intersectObjects(S.hinges.filter((h) => h.pin).map((h) => h.group), true)[0];
    if (hit) { let o = hit.object; while (o && !S.hinges.some((h) => h.pin && h.group === o)) o = o.parent; const h = S.hinges.find((x) => x.group === o); if (h) onPick(h.pin); }
  }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (editing() && S.ed.sel) { onEdit?.({ type: 'scale', id: S.ed.sel, f: e.deltaY > 0 ? 1 / 1.1 : 1.1 }); return; }   // wheel over a chosen piece: its size
    if (S.view === 'over') S.cam.dist = Math.max(26, Math.min(170, S.cam.dist * (e.deltaY > 0 ? 1.12 : 1 / 1.12)));
  }, { passive: false });
  const onKey = (e) => { if (!editing() || !S.ed.sel || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return; if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onEdit?.({ type: 'delete', id: S.ed.sel }); S.ed.sel = null; } };
  addEventListener('keydown', onKey);

  // ---- loop --------------------------------------------------------------------------------------------------------
  function resize() { const w = el.clientWidth || 2, h = el.clientHeight || 2; renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px'; camera.aspect = w / h; camera.updateProjectionMatrix(); post.setSize(w, h); }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  let last = performance.now();
  const _cp = new THREE.Vector3();
  function tick(dt) {
    S.t += dt;
    if (S.curve && Math.abs(S.vT - S.v) > 1e-4) { const sp = 0.16 * dt; S.v += Math.max(-sp, Math.min(sp, S.vT - S.v)); S.moving = true; } else S.moving = false;
    placeCar(false);
    if (S.car?.hinge) { const inner = S.car.hinge.group; inner.position.y = S.moving ? Math.abs(Math.sin(S.t * 9)) * 0.08 : 0; inner.rotation.z = S.moving ? Math.sin(S.t * 9) * 0.015 : 0; }
    updateCamera(dt);
    // stand-up pieces turn on their pin to face the camera (paper standees), so none is ever seen edge-on
    camera.getWorldPosition(_cp);
    // following the carriage: a piece between the camera and the carriage (or right at the lens) folds down flat on
    // the page and stands up again once the camera has passed, the way a pop-up page lets you look into it
    const follow = S.view !== 'over' && S.car;
    for (const h of S.hinges) {
      if (h.ht && !S.building && h !== S.car.hinge) {
        let want = 1;
        if (follow) {
          const p = h.group.position, r = h.ht * 0.42 + 0.8;
          const ax = _cp.x, az = _cp.z, bx = S.party.x, bz = S.party.z, abx = bx - ax, abz = bz - az, L2 = abx * abx + abz * abz || 1;
          const t = Math.max(0, Math.min(1, ((p.x - ax) * abx + (p.z - az) * abz) / L2)), qx = ax + abx * t - p.x, qz = az + abz * t - p.z;
          const seg = Math.hypot(qx, qz), cam = Math.hypot(p.x - ax, p.z - az);
          if ((seg < r && t < 0.97) || cam < r + (h.sign ? 4 : 1.2)) want = 0;   // a name sign right at the lens would fill the view
        }
        if (h.want == null) h.want = 1;
        if (want !== h.want && !h.pending) { h.want = want; h.set(want, want ? 0.15 : 0); }
      }
      h.sway = S.ed.on && h.objId && h.objId === S.ed.sel ? Math.sin(S.t * 7) * 0.09 : 0;
      // a name sign is sized for the view: big enough to read from above, small near the lens behind the carriage so it
      // never runs off the frame
      if (h.sign) { const sg = h.pivot.children[0], d = Math.hypot(_cp.x - h.group.position.x, _cp.z - h.group.position.z);
        const want = follow ? Math.max(0.45, Math.min(1.7, d / 16)) : 1.7; sg.scale.setScalar(sg.scale.x + (want - sg.scale.x) * Math.min(1, dt * 6)); }
      h.update(dt);
      if (!h.face) continue;
      const g = h.group, yaw = follow ? Math.atan2(_cp.x - g.position.x, _cp.z - g.position.z) : S.cam.yaw;   // from above every card stands parallel to the picture
      if (h.yaw == null) h.yaw = yaw; let d = yaw - h.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); h.yaw += d * Math.min(1, dt * 5); g.rotation.y = h.yaw;
    }
  }
  function frame(now) {
    if (S.dead) return; requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (S.manual || !el.isConnected) { last = now; return; }
    tick(dt); post.render(S.t);
  }
  requestAnimationFrame(frame);

  // ---- API ---------------------------------------------------------------------------------------------------------
  const api = {
    THEMES,
    get theme() { return S.theme; }, get view() { return S.view; },
    /** d = { img, pins:[{id,x,y,name,kind,hidden}], routes:[{id,pts,prog}], party:{x,y}, activeRoute } */
    async setData(d, { rise } = {}) {
      const first = !S.data, imgChanged = !S.data || S.data.img !== d.img;
      const sig = (x) => JSON.stringify([x.img, (x.routes || []).map((r) => [r.id, r.pts])]);
      const rebuild = first || imgChanged || sig(S.data) !== sig(d);
      S.data = d;
      if (rebuild) { await build(rise ?? true); setCurve(); placeCar(true); camInit = false; S.cam.free = false; S.cam.tx = S.party.x; S.cam.tz = S.party.z; }
      else { syncObjs(); const prev = S.route?.id; setCurve(); if (S.route?.id !== prev) placeCar(true); }
    },
    get skin() { return S.skin; },
    /** where a speech bubble goes (host pixels): a map point {x,y} (a character token) or 'car'; null when it is
     *  behind the camera or off the frame (first person: the carriage is behind the driver's seat) */
    screenOf(at) {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return null;
      if (at === 'car' && S.view === 'first') return null;
      const v = at === 'car' || !at ? S.party.clone().setY((KIND_H.wagon || 3) + 0.8) : toWorld(at.x, at.y).setY(at.h ?? 2.2);
      camera.updateMatrixWorld(); const c = v.clone().applyMatrix4(camera.matrixWorldInverse); if (c.z > -0.5) return null;
      v.project(camera); const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
      return x < -40 || x > w + 40 || y < 0 || y > h + 40 ? null : { x, y };
    },
    /** GM placing mode: on/off, the kind a click on the page places (null = only select / move) */
    edit(on) { S.ed.on = !!on; if (!on) { S.ed.sel = null; S.ed.place = null; } if (on && S.view !== 'over') api.setView('over'); },
    place(kind) { S.ed.place = kind || null; },
    select(id) { S.ed.sel = id || null; },
    get selected() { return S.ed.sel; },
    /** the printed art of a kind in the current print set (picker thumbnails) */
    thumb(kind) { const a = artFor(S.skin, S.theme); return (a[kind] || a[ALIAS[kind]])?.img || ''; },
    async setSkin(sk) {
      if (!SKINS[sk] || sk === S.skin) return; S.skin = sk;
      if (!S.data) return;
      const wait = fold(); await new Promise((r) => setTimeout(r, wait * 1000));
      await build(true); setCurve(); placeCar(true);
    },
    /** tests: where every piece stands (must not depend on skin or world) */
    layout() { return S.hinges.filter((h) => h.kind).map((h) => [h.kind, +h.group.position.x.toFixed(2), +h.group.position.z.toFixed(2)]); },
    async setTheme(th) {
      if (!THEMES[th] || th === S.theme) return; S.theme = th;
      if (!S.data) return;
      const wait = fold(); await new Promise((r) => setTimeout(r, wait * 1000));
      await build(true); setCurve(); placeCar(true);
    },
    setView(v) { if (!['over', 'third', 'first'].includes(v)) return; S.view = v; S.cam.look = 0; S.cam.free = false; onView?.(v); },
    replay() { raise(); },
    /** tests: stop the live loop and advance a fixed clock */
    step(sec, fps = 30) { S.manual = true; for (let i = 0; i < Math.round(sec * fps); i++) tick(1 / fps); post.render(S.t); },
    dispose() { removeEventListener('keydown', onKey); S.dead = true; ro.disconnect(); renderer.dispose(); renderer.domElement.remove(); },
    _S: S,
  };
  return api;
}
