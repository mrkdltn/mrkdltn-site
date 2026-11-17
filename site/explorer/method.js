/* How the comparisons are built (17 November 2026).
   1. Official IDSR list beside the open replica: overlap, results and intake.
   2. Method figures: what each matching factor counts for, how this school's 50 are chosen from every secondary,
      and how the contextual model builds this school's expected result factor by factor.
   Everything is computed from the same data the Explorer shows; model.json carries the standardising means and
   standard deviations, the published weights and the two contextual models' coefficients (build_data.write_model). */
(function () {
  const OE = window.OE, {f1, fs} = OE;
  const ok = (v) => !(v === null || v === undefined || v === '' || isNaN(+v));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const rich = (parent, text) => { String(text).split('**').forEach((t, i) => { if (!t) return; parent.append(i % 2 ? el('b', '', t) : t); }); return parent; };
  const S = () => { const s = dash.data('school'); return s.status === 'ok' && s.data && s.data[0] ? s.data[0] : null; };
  const K = () => { const k = dash.data('ks4'); return k.status === 'ok' ? k.data : null; };
  const pc = (v) => f1(v) + '%';
  const FAC = {
    pa_index: {lab: 'Prior attainment', sub: 'KS2 profile of the GCSE year group', fmt: fs},
    dis_pct: {lab: 'Disadvantaged pupils', sub: 'share of the GCSE year group', fmt: pc},
    polar4: {lab: 'Higher education in pupils’ areas', sub: 'POLAR4: not public, so left out', fmt: null},
    sensup_pct: {lab: 'SEN support', sub: 'share of pupils', fmt: pc},
    nonmob_pct: {lab: 'Pupil stability', sub: 'joined at the usual time', fmt: pc},
    idaci_q: {lab: 'Area deprivation', sub: 'IDACI fifth, from pupils’ home postcodes', fmt: (v) => 'fifth ' + Math.round(v)},
    ehc_pct: {lab: 'EHC plans', sub: 'share of pupils', fmt: pc},
    eal_school: {lab: 'English as an additional language', sub: 'share of pupils', fmt: pc},
    nor: {lab: 'Pupil numbers', sub: 'on roll, January 2026', fmt: d3.format(',.0f')}
  };
  const ORDER = ['pa_index', 'dis_pct', 'polar4', 'sensup_pct', 'nonmob_pct', 'idaci_q', 'ehc_pct', 'eal_school', 'nor'];

  // model.json, loaded once; figures drawn before it arrives are drawn again when it does
  let M = null; const pending = new Map();
  const later = (name) => { pending.set(name, () => dash.draw(name)); };
  fetch('/explorer/data/model.json').then((r) => (r.ok ? r.json() : null)).then((m) => { M = m; pending.forEach((f) => f()); pending.clear(); }).catch(() => {});
  const used = () => (M ? ORDER.filter((k) => k !== 'polar4') : []);
  const z = (r, k) => (+r[k] - M.stats[k].mean) / M.stats[k].sd;
  const dist = (a, b) => used().reduce((s, k) => s + M.weights[k] * (z(a, k) - z(b, k)) ** 2, 0);

  const pasted = () => [...new Set(String(dash.params().idsr || '').match(/\d{6}/g) || [])];
  const mv = (r, m) => (ok(r[m]) ? +r[m] : NaN);

  // ---------------------------------------------------------------- 1. official list beside the replica
  const draw1 = (box) => {
    box.replaceChildren(); const r = S(), k = K(); if (!r || !k || r.rc_only) return;
    const by = new Map(k.map((x) => [x.urn, x]));
    const rep = String(r.nn || '').split(' ').filter((u) => by.has(u));
    const ids = pasted().filter((u) => u !== r.urn); const off = ids.filter((u) => by.has(u)); const missing = ids.length - off.length;
    const m = OE.meas(), MM = OE.MEAS[m];
    if (!ids.length) {
      box.append(rich(el('p', 'oe-ofv-empty'), 'Once you paste a list, three pictures appear here: **how many schools the two lists share**, **how their results compare**, and **how closely each list matches this school’s intake**. Until then, the replica’s own match is shown in “How alike are they?” above.'));
      return; }
    const offSet = new Set(off), repSet = new Set(rep); const both = rep.filter((u) => offSet.has(u));

    // overlap
    const f1b = el('div', 'oe-ofv'); f1b.append(el('h3', '', 'How far the two lists overlap'));
    const units = (label, list, n) => { const row = el('div', 'oe-units'); row.append(el('span', 'l', label + ' (' + n + ')'));
      const g = el('span', 'u'); const sh = list.filter((u) => (label.startsWith('Open') ? offSet : repSet).has(u));
      sh.forEach(() => g.append(el('i', 'b'))); list.filter((u) => !sh.includes(u)).forEach(() => g.append(el('i', 'o'))); row.append(g); return row; };
    f1b.append(units('Open replica', rep, rep.length), units('Your official list', off, off.length));
    const key = el('div', 'oe-plegend'); const k1 = el('span'); k1.append(el('i', 'u-b'), 'On both lists'); const k2 = el('span'); k2.append(el('i', 'u-o'), 'On one list only'); key.append(k1, k2); f1b.append(key);
    f1b.append(rich(el('p', 'oe-comp'), '**' + both.length + '** of the replica’s ' + rep.length + ' are on your official list. Your list has **' + (off.length - both.length) + '** the replica does not; the replica has **' + (rep.length - both.length) + '** your list does not.' + (missing ? ' ' + missing + ' pasted URN' + (missing > 1 ? 's' : '') + ' had no 2025/26 results to match and ' + (missing > 1 ? 'are' : 'is') + ' left out.' : '')));
    box.append(f1b);

    // results
    const f2 = el('div', 'oe-ofv'); f2.append(el('h3', '', 'Their results: ' + MM.label + ', 2025/26'));
    const vals = (list) => list.map((u) => by.get(u)).filter((x) => ok(x[m]));
    const A = vals(rep), B = vals(off); const all = A.concat(B).map((x) => +x[m]).concat(ok(r[m]) ? [+r[m]] : []);
    if (A.length && B.length) {
      const lo = Math.floor(d3.min(all) - 1), hi = Math.ceil(d3.max(all) + 1); const X = (v) => 100 * (v - lo) / ((hi - lo) || 1);
      const ma = d3.mean(A, (x) => +x[m]), mb = d3.mean(B, (x) => +x[m]);
      const strip = (label, rows, mean, setOther) => { const row = el('div', 'oe-dstrip'); row.append(el('span', 'l', label));
        const t = el('span', 't'); rows.forEach((x, i) => { const d = el('i', setOther.has(x.urn) ? 'b' : 'o'); d.style.left = X(+x[m]) + '%'; d.style.top = (14 + ((i * 7) % 22)) + 'px'; d.setAttribute('data-tip', x.name + ': ' + OE.mfmt(+x[m], m)); t.append(d); });
        const mk = el('i', 'mn'); mk.style.left = X(mean) + '%'; t.append(mk);
        if (ok(r[m])) { const me = el('i', 'me'); me.style.left = X(+r[m]) + '%'; t.append(me); }
        row.append(t, el('span', 'v', OE.mfmt(mean, m))); return row; };
      f2.append(strip('Open replica', A, ma, offSet), strip('Your official list', B, mb, repSet));
      const ax = el('div', 'oe-dstrip ax'); ax.append(el('span', 'l', '')); const at = el('span', 't'); d3.ticks(lo, hi, 5).forEach((v) => { const s = el('b', '', String(v) + MM.unit); s.style.left = X(v) + '%'; at.append(s); }); ax.append(at, el('span', 'v', 'Average')); f2.append(ax);
      const key2 = el('div', 'oe-plegend'); const a1 = el('span'); a1.append(el('i', 'me'), 'This school ' + OE.mfmt(+r[m], m)); const a2 = el('span'); a2.append(el('i', 'mn'), 'Group average'); const a3 = el('span'); a3.append(el('i', 'd-b'), 'On both lists'); const a4 = el('span'); a4.append(el('i', 'd-o'), 'On one list only'); key2.append(a1, a2, a3, a4); f2.append(key2);
      const d = mb - ma; const g1 = +r[m] - ma, g2 = +r[m] - mb;
      f2.append(rich(el('p', 'oe-comp'), 'The official group averages **' + OE.mfmt(mb, m) + '**, ' + (Math.abs(d) < 0.05 ? 'the same as' : Math.abs(d).toFixed(1) + (MM.unit ? ' points' : '') + ' ' + (d > 0 ? 'above' : 'below')) + ' the replica’s ' + OE.mfmt(ma, m) + '. So this school’s gap is **' + fs(g2) + '** against the official list and ' + fs(g1) + ' against the replica.'));
    }
    box.append(f2);

    // intake
    if (M) {
      const f3 = el('div', 'oe-ofv'); f3.append(el('h3', '', 'How closely each list matches this school’s intake'));
      f3.append(el('p', 'sub', 'Each row is a matching factor. The track runs from the lowest to the highest 2% of secondaries in England. The closer a group’s mark sits to the diamond, the better that list matches this school on that factor.'));
      const leg = el('div', 'oe-plegend'); const l1 = el('span'); l1.append(el('i', 'me'), 'This school'); const l2 = el('span'); l2.append(el('i', 'gm'), 'Replica average'); const l3 = el('span'); l3.append(el('i', 'om'), 'Official average');
      const cols = el('span', 'cols'); cols.append(el('b', '', 'School'), el('b', '', 'Replica'), el('b', '', 'Official')); leg.append(l1, l2, l3, cols); f3.append(leg);
      const rA = rep.map((u) => by.get(u)), rB = off.map((u) => by.get(u));
      let closer = 0, n = 0;
      used().forEach((f) => { const sv = k.map((x) => +x[f]).filter((v) => !isNaN(v)).sort(d3.ascending); const lo0 = d3.quantileSorted(sv, 0.02), hi0 = d3.quantileSorted(sv, 0.98);
        const a = d3.mean(rA, (x) => +x[f]), b = d3.mean(rB, (x) => +x[f]); if (isNaN(a) || isNaN(b) || !ok(r[f])) return;
        const lo = Math.min(lo0, +r[f], a, b), hi = Math.max(hi0, +r[f], a, b); const X = (v) => 100 * (v - lo) / ((hi - lo) || 1);
        const row = el('div', 'oe-prow'); const l = el('div', 'lab'); l.append(el('b', '', FAC[f].lab), el('small', '', 'weight ' + Math.round(100 * M.weights[f]) + '%')); row.append(l);
        const tr = el('div', 'track'); const gm = el('i', 'gm'); gm.style.left = X(a) + '%'; const om = el('i', 'om'); om.style.left = X(b) + '%'; const me = el('i', 'me'); me.style.left = X(+r[f]) + '%'; tr.append(gm, om, me); row.append(tr);
        const vv = el('div', 'vals'); vv.append(el('span', 's', FAC[f].fmt(+r[f])), el('span', 'g', FAC[f].fmt(a)), el('span', 'o', FAC[f].fmt(b))); row.append(vv); f3.append(row);
        n++; if (Math.abs(b - +r[f]) < Math.abs(a - +r[f])) closer++; });
      const dA = d3.mean(rA, (x) => dist(r, x)), dB = d3.mean(rB, (x) => dist(r, x));
      f3.append(rich(el('p', 'oe-comp'), 'Your official list sits closer to this school on **' + closer + ' of ' + n + '** factors. Weighting the factors as the model does, the official list’s average distance from this school is **' + (dB / dA).toFixed(2) + ' times** the replica’s' + (dB > dA * 1.02 ? '. The official model also uses pupil-level data and POLAR4, which the replica cannot see, so your list may match more closely on things not shown here.' : '.')));
      box.append(f3);
    } else later('offviz');
  };
  dash.draw('offviz', draw1);

  // ---------------------------------------------------------------- 2a. what each factor counts for
  const drawW = (box) => {
    box.replaceChildren(); if (!M) { later('mweights'); return; }
    const kept = 1 - M.weights.polar4;
    ORDER.forEach((f) => { const w = M.weights[f]; const row = el('div', 'oe-wrow' + (f === 'polar4' ? ' out' : ''));
      const l = el('div', 'lab'); l.append(el('b', '', FAC[f].lab), el('small', '', FAC[f].sub)); row.append(l);
      const t = el('div', 'bar'); const b = el('i'); b.style.width = (100 * w / 0.46) + '%'; t.append(b); row.append(t);
      row.append(el('div', 'v', Math.round(100 * w) + '%'), el('div', 'v r', f === 'polar4' ? '—' : Math.round(100 * w / kept) + '%'));
      box.append(row); });
    const h = el('div', 'oe-wrow head'); h.append(el('div', 'lab', ''), el('div', 'bar', ''), el('div', 'v', 'Official'), el('div', 'v r', 'Replica')); box.prepend(h);
  };
  dash.draw('mweights', drawW);

  // ---------------------------------------------------------------- 2b. how this school's 50 are chosen
  const drawSel = (box) => {
    box.replaceChildren(); const r = S(), k = K();
    if (!r || !k || r.rc_only || r.phase && r.phase !== 'Secondary') { box.append(el('p', 'oe-ofv-empty', 'Choose a secondary school with 2025/26 results to see its own 50 chosen here.')); return; }
    if (!M) { later('msel'); return; }
    const d = k.filter((x) => x.urn !== r.urn && used().every((f) => ok(x[f]))).map((x) => ({x, d: dist(r, x)})).sort((a, b) => a.d - b.d);
    const N = 150, near = d.slice(0, N), cut = near[49].d, max = near[N - 1].d; const X = (v) => 100 * Math.sqrt(v / max);
    const steps = el('ol', 'oe-steps');
    [['Put every factor on one scale', 'Each is measured in standard deviations from the England average.'], ['Weight them', 'Prior attainment counts most, pupil numbers least.'], ['Measure the distance', 'From this school to each of ' + d3.format(',')(d.length) + ' other secondaries.'], ['Keep the nearest 50', 'Their average result is the comparator.']]
      .forEach(([a, b]) => { const li = el('li'); li.append(el('b', '', a), el('span', '', b)); steps.append(li); });
    box.append(steps);
    const fig = el('div', 'oe-sel'); const t = el('div', 't');
    near.forEach((o, i) => { const dot = el('i', i < 50 ? 'b' : 'o'); dot.style.left = X(o.d) + '%'; dot.style.top = (8 + ((i * 11) % 44)) + 'px'; dot.setAttribute('data-tip', o.x.name + (i < 50 ? ', similar school ' : ', ') + 'number ' + (i + 1) + ' by distance'); t.append(dot); });
    const c = el('i', 'cut'); c.style.left = X((cut + near[50].d) / 2) + '%'; t.append(c);
    const me = el('i', 'me'); me.style.left = '0%'; t.append(me);
    fig.append(t);
    const ax = el('div', 'ax'); const a1 = el('span', '', 'This school'); const a2 = el('span', 'mid', '50th nearest'); a2.style.left = X((cut + near[50].d) / 2) + '%'; const a3 = el('span', 'end', 'Further away →'); ax.append(a1, a2, a3); fig.append(ax);
    box.append(fig);
    const sameReg = near.slice(0, 50).filter((o) => o.x.region === r.region).length;
    box.append(rich(el('p', 'oe-comp'), 'The **50 nearest** (gold) form the group; the next 100 (grey) just missed out. Distance is about intake, not geography: ' + sameReg + ' of the 50 are in the same region as this school. Rebuilt here from public data, these are the same 50 schools listed above.'));
  };
  dash.draw('msel', drawSel);

  // ---------------------------------------------------------------- 3. contextual model, factor by factor
  const sig = (e) => 1 / (1 + Math.exp(-e));
  const drawWf = (box) => {
    box.replaceChildren(); const r = S();
    if (!r || r.rc_only || !ok(r.a8)) { box.append(el('p', 'oe-ofv-empty', 'Choose a secondary school with 2025/26 results to see its expected result built up here.')); return; }
    if (!M) { later('mwf'); return; }
    const m = OE.meas(), MM = OE.MEAS[m], mod = M[m], F = M.factors, b = mod.coef;
    const x = F.map((f) => (ok(r[f]) ? +r[f] : M.stats[f].mean));
    let base, parts, expd;
    if (mod.form === 'linear') {
      base = b[0] + F.reduce((s, f, i) => s + b[i + 1] * M.stats[f].mean, 0);
      parts = F.map((f, i) => ({f, v: b[i + 1] * (x[i] - M.stats[f].mean)}));
      expd = base + parts.reduce((s, p) => s + p.v, 0);
    } else {
      const e0 = b[0] + F.reduce((s, f, i) => s + b[i + 1] * M.stats[f].mean, 0); const de = F.map((f, i) => b[i + 1] * (x[i] - M.stats[f].mean)); const e1 = e0 + de.reduce((a, c) => a + c, 0);
      base = 100 * sig(e0); expd = 100 * sig(e1);
      // each factor's push in percentage points: the average of adding it first and adding it last, then shared so the parts add up exactly
      const raw = de.map((d) => 50 * ((sig(e0 + d) - sig(e0)) + (sig(e1) - sig(e1 - d))));
      const tot = raw.reduce((a, c) => a + c, 0), want = expd - base, absT = raw.reduce((a, c) => a + Math.abs(c), 0) || 1;
      parts = F.map((f, i) => ({f, v: raw[i] + (want - tot) * Math.abs(raw[i]) / absT}));
    }
    parts.sort((p, q) => Math.abs(q.v) - Math.abs(p.v));
    const act = +r[m]; let run = base; const pts = [base, expd, act];
    parts.forEach((p) => { run += p.v; pts.push(run); });
    const lo = Math.floor(d3.min(pts) - 1), hi = Math.ceil(d3.max(pts) + 1); const X = (v) => 100 * (v - lo) / ((hi - lo) || 1);
    const fmtV = (v) => OE.mfmt(v, m), fmtD = (v) => (Math.abs(v) < 0.05 ? '0.0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1));
    const row = (cls, lab, sub, a, bb, val) => { const rw = el('div', 'oe-wf ' + cls); const l = el('div', 'lab'); l.append(el('b', '', lab)); if (sub) l.append(el('small', '', sub)); rw.append(l);
      const t = el('div', 't'); if (cls === 'step') { const bar = el('i', bb >= a ? 'up' : 'dn'); bar.style.left = X(Math.min(a, bb)) + '%'; bar.style.width = Math.max(0.4, Math.abs(X(bb) - X(a))) + '%'; t.append(bar); }
      else { const mk = el('i', cls === 'act' ? 'me' : 'tk'); mk.style.left = X(a) + '%'; t.append(mk); }
      rw.append(t, el('div', 'v', val)); return rw; };
    box.append(row('base', 'A school at the England average on every factor', null, base, null, fmtV(base)));
    run = base;
    parts.forEach((p) => { const st = M.stats[p.f]; const v0 = run; run += p.v; const sv = ok(r[p.f]) ? FAC[p.f].fmt(+r[p.f]) : 'not known, average used';
      box.append(row('step', FAC[p.f].lab, 'this school ' + sv + '; England average ' + (p.f === 'idaci_q' ? 'fifth ' + st.mean.toFixed(1) : FAC[p.f].fmt(st.mean)), v0, run, fmtD(p.v))); });
    box.append(row('exp', 'Expected for this intake', null, expd, null, fmtV(expd)));
    box.append(row('act', 'This school’s result', null, act, null, fmtV(act)));
    const g = act - expd;
    const top = parts.slice(0, 2).map((p) => FAC[p.f].lab.toLowerCase());
    box.append(rich(el('p', 'oe-comp'), 'Starting from a school that is average on everything, each factor moves the expectation up or down. For this school the biggest moves come from **' + top[0] + '** and **' + top[1] + '**. The result is **' + fmtV(expd) + '**; the school achieved ' + fmtV(act) + ', a gap of **' + fs(g) + '**' + (Math.abs(g) < MM.thr ? ', in line with expectation.' : '.') + (mod.form === 'logit' ? ' The model works on the share of pupils, so each factor’s push is converted to percentage points at this school’s position.' : '')));
  };
  dash.draw('mwf', drawWf);
})();
