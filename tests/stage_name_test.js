// standing dialogue: the speaker's name stays visible on every line in every theme — new speaker, same speaker again,
// after narration, quick lines in a row (metaphor once lost its name tag whenever the same person spoke twice)
// usage: node tests/stage_name_test.js [outdir]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), url = require('url');
const OUT = process.argv[2] || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const U = url.pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const R = []; const ok = (lab, c, v = '') => { R.push(!!c); console.log((c ? 'OK  ' : 'FAIL'), lab, v === '' ? '' : JSON.stringify(v)); };
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] }); const errs = [];
  for (const th of ['metaphor', 'octo', 'ff']) for (const [w, h] of [[1400, 800], [390, 844]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } }); pg.on('pageerror', (e) => errs.push(th + ': ' + String(e).slice(0, 200)));
    await pg.goto(U);
    await pg.evaluate((s) => { localStorage.clear(); for (const k in s) localStorage.setItem(k, s[k]); }, { 'fu.user': JSON.stringify('GM'), 'fu.role': 'gm', 'fu.room': '', 'fu.fbcfg': 'offline', 'fu.theme': JSON.stringify(th), 'fu.play.tab': JSON.stringify('stage') });
    await pg.reload(); await pg.waitForTimeout(2500);
    for (let i = 0; i < 8; i++) { if (!await pg.evaluate(() => { const t = document.getElementById('title'); return !!t && t.isConnected && getComputedStyle(t).display !== 'none'; })) break; await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500); }
    const o = pg.getByText('오프라인으로만 쓰기'); if (await o.count() && await o.first().isVisible()) { await o.first().click(); await pg.waitForTimeout(800); }
    await pg.evaluate(() => { P.npcs.push({ id: 'n1', name: '레온하르트', hidden: false }, { id: 'n2', name: '미라', hidden: false }); tab = 'stage'; render(); window.__i = 0;
      window.say = (who, text) => { P.stage.lines.push({ id: 'x' + (++__i), who, name: unitName(who) || '', text, think: false, t: Date.now() }); renderStage(); };
      // the name is on screen: the tag's middle (and its left part) is the tag itself when hit-tested — clip-path hides from hit tests too
      window.seen = () => { const d = document.querySelector('#stagein>.dlg:last-of-type'), n = d?.querySelector('.who'); if (!n) return { who: null };
        const r = n.getBoundingClientRect(), hit = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === n || n.contains(e)); };
        return { who: n.textContent, shown: r.width > 0 && hit(r.left + Math.min(30, r.width / 2), r.top + r.height / 2) && hit(r.left + r.width / 2, r.top + r.height / 2) }; }; });
    const seq = [['n:n1', '"머리 울려."'], ['n:n1', '"정말로."'], ['n:n2', '"괜찮아?"'], ['n:n2', '"쉬어."'], ['n:n2', '"응?"'], ['narr', '바람이 분다.'], ['n:n1', '"머리 울려."']];
    // lines play one after another: wait until each is the one in the box, let its slide-in finish, then look
    const bad = []; let last;
    for (const [who, t] of seq) {
      const id = await pg.evaluate(([a, c]) => { say(a, c); return 'x' + __i; }, [who, t]);
      await pg.waitForFunction((id) => document.querySelector('#stagein>.dlg:last-of-type')?.dataset.id === id, id, { timeout: 15000 });
      await pg.evaluate(() => document.getElementById('stage').scrollIntoView({ block: 'center' })); await pg.waitForTimeout(900);
      last = await pg.evaluate(() => seen()); if (who !== 'narr' && !(last.who && last.shown)) bad.push([who, t, last]);
    }
    ok(`${th} ${w}px: name shown on every line`, !bad.length && last.who === '레온하르트', bad.length ? bad : last);
    await pg.screenshot({ path: path.join(OUT, `stname_${th}_${w}.png`) }); await pg.close();
  }
  await b.close(); console.log('errors:', errs.slice(0, 5));
  const pass = R.every(Boolean) && !errs.length; console.log(pass ? 'PASS' : 'FAILED'); process.exit(pass ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
