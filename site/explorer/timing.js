/* Inspection timing (24 November 2026): where the school stands under Ofsted's published policy on when full
   inspections fall. A reading of published rules, never a forecast: Ofsted does not publish its schedule and can
   inspect at any time. The rules are computed at build time (scripts/inspection_timing.py, quoted and sourced in
   docs/inspection-timing-rules.md); this file only words and draws one school's record, fetched from
   data/it/<urn % 128>.json (under 5 KB).

   Drawn once, still: no motion. Colours come from the Explorer's reading scale, never Ofsted's grade colours, and
   every mark is labelled in words, so colour never carries meaning on its own. The sentence is the figure's text
   alternative. */
(() => {
  const OE = window.OE; if (!OE) return;
  const NS = 'http://www.w3.org/2000/svg';
  const SHARDS = 128;
  const shards = new Map();
  const S = () => { const s = dash.data('school'); return s.status === 'ok' && s.data && s.data[0] ? s.data[0] : null; };
  const load = (urn) => { const k = (+urn) % SHARDS; if (!shards.has(k)) shards.set(k, fetch('/explorer/data/it/' + k + '.json').then((r) => (r.ok ? r.json() : null)).catch(() => null)); return shards.get(k); };
  const got = new Map(); // urn -> {rec, head} once loaded

  // ---------- dates, written as a reader would say them ----------
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const pd = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const long = (s) => { const d = pd(s); return d ? d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear() : ''; };
  const month = (s) => { const d = pd(s); return d ? MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear() : ''; };
  const short = (s) => { const d = pd(s); return d ? MON[d.getUTCMonth()].slice(0, 3) + ' ' + d.getUTCFullYear() : ''; };
  // school terms: autumn (September to December), spring (January to March), summer (April to July);
  // August, a holiday, reads as the autumn term that follows
  const term = (s) => { const d = pd(s); if (!d) return ''; const m = d.getUTCMonth(), y = d.getUTCFullYear();
    return m >= 8 ? 'autumn term of ' + y : m === 7 ? 'autumn term of ' + y : m <= 2 ? 'spring term of ' + y : 'summer term of ' + y; };
  const today = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
  const iso = (d) => d.toISOString().slice(0, 10);

  const RULE = {STD4: 'Most schools: about every four years', RI25: 'Earlier full inspection: about two and a half years', MON_NA: 'Monitoring: an area graded needs attention',
    MON_COC: 'Monitoring: a category of concern', MON_LEG: 'Monitoring: a category of concern from before November 2025', NEW: 'New school, not yet inspected',
    CLOSING: 'Proposed to close within six months', UNCONF: 'Rule not confirmed'};
  const WHY = {RI_OE: 'the school was judged requires improvement overall at its last graded inspection',
    RI_KJ: 'its last graded inspection, after September 2024, judged at least one key area requires improvement',
    UNG_CONCERN: 'its last ungraded inspection, before September 2024, could not confirm the school would keep its grade',
    UNG_SLIP: 'its last ungraded inspection, after September 2024, found some aspects not as strong as before'};
  const COC = {SM: 'special measures', RSI: 'requires significant improvement', SWK: 'serious weaknesses', COC: 'a category of concern'};
  const PROG = {SM: [6, 24], RSI: [5, 18], SWK: [5, 18]};
  const LASTK = {full: 'full inspection (report card)', graded: 'graded inspection', ungraded: 'ungraded inspection'};
  const NOTE = 'A reading of Ofsted’s published rules, not a forecast. Ofsted does not publish its schedule and can inspect at any time.';

  // the plain sentence that leads the panel; it is also the timeline's text alternative
  const words = (x, now) => {
    const lim = x.s ? 'by law it must happen by ' + long(x.s) : '';
    const past = x.u && pd(x.u) < now;
    switch (x.r) {
      case 'STD4': return 'Ofsted normally inspects schools about every four years. On its published rules, this school’s next full inspection would usually ' + (past ? 'have fallen around the ' + term(x.u) + ', so it is past the usual four-year point' : 'fall around the ' + term(x.u)) + ', and ' + lim + '.';
      case 'RI25': return 'Because ' + (WHY[x.w] || 'of its last inspection') + ', Ofsted’s published rules bring the next full inspection forward to about two and a half years after the last report: around the ' + term(x.u) + (past ? ', so it is past the usual point' : '') + '. By law it must happen by ' + long(x.s) + '.';
      case 'MON_NA': return 'With at least one area graded needs attention, the school is in Ofsted’s monitoring programme: normally one monitoring visit by ' + month(x.mb) + ', which is not a full inspection. Its next full inspection would usually fall around the ' + term(x.u) + ', about four years after the report card' + (past ? ' (now past)' : '') + ', and ' + lim + '.';
      case 'MON_COC': case 'MON_LEG': { const p = PROG[x.m];
        return 'The school is in ' + (COC[x.m] || COC.COC) + (x.r === 'MON_LEG' ? ' from an inspection before November 2025' : '') + ', so Ofsted monitors it' + (p ? ' with up to ' + p[0] + ' monitoring inspections, usually one a term, over ' + p[1] + ' months' : ', usually with a monitoring inspection each term') + '. Its next full inspection usually follows in the term after the programme ends, or sooner if a monitoring inspection is treated as a full one. Ofsted does not publish a date' + (x.s ? '; ' + lim : '') + '.'; }
      case 'NEW': { const done = x.b && pd(x.b) < now;
        return 'This is a new school for inspection purposes: it opened under its current URN on ' + long(x.a) + '. Ofsted usually inspects a new school in its third year of operation, which for this school ' + (done ? 'ended in ' + month(x.b) + ', so it is past the usual point' : 'runs from ' + month(x.e) + ' to ' + month(x.b)) + '. The law sets no fixed date for a new school’s first full inspection.'; }
      case 'CLOSING': return 'This school is proposed to close on ' + long(x.c) + '. Ofsted does not normally inspect a school this close to a confirmed closure, so no timing is shown.';
      default: return 'Ofsted’s published rules do not settle this school’s position, so only the legal limit is shown (rule not confirmed). ' + (x.s ? 'By law its next full inspection must happen by ' + long(x.s) + '.' : 'No legal limit can be worked out from the published data.');
    }
  };

  // one empirical line, where the backtest has at least 100 schools on the same rule
  const empKey = (x) => (x.r === 'STD4' ? 'STD4' : x.r === 'RI25' ? 'RI25.' + x.w : x.r === 'NEW' && x.pu ? 'NEW' : null);
  const empLine = (x, head) => { const k = empKey(x), e = k && head.emp && head.emp[k]; if (!e) return '';
    const from = x.r === 'NEW' ? 'after opening' : 'after their previous report was published';
    return 'Of ' + d3.format(',')(e.n) + ' schools in the same position inspected between ' + month(e.f) + ' and ' + month(e.t) + ', half were inspected between ' + e.q1.toFixed(1) + ' and ' + e.q3.toFixed(1) + ' years ' + from + '. That describes what happened, not what will.'; };

  // ---------- the timeline ----------
  const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (text !== undefined) e.textContent = text; return e; };
  const drawLine = (host, x, now, sid) => {
    host.replaceChildren();
    const start = x.r === 'NEW' ? x.a : (x.l || x.a);
    const endD = [x.s, x.b, x.mb].filter(Boolean).map(pd).concat([now]);
    // no timeline: leave a marker so the table view and CSV still appear (exhibit.js watches the figure's children)
    if (!start || x.r === 'CLOSING') { host.append(document.createComment('no timeline')); host.hidden = true; return null; }
    host.hidden = false;
    const t0 = pd(start), t1 = new Date(Math.max(...endD.map(Number)));
    const W = Math.max(300, Math.round(host.clientWidth || host.parentNode.clientWidth || 640)), narrow = W < 520;
    const fs = narrow ? 11.5 : 12.5, pad = narrow ? 6 : 10;
    const span = t1 - t0 || 1, tail = span * 0.04;
    const X = d3.scaleUtc().domain([t0, new Date(+t1 + tail)]).range([pad, W - pad]);
    const above = [], below = [], marks = mk('g'), labels = mk('g');
    // labels in rows so they never overlap: rows fill outward from the line
    const rowsOf = (arr, xx, txt) => { const w = txt.length * fs * 0.55; let x0 = Math.min(Math.max(xx - w / 2, 0), W - w), r = 0;
      while (arr[r] && arr[r].some(([a, b]) => x0 < b + 6 && x0 + w > a - 6)) r++; (arr[r] = arr[r] || []).push([x0, x0 + w]); return {x: x0, r}; };
    const items = [];
    const add = (side, d, lab, cls) => { if (!d) return; const xx = X(pd(d) || d); items.push({side, xx, lab, cls}); };
    const lastLab = x.r === 'NEW' ? 'Opened ' + short(x.a) : 'Last inspected ' + short(start);
    add('up', start, lastLab, 'k');
    add('up', iso(now), 'Today', 'today');
    if (x.mb) add('dn', x.mb, (x.r === 'MON_NA' ? 'Monitoring visit by ' : 'Programme up to ') + short(x.mb), 'mon');
    if (x.u && x.r !== 'NEW') add('dn', x.u, 'Usual point: ' + term(x.u).replace(' of ', ' '), 'usual');
    if (x.r === 'NEW' && x.e) add('dn', x.e, 'Third year ' + short(x.e) + ' to ' + short(x.b), 'usual');
    if (x.s) add('dn', x.s, 'Latest by law ' + short(x.s), 'stat');
    items.forEach((it) => { it.pos = rowsOf(it.side === 'up' ? above : below, it.xx, it.lab); });
    const nUp = Math.max(1, above.length), nDn = Math.max(1, below.length), lh = fs + 6;
    const y0 = 8 + nUp * lh + 6, H = y0 + 14 + nDn * lh + 4;
    const svg = mk('svg', {viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-labelledby': sid, class: 'oe-itsvg'});
    // the soft band for the usual period, then the line itself
    if (x.e && x.b) svg.append(mk('rect', {x: X(pd(x.e)), y: y0 - 7, width: Math.max(2, X(pd(x.b)) - X(pd(x.e))), height: 14, class: 'band'}));
    svg.append(mk('line', {x1: X(t0), x2: X(t1), y1: y0, y2: y0, class: 'base'}));
    items.forEach((it) => { const up = it.side === 'up', ty = up ? y0 - 12 - it.pos.r * lh : y0 + 12 + fs + it.pos.r * lh;
      const g = mk('g', {class: 'm ' + it.cls});
      if (it.cls === 'stat') g.append(mk('rect', {x: it.xx - 2, y: y0 - 10, width: 4, height: 20}));
      else if (it.cls === 'usual' && x.r !== 'NEW') g.append(mk('line', {x1: it.xx, x2: it.xx, y1: y0 - 9, y2: y0 + 9}));
      else if (it.cls === 'today') g.append(mk('line', {x1: it.xx, x2: it.xx, y1: y0 - 11, y2: y0 + 11}));
      else if (it.cls === 'mon') g.append(mk('circle', {cx: it.xx, cy: y0, r: 4.5}));
      else if (it.cls === 'k') g.append(mk('circle', {cx: it.xx, cy: y0, r: 4}));
      // a thin leader from a label in an outer row back to its mark
      if (it.pos.r) g.append(mk('line', {x1: it.xx, x2: it.xx, y1: up ? ty + 3 : y0 + 10, y2: up ? y0 - 10 : ty - fs, class: 'lead'}));
      marks.append(g);
      // labels go in a layer above every line, so their white halo keeps leaders from crossing them
      const lg = mk('g', {class: 'm ' + it.cls}); lg.append(mk('text', {x: it.pos.x, y: ty, style: `font-size:${fs}px`}, it.lab)); labels.append(lg); });
    svg.append(marks, labels);
    host.append(svg);
    return {node: svg, w: W, h: H, live: true};
  };

  // ---------- the panel ----------
  const sid = 'oe-it-s';
  const draw = (el) => {
    const r = S(); const box = el.closest('.oe-it');
    if (!r) { return; }
    const have = got.get(r.urn);
    if (!have) { box.classList.add('loading');
      load(r.urn).then((j) => { got.set(r.urn, j ? {rec: (j.s || {})[r.urn] || null, head: j} : {rec: null, head: {}}); dash.draw('timing'); }); return; }
    box.classList.remove('loading');
    const x = have.rec; const sEl = box.querySelector('.oe-it-s'), more = box.querySelector('.oe-it-more'), fig = box.querySelector('.oe-it-fig');
    if (!x) { box.hidden = true; OE.xd.timing = null; return; }
    box.hidden = false;
    const now = today();
    sEl.textContent = words(x, now);
    more.replaceChildren();
    const p = (t, c) => { const e = document.createElement('p'); e.textContent = t; if (c) e.className = c; more.append(e); };
    if (x.r === 'NEW' && x.pu) p('Before it became a new school, its predecessor (URN ' + x.pu + ') was last inspected on ' + long(x.pd) + '. That inspection belongs to the predecessor and does not start this school’s clock.');
    else if (x.r === 'NEW') p('The school has not been inspected yet.');
    const emp = empLine(x, have.head); if (emp) p(emp);
    p(NOTE, 'oe-it-note');
    OE.xd.timing = {x, head: have.head, now};
    OE.xd.timingFig = drawLine(fig, x, now, sid);
    // no timeline (a school proposed to close): the table and CSV stay, the image downloads go
    box.querySelectorAll('.oe-xdl button').forEach((b) => { if (b.textContent === 'PNG' || b.textContent === 'SVG') b.hidden = !OE.xd.timingFig; });
  };
  dash.draw('timing', (el) => { try { draw(el); } catch (e) { console.error('timing', e); } });

  // ---------- table view and downloads (exhibit.js) ----------
  const rows = () => { const t = OE.xd.timing; if (!t) return null; const x = t.x, h = t.head;
    const R = [
      ['Rule applied', (RULE[x.r] || x.r) + (x.w && WHY[x.w] ? ' (' + WHY[x.w] + ')' : ''), x.r + (x.w ? '.' + x.w : '')],
      [x.r === 'NEW' ? 'Opened' : 'Last full or ungraded inspection began', x.r === 'NEW' ? long(x.a) : (x.l ? long(x.l) + (x.lk ? ' (' + LASTK[x.lk] + ')' : '') : ''), x.r === 'NEW' ? x.a : x.l],
      ['Clock starts', x.a ? long(x.a) + (x.r === 'NEW' ? ' (opened)' : x.lk === 'full' ? ' (report card published)' : ' (report published)') : 'No clock', x.a],
      ['Earliest likely', x.e ? month(x.e) : '', x.e],
      ['Usual point', x.r === 'NEW' ? 'Within the third year of operation (no single point)' : x.u ? 'the ' + term(x.u) + ' (' + month(x.u) + ')' : 'None published', x.r === 'NEW' ? '' : x.u],
      ['End of the usual period', x.b ? month(x.b) : '', x.b],
      ['Latest date by law', x.s ? long(x.s) : (x.r === 'NEW' ? 'None set for a new school’s first inspection' : 'Not worked out'), x.s],
      ['Monitoring', x.m ? (x.m === 'NA' ? 'Needs attention: one monitoring visit, normally by ' + month(x.mb) : (COC[x.m] || COC.COC) + (x.mb ? ', programme up to ' + month(x.mb) : '')) : 'No', x.m || ''],
      ['New school', x.n ? 'Yes' : 'No', x.n ? 'yes' : 'no'],
      ['Predecessor URN', x.pu || '', x.pu || ''],
      ['Predecessor’s last inspection', x.pd ? long(x.pd) : '', x.pd || ''],
      ['Proposed closure', x.c ? long(x.c) : '', x.c || ''],
      ['As at', long(h.asat) + (h.mi ? '; Ofsted MI to ' + long(h.mi) : ''), h.asat]];
    return R; };
  const SRC = () => { const t = OE.xd.timing, mi = t && t.head.mi ? long(t.head.mi) : 'the latest release';
    return 'Ofsted, Inspection information for state-funded schools (September 2026) and School monitoring operating guide (September 2026); the Education (School Inspection) (England) Regulations 2005, as amended; Ofsted MI to ' + mi + ', with report cards read since; GIAS. Rules, not a forecast.'; };
  const host = document.querySelector('#oe-it .oe-it-fig');
  if (OE.exhibit && host) OE.exhibit({name: 'inspection-timing', host, hideAlso: [],
    title: () => 'Inspection timing: Ofsted’s published rules, not a forecast',
    key: () => { const t = OE.xd.timing; return t ? words(t.x, t.now) : ''; },
    source: SRC,
    svg: () => { const t = OE.xd.timing; if (!t) return null; return drawLine(host, t.x, t.now, sid); },
    table: () => { const R = rows(); if (!R) return null; return {caption: 'Inspection timing for this school under Ofsted’s published rules', cols: ['', 'This school'], num: [0, 0],
      rows: R.filter(([, v]) => v).map(([k, v]) => ({cells: [k, v]})),
      csvCols: ['item', 'value', 'raw'], csv: R.map(([k, v, raw]) => [k, v, raw || ''])}; }});
})();
