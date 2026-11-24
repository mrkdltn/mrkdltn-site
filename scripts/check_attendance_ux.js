// Attendance Explorer: checks that use the pages as a visitor would. Serve the site on port 8765 first: python3 -m http.server 8765 -d site
// node scripts/check_attendance_ux.js <folder for screenshots>
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = process.argv[2]; const errs = [];
  const mk = async (w) => { const p = await b.newPage({ viewport: { width: w, height: 844 } }); p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e))); return p; };
  // 1. school page (rebuilt): no random landing; search finds a common name and picks a school; Back works; and the page keeps
  //    to its budget on a phone: the answer within one screen, at most five sections, at most five screens before "More detail"
  let p = await mk(390); await p.goto('http://localhost:8765/attendance/school/'); await p.waitForTimeout(1500);
  const budget = (ok, what) => { if (!ok) errs.push('BUDGET: ' + what); };
  budget(!/urn=\d+/.test(p.url()) && await p.locator('#sx-empty').isVisible(), 'the school page should open on the search, not a random school');
  await p.fill('#sx-q', 'st mary'); await p.waitForTimeout(1800); const hits = await p.locator('#sx-list li').allTextContents();
  console.log('search "st mary":', hits.slice(0, 3).join(' | ')); budget(hits.length > 0 && /St\.? Mary/i.test(hits[0]) && /Primary|Secondary|Special/.test(hits[0]), 'search for "st mary" should lead with a St Mary’s school');
  await p.fill('#sx-q', 'chase high'); await p.waitForTimeout(1500); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  console.log('after search:', await p.locator('#sx-name').textContent(), '|', p.url().split('8765')[1]);
  const m = await p.evaluate(() => ({ first: Math.round(document.querySelector('#sx-reading b').getBoundingClientRect().bottom + scrollY), verdict: document.getElementById('sx-verdict').textContent, sections: document.querySelectorAll('main section, main details').length,
    screens: document.documentElement.scrollHeight / innerHeight, controls: document.querySelectorAll('main select, main .ax-seg, main input').length, share: document.getElementById('sx-share').textContent, rows: document.querySelectorAll('#sx-table tbody tr').length, sw: document.documentElement.scrollWidth }));
  console.log('school page:', JSON.stringify(m));
  budget(m.first < 844, 'first figure at ' + m.first + 'px, beyond one phone screen'); budget(m.sections <= 5, m.sections + ' sections'); budget(m.screens <= 5, m.screens.toFixed(1) + ' phone screens'); budget(m.controls === 0, 'page-wide controls present');
  budget(/^Absence is /.test(m.verdict), 'no verdict heading'); budget(/% of .* had a higher rate/.test(m.share), 'no share-of-schools sentence'); budget(m.rows >= 4, 'comparison table has ' + m.rows + ' rows'); budget(m.sw <= 390, 'sideways scroll');
  await p.locator('#sx-more summary').click(); await p.waitForTimeout(1800); const sim = await p.locator('#sx-simt tbody tr').count(); console.log('similar schools listed:', sim); budget(sim === 20, 'similar schools table has ' + sim + ' rows');
  await p.goBack(); await p.waitForTimeout(1200); budget(await p.locator('#sx-empty').isVisible(), 'Back should return to the search');
  await p.close();
  // 2. group pages: nothing hidden is showing; first figure position; controls as menus; Showing strip
  for (const [n, q] of [['ward', 'k=w&id=E05000954'], ['trust', 'k=t&id=1337&phase=S'], ['la', 'k=a&id=E08000025&phase=S'], ['con', 'k=c&id=E14001063']]) {
    p = await mk(390); await p.goto('http://localhost:8765/attendance/group/?' + q); await p.waitForTimeout(2400);
    const i = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, shownFields: [...document.querySelectorAll('.ax-controls .ax-field')].filter((f) => f.offsetParent !== null).map((f) => f.querySelector('span').textContent).join(','),
      kinds: !!(document.querySelector('.ax-kinds') && document.querySelector('.ax-kinds').offsetParent), first: Math.round(document.querySelector('#gx-reading').getBoundingClientRect().top + scrollY), ctrlH: Math.round(document.querySelector('.ax-controls').getBoundingClientRect().height) }));
    console.log(n, JSON.stringify(i));
    if (n === 'la') { await p.screenshot({ path: out + '/ux-la-top.png' });
      await p.selectOption('#gx-pg-f select.ax-msel', { label: 'Free school meals' }); await p.selectOption('#gx-meas-f select.ax-msel', { label: 'Severe' }); await p.selectOption('#gx-view-f select.ax-msel', { label: 'Change in a year' }); await p.waitForTimeout(800);
      console.log('focus line:', await p.locator('.ax-focus').innerText());
      await p.evaluate(() => scrollTo(0, 2600)); await p.waitForTimeout(600); console.log('strip:', await p.locator('.ax-showing').innerText().catch(() => 'none')); await p.screenshot({ path: out + '/ux-la-scrolled.png' });
      const href = await p.evaluate(() => { const h = document.querySelector('.ax-hexes path'); return h ? 'hex present' : 'no hex'; }); console.log(href, '| address', p.url().split('?')[1]); }
    await p.close();
  }
  // 3. desktop sanity and random examples carry a pooled figure
  p = await mk(1300); for (const k of ['w', 'a', 'c', 'y', 't']) { await p.goto('http://localhost:8765/attendance/group/?k=' + k); await p.waitForTimeout(2200); console.log('random', k, '|', (await p.locator('#gx-name').textContent()).slice(0, 30), '| kpis', await p.locator('#gx-kpis .ax-kpi').count(), '| address has id', /id=/.test(p.url())); }
  await p.goto('http://localhost:8765/attendance/group/?k=t&id=1337'); await p.waitForTimeout(2000); await p.fill('#gx-q', 'north tyneside'); await p.waitForTimeout(1500); console.log('trust page search first:', (await p.locator('#gx-list li').first().innerText()).replace(/\n/g, ' | '));
  console.log('errors:', errs.slice(0, 4)); await b.close();
})();
