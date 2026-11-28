// 단축키: Shift+Z 잡담 열고 닫기, Shift+X 대사 기록 열고 닫기 (Alt+Z/X도 같음, 입력 중엔 Shift는 글자로)
// usage: node tests/chat_keys_test.js
const { chromium } = require('playwright'); const path = require('path'), url = require('url');
const U = url.pathToFileURL(path.join(__dirname, '..', 'index.html')).href;
const R = []; const ok = (lab, c, v = '') => { R.push(!!c); console.log((c ? 'OK  ' : 'FAIL'), lab, v === '' ? '' : JSON.stringify(v)); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const role of ['gm', 'pl']) {
    const pg = await b.newPage({ viewport: { width: 1400, height: 800 } });
    pg.on('pageerror', (e) => errs.push(role + ': ' + String(e).slice(0, 200)));
    await pg.goto(U);
    await pg.evaluate((s) => { localStorage.clear(); for (const k in s) localStorage.setItem(k, s[k]); }, { 'fu.user': JSON.stringify(role === 'gm' ? 'GM' : '레온'), 'fu.role': role, 'fu.room': '', 'fu.fbcfg': 'offline', 'fu.play.tab': JSON.stringify('stage'), 'fu.play.log': 'false' });
    await pg.reload(); await pg.waitForTimeout(2500);
    for (let i = 0; i < 8; i++) { if (!await pg.evaluate(() => { const t = document.getElementById('title'); return !!t && t.isConnected && getComputedStyle(t).display !== 'none'; })) break; await pg.keyboard.press('Enter'); await pg.waitForTimeout(1500); }
    const o = pg.getByText('오프라인으로만 쓰기'); if (await o.count() && await o.first().isVisible()) { await o.first().click(); await pg.waitForTimeout(800); }
    await pg.evaluate(() => { document.getElementById('pcpick')?.remove(); P.stage.lines.push({ id: 'l1', who: 'narr', name: '', text: '바람이 분다.', t: Date.now() }); showLog = false; dtab = 'log'; render(); document.activeElement?.blur?.(); });
    const st = () => pg.evaluate(() => ({ open: showLog && !document.getElementById('drawer').classList.contains('hide'), dtab, focus: document.activeElement?.id || '', lg: !!document.querySelector('#modal .lgbox'), lgk: LGV.k }));
    await pg.keyboard.press('Shift+KeyZ'); await pg.waitForTimeout(200); let s = await st();
    ok(`${role}: Shift+Z opens 잡담 (and puts the cursor there)`, s.open && s.dtab === 'chat' && s.focus === 'chatin', s);
    await pg.keyboard.press('Shift+KeyZ'); s = await st();
    ok(`${role}: Shift+Z in the chat box types Z`, s.open && await pg.inputValue('#chatin') === 'Z', s);
    await pg.keyboard.press('Alt+KeyZ'); await pg.waitForTimeout(200); s = await st();
    ok(`${role}: Alt+Z closes 잡담 even with the cursor in the chat box`, !s.open && s.focus !== 'chatin', s);
    await pg.keyboard.press('Shift+KeyX'); await pg.waitForTimeout(300); s = await st();
    ok(`${role}: Shift+X opens 대사 기록`, s.lg && s.lgk === 'stage' && await pg.evaluate(() => document.querySelector('#modal .lgbox').textContent.includes('바람이 분다')), s);
    await pg.keyboard.press('Shift+KeyX'); await pg.waitForTimeout(200); s = await st();
    ok(`${role}: Shift+X again closes it`, !s.lg, s);
    await pg.keyboard.press('Alt+KeyX'); await pg.waitForTimeout(200); ok(`${role}: Alt+X opens it too`, (await st()).lg);
    await pg.keyboard.press('Shift+KeyZ'); await pg.waitForTimeout(200); s = await st();
    ok(`${role}: Shift+Z from the log closes it and opens 잡담`, !s.lg && s.open && s.dtab === 'chat', s);
    await pg.close();
  }
  await b.close(); console.log('errors:', errs.slice(0, 5));
  const pass = R.every(Boolean) && !errs.length; console.log(pass ? 'PASS' : 'FAILED'); process.exit(pass ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
