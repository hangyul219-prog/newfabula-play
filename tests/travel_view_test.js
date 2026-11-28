// paper travel map: every window picks its own view (위에서 / 3인칭 / 1인칭), remembers it, and never sends it to the room
// usage: node tests/travel_view_test.js [outdir]
//   THREE_DIR=<folder with three.module.js + three.core.js> serves three locally when the CDN can't be reached
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), url = require('url');
const D = __dirname, OUT = process.argv[2] || path.join(D, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const U = url.pathToFileURL(path.join(D, '..', 'index.html')).href;
const MAP = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(D, '..', 'tools/travel_paper/testmap.jpg')).toString('base64');
const SEED = `m=>{IMG.cache.set('t-map',m);P.map.img='t-map';P.map.pins=[
 {id:'a',x:.1,y:.56,name:'리오네 항구',desc:'',kind:'town',hidden:false},{id:'b',x:.6,y:.42,name:'왕도 아스테리아',desc:'',kind:'town',hidden:false}];
 P.map.routes=[{id:'r1',pts:[[.1,.56],[.22,.52],[.34,.47],[.46,.44],[.6,.42]],days:4,step:1,prog:.25,die:10}];P.map.party={x:.22,y:.52};P.map.toks=[];
 P.map.objs=[['forest',.25,.3],['oak',.42,.6]].map(([k,x,y],i)=>({id:'o'+i,k,x,y,s:1}));P.view='map';saveP();tab='map';render()}`;
const R = []; const ok = (lab, c, v = '') => { R.push(!!c); console.log((c ? 'OK  ' : 'FAIL'), lab, v === '' ? '' : JSON.stringify(v)); };
const errs = [];
async function open(b, role) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 800 } });
  if (process.env.THREE_DIR) await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/build\/(.+)$/, (r) =>
    r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(process.env.THREE_DIR, r.request().url().split('/').pop())) }));
  const pg = await ctx.newPage(); pg.role = role;
  pg.on('pageerror', (e) => errs.push(role + ': ' + e + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(role + ' console: ' + m.text()); });
  await pg.goto(U);
  await pg.evaluate((s) => { localStorage.clear(); for (const k in s) localStorage.setItem(k, s[k]); },
    { 'fu.user': JSON.stringify(role === 'gm' ? 'GM' : '레온'), 'fu.role': role === 'gm' ? 'gm' : 'pl', 'fu.room': '', 'fu.fbcfg': 'offline', 'fu.theme': JSON.stringify('metaphor'), 'fu.play.tab': JSON.stringify('combat') });
  await enter(pg); return pg;
}
async function enter(pg) {
  await pg.reload(); await pg.waitForTimeout(2500);
  for (let i = 0; i < 8; i++) {
    if (!await pg.evaluate(() => { const t = document.getElementById('title'); return !!t && t.isConnected && getComputedStyle(t).display !== 'none'; })) break;
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500);
  }
  const o = pg.getByText('오프라인으로만 쓰기'); if (await o.count() && await o.first().isVisible()) { await o.first().click(); await pg.waitForTimeout(800); }
  await pg.evaluate(([s, m]) => (0, eval)(s)(m), [SEED, MAP]);
  await pg.waitForFunction(() => typeof TP !== 'undefined' && TP.ctl && TP.ctl._S.data && TP.ctl._S.hinges.length >= 4, null, { timeout: 60000 });
  await pg.evaluate(() => { document.getElementById('pcpick')?.remove(); TP.ctl.step(4); });  // player's character picker (no sheet here)
}
const view = (pg) => pg.evaluate(() => ({ ctl: TP.ctl.view, ui: document.querySelector('.tpbar [data-tp="view"].gold')?.dataset.v, saved: localStorage.getItem('fu.paper.view') }));
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const gm = await open(b, 'gm'), pl = await open(b, 'pl');
  ok('player: is not GM', await pl.evaluate(() => !GM));
  ok('player: has the three view buttons', await pl.evaluate(() => document.querySelectorAll('.tpbar [data-tp="view"]').length) === 3);
  ok('player: no world select (world stays the GM\'s)', await pl.evaluate(() => !document.querySelector('.tpbar select')));
  ok('first visit starts from above', (await view(gm)).ctl === 'over' && (await view(pl)).ctl === 'over');
  // each window picks its own view
  await gm.click('.tpbar [data-v="third"]'); await pl.click('.tpbar [data-v="first"]');
  await gm.evaluate(() => TP.ctl.step(2)); await pl.evaluate(() => TP.ctl.step(2));
  let g = await view(gm), p = await view(pl);
  ok('GM sees third person', g.ctl === 'third' && g.ui === 'third' && g.saved === 'third', g);
  ok('player sees first person', p.ctl === 'first' && p.ui === 'first' && p.saved === 'first', p);
  await gm.screenshot({ path: path.join(OUT, 'tpv_gm_third.png') }); await pl.screenshot({ path: path.join(OUT, 'tpv_pl_first.png') });
  ok('view is not in the room data', await gm.evaluate(() => !/"(over|third|first)"/.test(JSON.stringify(P.map)) && !['over', 'third', 'first'].includes(P.view)) && await pl.evaluate(() => !/"(over|third|first)"/.test(JSON.stringify(P.map)) && !['over', 'third', 'first'].includes(P.view)));
  // room changes (route progress, map re-render) don't touch anyone's view
  await gm.evaluate(() => { V.route = 'r1'; renderMap(); routeProg(.6, false); TP.ctl.step(2); });
  ok('route progress keeps the GM view', (await view(gm)).ctl === 'third');
  // leaving the tab and coming back keeps it
  await pl.evaluate(() => { tab = 'combat'; render(); }); await pl.waitForTimeout(300);
  await pl.evaluate(() => { tab = 'map'; render(); }); await pl.waitForTimeout(1200); await pl.evaluate(() => TP.ctl.step(3));
  ok('re-entering the tab keeps first person', (await view(pl)).ctl === 'first', await view(pl));
  // GM placing forces the overview, then gives the GM their own view back (and does not overwrite the saved pick)
  await gm.click('.tpbar [data-tp="edit"]'); await gm.waitForTimeout(200);
  g = await view(gm); ok('placing switches to above', g.ctl === 'over' && g.saved === 'third', g);
  await gm.click('.tpbar [data-tp="edit"]'); await gm.waitForTimeout(200);
  g = await view(gm); ok('closing placing returns to third person', g.ctl === 'third' && g.ui === 'third' && g.saved === 'third', g);
  // reload: each window comes back in its own view
  await enter(gm); await enter(pl);
  g = await view(gm); p = await view(pl);
  ok('GM reload -> third person again', g.ctl === 'third' && g.ui === 'third', g);
  ok('player reload -> first person again', p.ctl === 'first' && p.ui === 'first', p);
  await pl.screenshot({ path: path.join(OUT, 'tpv_pl_reload.png') });
  // a junk saved value falls back to the overview
  await pl.evaluate(() => localStorage.setItem('fu.paper.view', 'sideways')); await enter(pl);
  ok('bad saved value -> above', (await view(pl)).ctl === 'over');
  await b.close();
  console.log('errors:', errs.slice(0, 6).map((e) => e.slice(0, 300))); console.log(R.every(Boolean) && !errs.length ? 'PASS' : 'FAILED');
  process.exit(R.every(Boolean) && !errs.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
