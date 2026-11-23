/* At a glance: a spine chart of every results measure (benchmarks item 5, 23 November 2026).
   One row per measure. The grey bar is the spread across England's secondaries (5th to 95th percentile, the middle
   half darker), the dark tick England's average, the verdigris tick the average of the 50 similar schools, the
   midnight diamond this school. Each row has its own scale. The reading against the similar schools is written at
   the end of the row, in colour only where the difference is larger than chance (the same rules as the four readings). */
(() => {
  const OE = window.OE; if (!OE) return;
  const {BANDC, f1, fs} = OE;
  const NS = 'http://www.w3.org/2000/svg';
  const ok = (v) => !(v === null || v === undefined || v === '' || isNaN(+v));
  const S = () => { const s = dash.data('school'); return s.status === 'ok' && s.data && s.data[0] ? s.data[0] : null; };
  const N = () => { const n = dash.data('neigh'); return n.status === 'ok' ? n.data : []; };
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const q = (s, p) => d3.quantileSorted(s, p);

  // England distributions, once per load of the data
  let DIST = null, DSRC = null;
  const dist = (rows) => { if (DSRC === rows) return DIST; DSRC = rows; DIST = {};
    ['a8', 'em5', 'em4', 'a8_25', 'p8_24'].forEach((k) => { const v = rows.map((r) => r[k]).filter(ok).map(Number).sort(d3.ascending);
      let s = 0, n = 0; rows.forEach((r) => { if (ok(r[k]) && +r.pupils > 0) { s += +r[k] * +r.pupils; n += +r.pupils; } });
      DIST[k] = {p05: q(v, 0.05), p25: q(v, 0.25), p75: q(v, 0.75), p95: q(v, 0.95), min: v[0], max: v[v.length - 1], wmean: n ? s / n : null}; });
    return DIST; };

  // the rows: value, similar-schools average, England average (where it is the same year's cohort), reading
  OE.spineRows = () => { const r = S(), k = dash.data('ks4'); if (!r || r.rc_only || k.status !== 'ok') return [];
    const D = dist(k.data), nb = N(), n = +r.pupils, out = [];
    const band = (g, se, sd) => (Math.abs(g) <= 1.96 * se ? 'Close to' : g > 0 ? (g > sd ? 'Well above' : 'Above') : (-g > sd ? 'Well below' : 'Below'));
    if (ok(r.a8)) out.push({key: 'a8', lab: 'Attainment 8, 2025/26', unit: '', v: +r.a8, sim: ok(r.ss_mean) ? +r.ss_mean : null, eng: D.a8.wmean, reading: r.ss_band || '', d: D.a8, fmt: f1});
    if (ok(r.em5)) { const sim = ok(r.em5_ss) ? +r.em5_ss : null, sd = +r.em5_ssd || 0, pp = Math.min(99, Math.max(1, +r.em5)), se = Math.sqrt(pp * (100 - pp) / Math.max(n, 1) + sd * sd / 50);
      out.push({key: 'em5', lab: 'English and maths grade 5+, 2025/26', unit: '%', v: +r.em5, sim, eng: D.em5.wmean, reading: sim === null ? '' : band(+r.em5 - sim, se, sd), d: D.em5, fmt: (x) => f1(x) + '%'}); }
    if (ok(r.em4)) { const v = nb.map((x) => x.em4).filter(ok).map(Number);
      out.push({key: 'em4', lab: 'English and maths grade 4+, 2025/26', unit: '%', v: +r.em4, sim: v.length ? mean(v) : null, eng: D.em4.wmean, reading: '', note: 'no reading', d: D.em4, fmt: (x) => f1(x) + '%'}); }
    if (ok(r.a8_25)) out.push({key: 'a8_25', lab: 'Attainment 8, 2024/25', unit: '', v: +r.a8_25, sim: ok(r.ss_diff_25) ? +r.a8_25 - +r.ss_diff_25 : null, eng: null, reading: r.ss_band_25 || '', d: D.a8_25, fmt: f1});
    if (ok(r.p8_24)) out.push({key: 'p8_24', lab: 'Progress 8, 2023/24', unit: '', v: +r.p8_24, sim: null, eng: 0, reading: ((b) => (b === 'Not available' ? '' : b.replace(' average', '').replace(/^Average$/, 'Close to')))(OE.p8Band(+r.p8_24, +r.p8lo_24, +r.p8hi_24)), vsEngland: true, d: D.p8_24, fmt: d3.format('+.2f')});
    return out; };

  const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([a, v]) => e.setAttribute(a, v)); if (text !== undefined) e.textContent = text; return e; };
  const TXT = (x, y, s, size, o = {}) => mk('text', {x, y, 'text-anchor': o.anchor || 'start', style: `font-size:${size}px;font-weight:${o.w || 400};fill:${o.fill || '#0B1A2E'}`}, s);

  dash.draw('spine', (box) => { box.replaceChildren(); const rows = OE.spineRows(); const sec = box.closest('.oe-spinew'); if (sec) sec.hidden = !rows.length; if (!rows.length) return;
    const W = Math.max(300, box.clientWidth || 700), narrow = W < 560, RH = narrow ? 70 : 54, LW = narrow ? 0 : 270, RW = narrow ? 0 : 140, BX = LW, BW = W - LW - RW;
    const svg = mk('svg', {width: '100%', viewBox: `0 0 ${W} ${rows.length * RH + 4}`, role: 'img', 'aria-label': 'Each results measure for this school against England and its 50 similar schools: ' + rows.map((x) => x.lab + ' ' + x.fmt(x.v) + (x.reading ? ', ' + x.reading.toLowerCase() + (x.vsEngland ? ' the national average' : ' its similar schools') : '')).join('; ') + '.'});
    rows.forEach((x, i) => { const y0 = i * RH; const lo = Math.min(x.d.p05, x.v, x.sim ?? x.v, x.eng ?? x.v), hi = Math.max(x.d.p95, x.v, x.sim ?? x.v, x.eng ?? x.v); const pad = (hi - lo) * 0.04;
      const X = (v) => BX + BW * (v - (lo - pad)) / ((hi - lo + 2 * pad) || 1); const by = narrow ? y0 + 26 : y0 + 18;
      svg.append(mk('line', {x1: 0, x2: W, y1: y0, y2: y0, style: 'stroke:#EEF0F3'}));
      svg.append(TXT(0, narrow ? y0 + 17 : y0 + 30, x.lab, 13.5, {w: 500}));
      const rc = x.reading && x.reading !== 'Close to' ? (BANDC[x.reading] || '#55627A') : '#55627A';
      const rtext = x.reading ? x.reading + (x.vsEngland ? ' national' : '') : '';
      if (rtext) svg.append(TXT(W, narrow ? y0 + 17 : y0 + 30, rtext, 13, {w: x.reading && x.reading !== 'Close to' ? 600 : 400, fill: rc, anchor: 'end'}));
      svg.append(mk('rect', {x: X(x.d.p05), y: by, width: Math.max(1, X(x.d.p95) - X(x.d.p05)), height: 16, style: 'fill:#EEF0F3'}));
      svg.append(mk('rect', {x: X(x.d.p25), y: by, width: Math.max(1, X(x.d.p75) - X(x.d.p25)), height: 16, style: 'fill:#D8DDE5'}));
      if (x.eng !== null) svg.append(mk('rect', {x: X(x.eng) - 1, y: by - 4, width: 2, height: 24, style: 'fill:#55627A'}));
      if (x.sim !== null) svg.append(mk('rect', {x: X(x.sim) - 1.5, y: by - 4, width: 3, height: 24, style: 'fill:#2F6F66'}));
      svg.append(mk('path', {d: `M${X(x.v)} ${by - 2} l10 10 l-10 10 l-10 -10 z`, style: 'fill:#0B1A2E;stroke:#FFFFFF;stroke-width:2'}));
      const vals = 'School ' + x.fmt(x.v) + (x.sim !== null ? ' · 50 similar ' + x.fmt(x.sim) : '') + (x.eng !== null ? ' · England ' + x.fmt(x.eng) : '');
      svg.append(TXT(BX, by + 32, vals, 12, {fill: '#55627A'})); });
    box.append(svg); });
})();
