#!/bin/sh
# Attendance Explorer: the gate to pass before any commit that touches site/attendance. Stops at the first failure.
#   sh scripts/check_attendance.sh        (serve the site first: python3 -m http.server 8765 -d site)
set -e
cd "$(dirname "$0")/.."
for f in site/attendance/*.js; do node -e "new Function(require('fs').readFileSync('$f','utf8'))" || { echo "SYNTAX ERROR in $f"; exit 1; }; done
echo "scripts parse"
out=$(mktemp -d)
node scripts/check_attendance_ux.js "$out" > "$out/ux.txt" 2>&1 || { cat "$out/ux.txt"; echo "VISITOR CHECK FAILED"; exit 1; }
grep -q 'errors: \[\]' "$out/ux.txt" || { cat "$out/ux.txt"; echo "CONSOLE ERRORS ON A PAGE"; exit 1; }
node - <<'JS' || { echo "A PAGE FAILED TO LOAD CLEANLY"; exit 1; }
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); let bad = 0;
  const pages = ['/attendance/', '/attendance/#area=E08000025&phase=S', '/attendance/school/?urn=141741', '/attendance/school/?urn=107702', '/attendance/group/?k=a&id=E08000025&phase=S', '/attendance/group/?k=y&id=kent',
    '/attendance/group/?k=c&id=E14001063', '/attendance/group/?k=w&id=E05000954', '/attendance/patterns/', '/attendance/start/', '/explorer/'];
  for (const w of [375, 1300]) { const p = await b.newPage({ viewport: { width: w, height: 850 } }); const errs = [];
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
    for (const u of pages) { errs.length = 0; await p.goto('http://localhost:8765' + u); await p.waitForTimeout(2000);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth), svgs = await p.locator('svg').count();
      if (errs.length || sw > w || (u !== '/attendance/start/' && svgs < 2)) { bad++; console.log('FAIL', w, u, 'scrollWidth', sw, 'charts', svgs, errs.slice(0, 2)); } }
    await p.close(); }
  await b.close(); console.log(bad ? bad + ' page loads failed' : 'pages load cleanly at 375 and 1300'); process.exit(bad ? 1 : 0); })();
JS
echo "ALL CHECKS PASSED"
