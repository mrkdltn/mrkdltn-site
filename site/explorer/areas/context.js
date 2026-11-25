// Report card areas in context: the pre-registered models (docs/analysis-plans/grades-context-plan.md).
// Three sections, drawn once from /explorer/data/grades_context.json (rebuilt weekly):
//   #held       deprivation gap by area, alone and with other context held constant (dot and whisker)
//   #inspected  inspected schools against all schools, per context variable
//   #settling   the controlled gap re-estimated on report cards published by the end of each month
// Every sentence is computed from the json. View state in the address: #sec=held&phase=secondary.
(() => {
  // exhibit.js (tables and downloads) expects the Explorer's page objects; this page has no school
  window.OE = window.OE || {};
  if (!window.dash) window.dash = {onData() {}, data() { return {}; }};

  const INK = '#0B1A2E', VERD = '#2F6F66', MUTED = '#55627A', SOFT = '#8A96A8', GRID = '#EEF1F5', AXIS = '#C5CCD8', BRASS = '#C9A24B';
  const NS = 'http://www.w3.org/2000/svg';
  const PHASES = {primary: 'Primary', secondary: 'Secondary'};
  const PLURAL = {Primary: 'primaries', Secondary: 'secondaries'};
  const READ = {clear: 'clear', clear_single: 'clear on its own', inconclusive: 'too uncertain to call', none: 'no clear gap', small: 'small',
    low_events: 'too few schools to read', not_fitted: 'too few schools'};
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f0 = (v) => String(Math.round(v));
  const pp = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + f1(Math.abs(v));
  const cnt = (v) => Number(v).toLocaleString('en-GB');
  const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const lcArea = (s) => lc(s);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // wrap a label into lines of at most n characters
  const lines = (s, n) => { const out = []; let l = ''; s.split(' ').forEach((w) => { if ((l + ' ' + w).trim().length > n && l) { out.push(l); l = w; } else l = (l + ' ' + w).trim(); }); if (l) out.push(l); return out; };
  const list = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const dateGB = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
  const monthGB = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const sv = (t, a, p) => { const e = document.createElementNS(NS, t); Object.entries(a || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (p) p.append(e); return e; };
  const txt = (p, x, y, s, cls, a) => { const t = sv('text', Object.assign({x, y, class: cls || 'gc-ax'}, a || {}), p); t.textContent = s; return t; };
  const tip = (node, s) => { const t = sv('title', {}, node); t.textContent = s; };
  const rich = (e, s) => { s.split(/(\*\*[^*]+\*\*)/).forEach((p) => { if (/^\*\*/.test(p)) e.append(el('b', '', p.slice(2, -2))); else if (p) e.append(p); }); return e; };
  const ciTxt = (c) => `${pp(c[0])} points (95% CI ${pp(c[1])} to ${pp(c[2])})`;

  // ---------- view state in the address ----------
  const hash = () => Object.fromEntries(location.hash.replace(/^#/, '').split('&').filter((p) => p.includes('=')).map((p) => p.split('=').map(decodeURIComponent)));
  const setHash = (k, v) => { const h = hash(); h[k] = v; const s = Object.entries(h).map(([a, b]) => encodeURIComponent(a) + '=' + encodeURIComponent(b)).join('&');
    history.replaceState(null, '', location.pathname + location.search + (s ? '#' + s : '')); };
  let phase = PHASES[(hash().phase || '').toLowerCase()] || 'Primary';

  let J = null;
  const width = (box) => Math.max(300, Math.round(box.clientWidth || 300));

  // ---------- 1. Context, held constant ----------
  function heldLead(ph) {
    const rows = J.held[ph], n = J.counts[ph].inspected;
    const clear = rows.filter((r) => r.reading === 'clear').sort((a, b) => b.controlled[0] - a.controlled[0]);
    const single = rows.filter((r) => r.reading === 'clear_single');
    const unsure = rows.filter((r) => r.reading === 'inconclusive' || r.reading === 'none' || r.reading === 'small');
    const low = rows.filter((r) => r.reading === 'low_events' || r.reading === 'not_fitted');
    const held = ph === 'Secondary'
      ? '2024/25 results against 50 similar schools, prior attainment, SEN, pupil stability, size, region, urban or rural setting and governance'
      : 'SEN, size, region, urban or rural setting and governance';
    const out = [];
    if (clear.length) {
      const t = clear[0];
      let s = `Among **${cnt(t.n || n)}** inspected ${PLURAL[ph]}, those in the most deprived fifth were more likely than those in the least deprived fifth to be graded below Expected standard for ${lcArea(t.name)}, by **${ciTxt(t.controlled)}**, with ${held} held constant`;
      if (ph === 'Secondary' && t.raw) s += `. Before anything was held constant the gap was ${pp(t.raw[0])} points`;
      const more = clear.slice(1).map((r) => `${lcArea(r.name)} (${pp(r.controlled[0])})`);
      if (more.length) s += `. The gap is also clear for ${list(more)}`;
      out.push(s + '.');
    } else {
      out.push(`Among ${cnt(n)} inspected ${PLURAL[ph]}, no area shows a clear gap between the most and least deprived fifths once ${held} are held constant.`);
    }
    if (single.length) out.push(`${cap(list(single.map((r) => lcArea(r.name))))} ${single.length > 1 ? 'pass' : 'passes'} the ${f0(J.threshold_pp)}-point threshold on ${single.length > 1 ? 'their' : 'its'} own, but not once allowance is made for testing ${J.family_size} estimates.`);
    if (unsure.length) {
      const hi = Math.max(...unsure.map((r) => r.controlled[2]));
      out.push(`For ${list(unsure.map((r) => lcArea(r.name)))}, the estimates are too uncertain to call: they are consistent with no gap and with gaps of up to ${f0(hi)} points.`);
    }
    if (low.length) out.push(`${cap(list(low.map((r) => lcArea(r.name))))} ${low.length > 1 ? 'have' : 'has'} too few schools below Expected standard for the model to be read.`);
    if (ph === 'Primary') out.push('There is no public school-level measure of primary pupils’ prior attainment, mobility or results, so this is not a comparison of schools with the same intake or the same results.');
    return out.join(' ');
  }

  function drawHeld(box, ph) {
    box.replaceChildren();
    const rows = J.held[ph], W = width(box), narrow = W < 600;
    const L = narrow ? 8 : 250, R = 16, T = 30, B = 46, RH = narrow ? 72 : 48, maxc = Math.floor((W - 8) / 7.6);
    const H = T + rows.length * RH + B;
    const vals = rows.flatMap((r) => [r.raw, r.controlled].filter(Boolean).flatMap((c) => [c[1], c[2]]));
    const lo = Math.min(-10, Math.floor(Math.min(...vals) / 10) * 10), hi = Math.max(30, Math.ceil(Math.max(...vals) / 10) * 10);
    const x = (v) => L + (v - lo) / (hi - lo) * (W - L - R);
    const svg = sv('svg', {viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', class: 'gc-svg',
      'aria-label': `${ph} schools: percentage-point gap between the most and least deprived fifths in the chance of a below Expected grade, by area, alone and with other context held constant`}, box);
    for (let t = lo; t <= hi; t += 10) {
      sv('line', {x1: x(t), x2: x(t), y1: T - 6, y2: H - B + 4, stroke: t === 0 ? AXIS : GRID, 'stroke-width': t === 0 ? 1.5 : 1}, svg);
      txt(svg, x(t), H - B + 20, (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t), 'gc-ax', {'text-anchor': 'middle'});
    }
    const th = J.threshold_pp;
    sv('line', {x1: x(th), x2: x(th), y1: T - 6, y2: H - B + 4, stroke: BRASS, 'stroke-width': 1, 'stroke-dasharray': '3 3'}, svg);
    txt(svg, x(th) + 4, T - 12, `${f0(th)}-point threshold`, 'gc-ax gc-small');
    txt(svg, (L + W - R) / 2, H - 8, 'Percentage points, most vs least deprived fifth', 'gc-ax gc-t', {'text-anchor': 'middle'});
    rows.forEach((r, i) => {
      const top = T + i * RH, y0 = narrow ? top + 52 : top + RH / 2;
      if (narrow) {
        const fits = r.name.length + READ[r.reading].length + 3 <= maxc;
        const lab = txt(svg, L, top + 16, '', 'gc-lab');
        const a = sv('tspan', {class: 'gc-name'}, lab); a.textContent = r.name;
        if (fits) { const b = sv('tspan', {class: 'gc-read', dx: 8}, lab); b.textContent = READ[r.reading]; }
        else txt(svg, L, top + 32, READ[r.reading], 'gc-read');
      } else {
        const lab = txt(svg, 0, y0 - 3, '', 'gc-lab'); const a = sv('tspan', {class: 'gc-name'}, lab); a.textContent = r.name;
        txt(svg, 0, y0 + 14, READ[r.reading], 'gc-read');
      }
      if (i) sv('line', {x1: narrow ? L : 0, x2: W - R, y1: top, y2: top, stroke: GRID}, svg);
      const mark = (c, dy, colour, filled, name, n) => {
        if (!c) return;
        const g = sv('g', {}, svg);
        sv('line', {x1: x(c[1]), x2: x(c[2]), y1: y0 + dy, y2: y0 + dy, stroke: colour, 'stroke-width': filled ? 2.5 : 1.75, 'stroke-linecap': 'round'}, g);
        sv('circle', {cx: x(c[0]), cy: y0 + dy, r: filled ? 5.5 : 4.5, fill: filled ? colour : '#FFFFFF', stroke: colour, 'stroke-width': 1.75}, g);
        tip(g, `${r.name}, ${name}: ${ciTxt(c)}, ${cnt(n)} schools`);
      };
      mark(r.raw, -7, VERD, false, 'deprivation alone', r.n_raw);
      const low = r.reading === 'low_events' || r.reading === 'not_fitted';
      mark(r.controlled, 7, low ? SOFT : INK, true, 'other context held constant' + (low ? ' (too few schools to read)' : ''), r.n);
    });
    OE.xd['gc-held'] = {ph, rows, svg, W, H};
  }

  function heldTable() {
    const d = OE.xd['gc-held']; if (!d) return null; const sec = d.ph === 'Secondary';
    const c = (v) => (v ? `${pp(v[0])} (${pp(v[1])} to ${pp(v[2])})` : '');
    const cols = ['Area', 'Schools', 'Below Expected', 'Deprivation alone'].concat(sec ? ['Results held constant'] : []).concat(['Context held constant', 'Reading']);
    return {caption: `${d.ph} schools: percentage-point gap, most vs least deprived IDACI fifth`, cols, num: cols.map((x, i) => i > 0 && i < cols.length - 1),
      rows: d.rows.map((r) => ({cells: [r.name, cnt(r.n_raw), cnt(r.below), c(r.raw)].concat(sec ? [c(r.results_only)] : []).concat([c(r.controlled), READ[r.reading]])})),
      csvCols: ['phase', 'area', 'schools', 'schools_in_controlled_model', 'below_expected', 'raw_pp', 'raw_lo', 'raw_hi', 'results_only_pp', 'results_only_lo', 'results_only_hi', 'controlled_pp', 'controlled_lo', 'controlled_hi', 'model', 'reading', 'holm_p'],
      csv: d.rows.map((r) => [d.ph, r.name, r.n_raw, r.n, r.below, ...(r.raw || ['', '', '']), ...(r.results_only || ['', '', '']), ...(r.controlled || ['', '', '']), r.model, READ[r.reading], r.p_holm ?? '']),
      note: 'Gap: average change in the chance of a below Expected grade (Needs attention or Urgent improvement) from the least to the most deprived IDACI fifth, in percentage points, with 95% confidence intervals.'};
  }

  // ---------- 2. Who has been inspected so far ----------
  function inspLead(ph) {
    const d = J.inspected[ph], g = (k) => d.rows.find((r) => r.key === k);
    const q5 = g('idaci5'), ri = g('oqe3');
    const out = [`So far **${cnt(d.inspected)}** of ${cnt(d.all)} ${PLURAL[ph]} (${f0(100 * d.inspected / d.all)}%) have a report card.`];
    const parts = [];
    if (q5 && q5.inspected !== null) parts.push(`${f1(q5.inspected)}% are in the most deprived IDACI fifth (${f1(q5.all)}% of all ${PLURAL[ph]})`);
    if (ri && ri.inspected !== null) parts.push(`${f1(ri.inspected)}% were last judged Requires improvement for quality of education (${f1(ri.all)}%)`);
    if (parts.length) out.push(`Of those inspected, ${parts.join(', and ')}.`);
    const sh = J.weight_shift_max[ph];
    out.push(`Re-weighting the models to match all ${PLURAL[ph]} moves none of the readable estimates above by more than ${f1(sh)} points, so the mix of schools inspected so far ${sh < J.threshold_pp ? 'does not appear to explain' : 'may partly explain'} the pattern.`);
    return out.join(' ');
  }

  function drawInsp(box, ph) {
    box.replaceChildren();
    const rows = J.inspected[ph].rows.filter((r) => r.unit === '%' && r.inspected !== null && r.all !== null);
    const W = width(box), narrow = W < 600, L = narrow ? 8 : 330, R = 44, T = 14, B = 40, RH = narrow ? 60 : 34, maxc = Math.floor((W - 8) / 7.6);
    // phones: each row is its label (one or two lines) and then the dots, laid out top to bottom
    const lab = rows.map((r) => (narrow ? lines(r.label, maxc).slice(0, 2) : [r.label]));
    const tops = []; let acc = T; rows.forEach((r, i) => { tops.push(acc); acc += narrow ? 16 * lab[i].length + 34 : RH; });
    const H = acc + B;
    const hi = Math.min(100, Math.max(30, Math.ceil(Math.max(...rows.flatMap((r) => [r.all, r.inspected])) / 10) * 10));
    const x = (v) => L + v / hi * (W - L - R);
    const svg = sv('svg', {viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', class: 'gc-svg', 'aria-label': `${ph} schools inspected so far against all ${PLURAL[ph]}, by context`}, box);
    for (let t = 0; t <= hi; t += 10) {
      sv('line', {x1: x(t), x2: x(t), y1: T - 4, y2: H - B + 4, stroke: t === 0 ? AXIS : GRID}, svg);
      if (t % 20 === 0 || hi <= 40) txt(svg, x(t), H - B + 20, t + '%', 'gc-ax', {'text-anchor': 'middle'});
    }
    rows.forEach((r, i) => {
      const top = tops[i], y0 = narrow ? top + 16 * lab[i].length + 14 : top + RH / 2;
      if (narrow) lab[i].forEach((l, k) => txt(svg, L, top + 12 + 16 * k, l, 'gc-lab gc-name'));
      else txt(svg, 0, y0 + 4, r.label, 'gc-lab gc-name');
      const g = sv('g', {}, svg);
      sv('line', {x1: x(r.all), x2: x(r.inspected), y1: y0, y2: y0, stroke: AXIS, 'stroke-width': 3}, g);
      sv('circle', {cx: x(r.all), cy: y0, r: 5, fill: '#FFFFFF', stroke: VERD, 'stroke-width': 2}, g);
      sv('circle', {cx: x(r.inspected), cy: y0, r: 5.5, fill: INK}, g);
      const right = r.inspected >= r.all || x(r.inspected) - 52 < L;
      txt(svg, (right ? Math.max(x(r.inspected), x(r.all)) + 10 : x(r.inspected) - 10), y0 + 4, f1(r.inspected) + '%', 'gc-val', {'text-anchor': right ? 'start' : 'end'});
      tip(g, `${r.label}: ${f1(r.inspected)}% of inspected ${PLURAL[ph]}, ${f1(r.all)}% of all ${PLURAL[ph]}`);
    });
    OE.xd['gc-insp'] = {ph, rows: J.inspected[ph].rows, svg, W, H};
  }

  function inspTable() {
    const d = OE.xd['gc-insp']; if (!d) return null;
    const v = (r, k) => (r[k] === null ? 'fewer than 10 schools' : r.unit === '%' ? f1(r[k]) + '%' : cnt(r[k]));
    return {caption: `${d.ph} schools inspected so far against all ${PLURAL[d.ph]}`, cols: ['Context', `All ${PLURAL[d.ph]}`, 'Inspected so far'], num: [false, true, true],
      rows: d.rows.map((r) => ({cells: [r.label, v(r, 'all'), v(r, 'inspected')]})),
      csvCols: ['phase', 'context', 'unit', 'all_schools', 'inspected'], csv: d.rows.map((r) => [d.ph, r.label, r.unit, r.all, r.inspected === null ? '' : r.inspected]),
      note: `All ${PLURAL[d.ph]}: ${cnt(J.inspected[d.ph].all)}; inspected: ${cnt(J.inspected[d.ph].inspected)}. Categories with fewer than 10 inspected schools are not shown.`};
  }

  // ---------- 3. Is the pattern settling? ----------
  function settleLead(ph) {
    const s = J.settling[ph].g_ach || []; const pts = s.filter((p) => p.e !== null);
    if (!pts.length) return 'There are not yet enough report cards to estimate the achievement gap month by month.';
    const lo = Math.min(...pts.map((p) => p.e)), hi = Math.max(...pts.map((p) => p.e));
    if (pts.length === 1) return `There have been enough report cards to estimate the achievement gap with context held constant only since the end of ${monthGB(pts[0].to)}, when it was ${pp(pts[0].e)} points.`;
    return `With context held constant, the achievement gap has stayed between ${pp(lo)} and ${pp(hi)} points since the end of ${monthGB(pts[0].to)}, when there were first enough ${PLURAL[ph]} with report cards to estimate it.`;
  }

  function drawSettle(box, ph) {
    box.replaceChildren();
    const S = J.settling[ph], rows = J.held[ph], W = width(box);
    const cols = W >= 900 ? 3 : W >= 560 ? 2 : 1, gap = 26, PW = (W - gap * (cols - 1)) / cols, PH = 170, TT = 26, BB = 28, LL = 34;
    const nrow = Math.ceil(rows.length / cols), H = nrow * (PH + 18);
    const all = Object.values(S).flat().filter((p) => p.e !== null);
    const ylo = Math.min(-10, Math.floor(Math.min(...all.map((p) => p.lo)) / 10) * 10), yhi = Math.max(20, Math.ceil(Math.max(...all.map((p) => p.hi)) / 10) * 10);
    const months = (S.g_ach || Object.values(S)[0]).map((p) => p.to);
    const svg = sv('svg', {viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', class: 'gc-svg', 'aria-label': `${ph} schools: deprivation gap with context held constant, re-estimated at the end of each month`}, box);
    rows.forEach((r, i) => {
      const ox = (i % cols) * (PW + gap), oy = Math.floor(i / cols) * (PH + 18);
      const g = sv('g', {transform: `translate(${ox},${oy})`}, svg);
      txt(g, 0, 16, r.name, 'gc-lab gc-name');
      const x = (k) => LL + 8 + k * (PW - LL - 30) / Math.max(1, months.length - 1);
      const y = (v) => TT + (yhi - v) / (yhi - ylo) * (PH - TT - BB);
      [ylo, 0, yhi].forEach((t) => { sv('line', {x1: LL, x2: PW - 4, y1: y(t), y2: y(t), stroke: t === 0 ? AXIS : GRID}, g); txt(g, LL - 5, y(t) + 4, (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t), 'gc-ax', {'text-anchor': 'end'}); });
      months.forEach((m, k) => { if (cols > 1 || k % 3 === 0 || k === months.length - 1) txt(g, x(k), PH - BB + 16, MONTHS[+m.slice(5, 7) - 1].slice(0, 3), 'gc-ax gc-small', {'text-anchor': 'middle'}); });
      const pts = (S[r.area] || []).map((p, k) => ({...p, k})).filter((p) => p.e !== null);
      if (!pts.length) { txt(g, LL + 8, y(0) - 10, 'Too few schools in every month so far', 'gc-ax gc-small'); return; }
      // contiguous runs only: a month below the threshold breaks the band
      const runs = []; pts.forEach((p) => { const last = runs[runs.length - 1]; if (last && p.k === last[last.length - 1].k + 1) last.push(p); else runs.push([p]); });
      runs.forEach((run) => {
        if (run.length > 1) {
          sv('path', {d: 'M' + run.map((p) => `${x(p.k)},${y(p.hi)}`).join('L') + 'L' + run.slice().reverse().map((p) => `${x(p.k)},${y(p.lo)}`).join('L') + 'Z', fill: VERD, 'fill-opacity': 0.16}, g);
          sv('path', {d: 'M' + run.map((p) => `${x(p.k)},${y(p.e)}`).join('L'), fill: 'none', stroke: INK, 'stroke-width': 2}, g);
        } else sv('line', {x1: x(run[0].k), x2: x(run[0].k), y1: y(run[0].lo), y2: y(run[0].hi), stroke: VERD, 'stroke-opacity': 0.5, 'stroke-width': 6}, g);
      });
      pts.forEach((p) => { const c = sv('circle', {cx: x(p.k), cy: y(p.e), r: 3.5, fill: INK}, g); tip(c, `${r.name}, published by ${dateGB(p.to)}: ${ciTxt([p.e, p.lo, p.hi])}, ${cnt(p.n)} schools`); });
      const last = pts[pts.length - 1];
      txt(g, Math.min(x(last.k) + 6, PW - 2), y(last.e) - 8, pp(last.e), 'gc-val', {'text-anchor': x(last.k) + 40 > PW ? 'end' : 'start'});
    });
    OE.xd['gc-settle'] = {ph, S, rows, svg, W, H};
  }

  function settleTable() {
    const d = OE.xd['gc-settle']; if (!d) return null;
    const out = []; d.rows.forEach((r) => (d.S[r.area] || []).forEach((p) => { if (p.e !== null) out.push([r.name, dateGB(p.to), p.e, p.lo, p.hi, p.n]); }));
    return {caption: `${d.ph} schools: gap with context held constant, by month of publication`, cols: ['Area', 'Published by', 'Gap (points)', '95% CI', 'Schools'], num: [false, false, true, true, true],
      rows: out.map((o) => ({cells: [o[0], o[1], pp(o[2]), `${pp(o[3])} to ${pp(o[4])}`, cnt(o[5])]})),
      csvCols: ['phase', 'area', 'published_by', 'controlled_pp', 'lo', 'hi', 'schools'], csv: out.map((o) => [d.ph].concat(o)),
      note: 'Months with too few schools below Expected standard for the model are left out.'};
  }

  // ---------- method ----------
  function method() {
    const m = document.getElementById('gc-method-live'); if (!m) return;
    const w = J.weights, sa = J.held.Secondary.find((r) => r.area === 'g_ach');
    const ws = (ph) => { const vs = Object.values(w[ph]), base = vs[0].includes;
      return vs.map((v, k) => (k === 0 ? `on ${list(base)}` : `the same plus ${list(v.includes.filter((t) => !base.includes(t)))}`) + ` (AUC ${v.auc.toFixed(2)}, weights ${v.range[0].toFixed(2)} to ${v.range[1].toFixed(2)})`).join('; '); };
    const top = J.exploratory.strong_or_above.Secondary;
    const ups = J.held.Secondary.filter((r) => top[r.area] && top[r.area].controlled && top[r.area].controlled[1] > 0).map((r) => `${lcArea(r.name)} (${pp(top[r.area].controlled[0])}, 95% CI ${pp(top[r.area].controlled[1])} to ${pp(top[r.area].controlled[2])})`);
    const items = [
      `**Weights.** Each model was re-run with inverse-probability-of-inspection weights from a logistic model of being inspected so far. Primary: ${ws('Primary')}. Secondary: ${ws('Secondary')}. The largest change to a readable estimate was ${f1(J.weight_shift_max.Primary)} points for primaries and ${f1(J.weight_shift_max.Secondary)} for secondaries.`,
      sa && sa.ordinal ? `**An ordinal check.** Modelling all five grades at once gives a smaller secondary achievement gap, ${ciTxt(sa.ordinal)}, because that model assumes deprivation shifts grades evenly along the whole scale. In secondaries it does not: the gap sits at the line between Expected standard and Needs attention. The plan set the below Expected measure as the main one before any results were seen.` : '',
      ups.length ? `**Exploratory, not pre-registered.** Among secondaries with similar prior attainment and results, those in the most deprived fifth were, if anything, more often graded Strong standard or above for ${list(ups)}. This was found after the main results were seen. It needs testing on new report cards before it is relied on, and it is not a headline.` : ''];
    items.filter(Boolean).forEach((s) => m.append(rich(el('li'), s)));
    const as = document.getElementById('gc-asat');
    if (as) as.textContent = `Ofsted management information as at ${dateGB(J.as_at)} (${cnt(J.report_cards)} report cards across all phases).`;
  }

  // ---------- wiring ----------
  const SECTIONS = [
    {id: 'held', box: 'gc-held', lead: 'gc-held-lead', draw: drawHeld, text: heldLead, name: 'deprivation-gap-held-constant', table: heldTable,
      title: () => `Report card areas: deprivation gap alone and with context held constant, ${lc(phase)} schools`,
      key: () => 'Open circle: deprivation alone. Filled circle: other context held constant (grey where too few schools to read). Lines: 95% confidence intervals.', gaps: true},
    {id: 'inspected', box: 'gc-insp', lead: 'gc-insp-lead', draw: drawInsp, text: inspLead, name: 'who-has-been-inspected', table: inspTable,
      title: () => `${phase} schools inspected so far against all ${PLURAL[phase]}`,
      key: () => `Open circle: all ${PLURAL[phase]}. Filled circle and figure: inspected so far.`, gaps: false},
    {id: 'settling', box: 'gc-settle', lead: 'gc-settle-lead', draw: drawSettle, text: settleLead, name: 'is-the-pattern-settling', table: settleTable,
      title: () => `Deprivation gap with context held constant, by month of publication, ${lc(phase)} schools`,
      key: () => 'Line: the gap on report cards published by the end of each month. Band: 95% confidence interval. Months with too few schools are not drawn.', gaps: true}];
  const source = (gaps) => {
    const s = J.sources;
    return `Ofsted, management information on state-funded school inspections, latest inspections as at ${dateGB(J.as_at)}; DfE, ${s.sen && s.sen.title ? s.sen.title.replace('Special educational needs in England: School level data', 'Special educational needs in England, school level data') : 'Special educational needs in England'}` +
      (phase === 'Secondary' ? '; DfE key stage 4 performance 2024/25 and the Explorer’s open replica of the similar-schools model' : '') +
      (gaps ? `. Analysis pre-registered on ${dateGB(J.plan.committed.slice(0, 10))}; gaps compare the most and least deprived IDACI fifths, with 95% confidence intervals.` : '. Open state-funded schools; categories with fewer than 10 inspected schools are not shown.');
  };

  function drawAll() {
    SECTIONS.forEach((s) => {
      const box = document.getElementById(s.box), lead = document.getElementById(s.lead);
      if (!box) return;
      s.draw(box, phase);
      if (lead) { lead.replaceChildren(); rich(lead, s.text(phase)); }
    });
    document.querySelectorAll('.gc-phase button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.phase === phase.toLowerCase())));
    const o = document.getElementById('gc-others');
    if (o) { const c = J.counts; o.textContent = `Special schools (${cnt(c.Special.inspected)} with a report card), alternative provision (${cnt(c['Alternative provision'].inspected)}) and nursery schools (${cnt(c.Nursery.inspected)}) are too few to model, so they are described in the results file, not here.`; }
  }

  function init(j) {
    J = j;
    document.documentElement.classList.add('gc-ready');
    drawAll();
    method();
    SECTIONS.forEach((s) => OE.exhibit && OE.exhibit({name: s.name, noSchool: true, host: document.getElementById(s.box), title: s.title, key: s.key, source: () => source(s.gaps),
      table: s.table, svg: () => { const d = OE.xd[{held: 'gc-held', inspected: 'gc-insp', settling: 'gc-settle'}[s.id]]; return d ? {node: d.svg, w: d.W, h: d.H, live: true} : null; }}));
    document.querySelectorAll('.gc-phase button').forEach((b) => b.addEventListener('click', () => {
      phase = b.dataset.phase === 'secondary' ? 'Secondary' : 'Primary'; setHash('phase', b.dataset.phase);
      const sec = b.closest('section'); if (sec) setHash('sec', sec.id);
      drawAll();
    }));
    const h = hash(); if (['held', 'inspected', 'settling'].includes(h.sec)) { const t = document.getElementById(h.sec); if (t) t.scrollIntoView(); }
  }

  fetch('/explorer/data/grades_context.json', {cache: 'no-cache'}).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init)
    .catch((e) => { document.querySelectorAll('.gc-lead').forEach((p) => { p.textContent = 'The model results could not be loaded. Please refresh the page.'; }); console.error(e); });
})();
