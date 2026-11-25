// Attendance Explorer: checks that use the pages as a visitor would. Serve the site on port 8765 first: python3 -m http.server 8765 -d site
// node scripts/check_attendance_ux.js <folder for screenshots>
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = process.argv[2]; const errs = [];
  const mk = async (w) => { const p = await b.newPage({ viewport: { width: w, height: 844 } }); p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e))); return p; };
  // 1. school page: random landing has its own address; search picks a school; add a school to compare; Back works
  let p = await mk(390); await p.goto('http://localhost:8765/attendance/school/'); await p.waitForTimeout(2200);
  console.log('random landing address names a school:', /urn=\d+/.test(p.url()));
  await p.fill('#sx-q', 'chase high'); await p.waitForTimeout(1500); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  console.log('after search:', await p.locator('#sx-name').textContent(), '|', p.url().split('8765')[1]);
  console.log('tabs (school):', (await p.locator('#ax-secnav a:visible').allTextContents()).join(' | ')); await p.locator('#ax-secnav a', { hasText: 'Compare' }).click(); await p.waitForTimeout(700);          // comparing lives in its own tab
  await p.fill('#sx-q2', 'knole'); await p.waitForTimeout(1200); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  console.log('after add:', p.url().split('8765')[1], '| rows', await p.locator('#sx-cmp tbody tr').count(), '| chips', await p.locator('#sx-chips button').count());
  await p.goBack(); await p.waitForTimeout(1200); console.log('after Back:', await p.locator('#sx-name').textContent());
  console.log('first figure at px (school, phone):', await p.evaluate(() => Math.round(document.querySelector('.ax-kpi, .ax-reading').getBoundingClientRect().top + scrollY)));
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
