/* Explorer v2 additions: written commentary, similar-schools profile, map, table tools, printable profile. */
(function () {
  const OE = window.OE, {GC, GORDER, num, f1, fs, P, motion} = OE;
  const ok = (v) => !(v === null || v === undefined || v === '' || isNaN(+v));
  const S = () => { const s = dash.data('school'); return s.status === 'ok' && s.data && s.data[0] ? s.data[0] : null; };
  const N = () => { const n = dash.data('neigh'); return n.status === 'ok' ? n.data : []; };
  const ST = () => { const s = dash.data('stats'); return s.status === 'ok' ? s.data[0] : null; };
  const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const BELOW = new Set(['Needs attention', 'Urgent improvement']);
  const hav = (a, b) => { if (!a || !b || !ok(a.lat) || !ok(b.lat)) return NaN; const R = 3958.8, t = Math.PI / 180; const x = Math.sin((b.lat - a.lat) * t / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin((b.lng - a.lng) * t / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  // text with **bold** runs -> nodes
  const rich = (parent, text) => { String(text).split('**').forEach((t, i) => { if (!t) return; if (i % 2) parent.append(el('b', '', t)); else parent.append(t); }); return parent; };

  const KEYS = ['pa_index', 'dis_pct', 'sensup_pct', 'ehc_pct', 'eal_school', 'nonmob_pct', 'nor', 'a8', 'dis_a8', 'nondis_a8'];
  dash.calc('stats', {inputs: ['ks4'], title: 'National distributions', description: 'Mean and distribution of each context measure across secondaries.',
    fn: (ks4) => { const o = {}; KEYS.forEach((k) => { const v = ks4.map((r) => r[k]).filter(ok).map(Number).sort(d3.ascending); o[k] = {mean: d3.mean(v), sorted: v, lo: d3.quantileSorted(v, 0.02), hi: d3.quantileSorted(v, 0.98)}; });
      const gaps = ks4.filter((r) => ok(r.dis_a8) && ok(r.nondis_a8)).map((r) => r.nondis_a8 - r.dis_a8); o.gap = {mean: d3.mean(gaps)}; return [o]; }});
  const pct = (st, k, v) => 100 * d3.bisectLeft(st[k].sorted, +v) / st[k].sorted.length;
  const level = (p) => p >= 85 ? 'far above average' : p >= 65 ? 'above average' : p > 35 ? 'around average' : p > 15 ? 'below average' : 'far below average';

  // ---------- the data picture (v3 wording, 15 November 2026) ----------
  dash.draw('story', (box) => {
    const r = S(), st = ST(), nb = N(); box.replaceChildren();
    if (r && r.rc_only) { const ph = (OE.PHL && OE.PHL[r.phase]) || 'schools'; const lead = el('div', 'oe-verdict');
      lead.append(el('h3', '', 'The report card, beside comparable schools.'));
      const why = r.phase === 'Secondary' ? 'No 2025/26 GCSE results are published for this school, so this profile shows its report card on its own.' : 'The Explorer reads results for secondary schools only so far, so this profile shows the report card on its own.';
      lead.append(rich(el('p'), why + ' Below, each graded area is set beside other ' + ph + ' in England' + (r.idaci_q ? ' and those whose pupils come from similarly deprived areas' : '') + '.'));
      box.append(lead); return; }
    if (!r || !st || !ok(r.a8)) return;
    const nat = +r.nat_diff, ssd = +r.ss_diff, cva = +r.cva_res, band = String(r.ss_band || '');
    const up = /above/i.test(band), down = /below/i.test(band);
    const natLow = nat <= -2, natHigh = nat >= 2;
    const rel = (v) => Math.abs(v) < 0.05 ? 'level with' : f1(Math.abs(v)) + ' points ' + (v > 0 ? 'above' : 'below');
    const natTxt = rel(nat), ssTxt = rel(ssd);
    const SS = 'the 50 schools with the most similar intakes';
    let head, body;
    if (natLow && up) { head = 'A gap to national, but ahead of schools like it.'; body = 'Results sit **' + natTxt + '** the national average. Against ' + SS + ', though, the school is **' + f1(ssd) + ' points ahead**. On this evidence the gap to national says more about intake than about the school.'; }
    else if (natLow && down) { head = 'Below national, and below schools like it.'; body = 'Results sit **' + natTxt + '** the national average and **' + ssTxt + '** the average of ' + SS + '. On these measures intake does not account for the whole gap.'; }
    else if (natLow) { head = 'Below national, and about where similar schools are.'; body = 'Results sit **' + natTxt + '** the national average but within the normal range for ' + SS + ' (**' + ssTxt + '** their average). The gap to national is largely one those schools share.'; }
    else if (natHigh && up) { head = 'Above national, and ahead of schools like it.'; body = 'Results sit **' + natTxt + '** the national average and **' + ssTxt + '** the average of ' + SS + '. The headline is not simply a product of intake.'; }
    else if (natHigh && down) { head = 'Above national, but behind schools like it.'; body = 'Results sit **' + natTxt + '** the national average, yet **' + ssTxt + '** the average of ' + SS + '. On its own the headline figure overstates the picture: schools with this intake typically achieve more.'; }
    else if (natHigh) { head = 'Above national, in line with schools like it.'; body = 'Results sit **' + natTxt + '** the national average and close to ' + SS + ' (**' + ssTxt + '** their average). The headline mostly reflects a favourable intake.'; }
    else { head = 'Close to national, and ' + (up ? 'ahead of' : down ? 'behind' : 'in line with') + ' schools like it.'; body = 'Results sit **' + natTxt + '** the national average and **' + ssTxt + '** the average of ' + SS + '.'; }
    // second opinion: graded agreement rather than agree/disagree
    if (ok(cva)) { const cv = '**' + fs(cva) + '** against expectation';
      const ct = OE.ctxThr(r, 'a8'); if (up ? cva > ct : down ? cva < -ct : Math.abs(cva) <= ct) body += ' The contextual model agrees (' + cv + ').';
      else if ((up && cva > 0) || (down && cva < 0)) body += ' The contextual model points the same way, less strongly (' + cv + ').';
      else if (!up && !down) body += ' The contextual model is a little more ' + (cva > 0 ? 'positive' : 'negative') + ' (' + cv + '), so read “in line” as approximate.';
      else body += ' The contextual model points the other way (' + cv + '), so the two readings disagree and the direction is uncertain.'; }
    if (ok(r.pupils) && +r.pupils < 30) body += ' With only **' + Math.round(+r.pupils) + ' pupils** in the cohort, a few results move these figures a long way.';
    const lead = el('div', 'oe-verdict'); lead.append(el('h3', '', head)); lead.append(rich(el('p'), body)); box.append(lead);

    const list = el('div', 'oe-points'); box.append(list);
    const add = (tag, text) => { const d = el('div', 'oe-point rise'); d.append(el('span', 'tag', tag)); d.append(rich(el('p'), text)); list.append(d); };
    const share = (p) => Math.max(1, Math.min(99, Math.round(p)));

    // intake
    if (ok(r.dis_pct) && ok(r.pa_index)) { const pd = pct(st, 'dis_pct', r.dis_pct), pp = pct(st, 'pa_index', r.pa_index);
      let t = '**' + f1(+r.dis_pct) + '%** of the GCSE cohort were disadvantaged, ' + level(pd) + ' and ' + (pd >= 50 ? 'higher than in ' + share(pd) : 'lower than in ' + share(100 - pd)) + '% of secondaries (average ' + f1(st.dis_pct.mean) + '%). Prior attainment on entry was ' + level(pp) + (r.pa_imputed === 'yes' ? ' (estimated)' : '') + ', ' + (pp >= 50 ? 'stronger than in ' + share(pp) : 'weaker than in ' + share(100 - pp)) + '% of schools.';
      if (r.selective === 'Selective') { const ns = nb.filter((x) => x.selective === 'Selective').length; t += ' It is a selective school; ' + (ns === nb.length ? '**all ' + ns + '**' : '**' + ns + '**') + ' of its similar schools are selective too.'; }
      add('Intake', t); }
    // standing in the group
    if (nb.length) { const rank = 1 + nb.filter((x) => +x.a8 > +r.a8).length; const vals = nb.map((x) => +x.a8).sort(d3.ascending);
      add('Among its 50', 'On Attainment 8 it ranks **' + ord(rank) + ' of ' + (nb.length + 1) + '**. Its similar schools range from ' + f1(vals[0]) + ' to ' + f1(vals[vals.length - 1]) + ', averaging ' + f1(+r.ss_mean) + '; the replica reads this school as **' + band.toLowerCase() + '** the group.'); }
    // trend
    if (ok(r.a8_24) && ok(r.a8_25)) { const d2 = +r.a8 - +r.a8_24; const seq = f1(+r.a8_24) + ', ' + f1(+r.a8_25) + ', ' + f1(+r.a8);
      add('Three years', Math.abs(d2) < 1 ? 'Results have been **broadly stable**: ' + seq + ' from 2023/24 to 2025/26.' : 'Results have **' + (d2 > 0 ? 'risen' : 'fallen') + ' ' + f1(Math.abs(d2)) + ' points** in two years: ' + seq + ' from 2023/24 to 2025/26. This year’s figure is provisional.'); }
    else if (ok(r.a8_25)) add('Last year', 'Attainment 8 was ' + f1(+r.a8_25) + ' in 2024/25 and is ' + f1(+r.a8) + ' this year (provisional).');
    // disadvantaged pupils: no figures for groups under 10
    if (ok(r.dis_a8) && ok(r.nondis_a8)) { const nDis = ok(r.pupils) && ok(r.dis_pct) ? Math.round(+r.pupils * +r.dis_pct / 100) : NaN;
      if (ok(nDis) && nDis < 10) add('Disadvantaged pupils', 'Fewer than 10 disadvantaged pupils took GCSEs here. That is too few for their average to be read reliably, so it is not reported.');
      else { const gap = r.nondis_a8 - r.dis_a8, dd = r.dis_a8 - st.dis_a8.mean;
        let t = 'Disadvantaged pupils averaged **' + f1(+r.dis_a8) + '**, ' + (Math.abs(dd) < 1 ? 'in line with' : f1(Math.abs(dd)) + ' points ' + (dd > 0 ? 'above' : 'below')) + ' disadvantaged pupils in the average secondary (' + f1(st.dis_a8.mean) + '). ';
        t += gap < -0.05 ? 'Here they outscored other pupils in the school by **' + f1(-gap) + ' points**; in the average school other pupils lead by ' + f1(st.gap.mean) + '.' : Math.abs(gap) <= 0.05 ? 'They scored **level with** other pupils in the school, where the average school has a gap of ' + f1(st.gap.mean) + '.' : 'The gap to other pupils in the school is **' + f1(gap) + ' points**, against ' + f1(st.gap.mean) + ' in the average school.';
        if (ok(nDis) && nDis < 30) t += ' The group is small (about ' + nDis + ' pupils), so read this loosely.';
        add('Disadvantaged pupils', t); } }
    // inspection
    if (r.g_ach) { const areas = ['g_ach', 'g_ct', 'g_inc', 'g_ab', 'g_pd', 'g_lg', 'g_ey', 'g_p16'].filter((k) => r[k] && r[k] !== 'Not applicable'); const low = areas.filter((k) => BELOW.has(r[k])).length, high = areas.filter((k) => r[k] === 'Strong standard' || r[k] === 'Exceptional').length;
      const insp = nb.filter((x) => x.g_ach), nbLow = insp.filter((x) => BELOW.has(x.g_ach)).length;
      let t = 'Inspected in ' + d3.utcFormat('%B %Y')(new Date(r.insp_date)) + ': achievement was graded **' + r.g_ach + '**, with ' + (high === areas.length ? 'all ' + high + ' areas at Strong standard or above' : (low ? low + ' of ' + areas.length + ' areas below Expected standard' : 'no area below Expected standard') + (high ? ' and ' + high + ' at Strong standard or above' : '')) + '.';
      if (r.ss_band_25) t += ' On the 2024/25 results inspectors had in front of them, the replica placed the school **' + String(r.ss_band_25).toLowerCase() + '** its similar schools.';
      if (insp.length >= 10) t += ' Of its ' + insp.length + ' similar schools inspected so far, ' + (nbLow ? nbLow : 'none') + ' ' + (nbLow === 1 ? 'was' : 'were') + ' graded below Expected standard for achievement.';
      add('Inspection', t); }
    else add('Inspection', 'Not yet inspected under the renewed framework, so there is no report card to set beside these results.');
    box.append(el('p', 'oe-caveat', 'Generated from the published figures by fixed rules. One year of provisional results is noisy; this is a reading of the data, not a judgement on the school.'));
  });

  // ---------- commentary under the strip ----------
  dash.draw('stripnote', (p) => { const r = S(), nb = N(); p.replaceChildren(); if (!r || !nb.length) return;
    const v = nb.map((x) => +x.a8).sort(d3.ascending), hi = nb.filter((x) => +x.a8 > +r.a8).length, eq = nb.filter((x) => +x.a8 === +r.a8).length, lo = nb.length - hi - eq;
    const parts = [hi ? '**' + hi + '** score higher than this school' : '**none** scores higher than this school']; if (lo) parts.push('**' + lo + '** lower'); if (eq) parts.push('**' + eq + '** the same');
    const t = 'Of the 50, ' + (parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]) + '. ';
    rich(p, t + 'The middle half of the group sits between ' + f1(d3.quantileSorted(v, 0.25)) + ' and ' + f1(d3.quantileSorted(v, 0.75)) + '; the spread between similar schools (standard deviation ' + f1(+r.ss_sd) + ') is a reminder of how much schools with near-identical intakes still differ.'); });

  // ---------- profile of the 50 ----------
  const FACT = [['pa_index', 'Prior attainment index', fs, 0.46], ['dis_pct', 'Disadvantaged (cohort) %', f1, 0.14], ['sensup_pct', 'SEN support %', f1, 0.09], ['nonmob_pct', 'Non-mobile (cohort) %', f1, 0.06], ['ehc_pct', 'EHC plan %', f1, 0.04], ['eal_school', 'EAL %', f1, 0.03], ['nor', 'Pupils on roll', d3.format(',.0f'), 0.02]];
  dash.draw('profile', (box) => { const r = S(), nb = N(), st = ST(); box.replaceChildren(); if (!r || !nb.length || !st) return;
    FACT.forEach(([k, lab, fmt, w]) => { const vals = nb.map((x) => x[k]).filter(ok).map(Number); if (!vals.length || !ok(r[k])) return;
      const lo = Math.min(st[k].lo, +r[k], d3.min(vals)), hi = Math.max(st[k].hi, +r[k], d3.max(vals)); const X = (v) => 100 * (v - lo) / ((hi - lo) || 1);
      const out = +r[k] < d3.min(vals) || +r[k] > d3.max(vals); const row = el('div', 'oe-prow rise' + (out ? ' out' : '')); const l = el('div', 'lab'); const sm = el('small', '', 'weight ' + w); if (out) sm.append(el('em', '', ' \u00b7 outside the range of the 50')); l.append(el('b', '', lab), sm); row.append(l);
      const tr = el('div', 'track'); const rng = el('i', 'rng'); rng.style.left = X(d3.min(vals)) + '%'; rng.style.width = Math.max(1, X(d3.max(vals)) - X(d3.min(vals))) + '%';
      const gm = el('i', 'gm'); gm.style.left = X(d3.mean(vals)) + '%'; const nm = el('i', 'nm'); nm.style.left = X(st[k].mean) + '%'; const me = el('i', 'me'); me.style.left = X(+r[k]) + '%';
      tr.append(rng, nm, gm, me); row.append(tr);
      const vv = el('div', 'vals'); vv.append(el('span', 's', fmt(+r[k])), el('span', 'g', fmt(d3.mean(vals))), el('span', 'e', fmt(st[k].mean))); row.append(vv); box.append(row); });
    // composition
    const regs = d3.rollups(nb, (v) => v.length, (x) => x.region).sort((a, b) => b[1] - a[1]); const insp = nb.filter((x) => x.g_ach); const trusts = new Set(nb.map((x) => x.mat).filter(Boolean)).size;
    const comp = el('p', 'oe-comp'); rich(comp, 'The 50 come from **' + regs.length + ' regions**, most from ' + regs.slice(0, 2).map((x) => x[0] + ' (' + x[1] + ')').join(' and ') + '. **' + nb.filter((x) => x.mat).length + '** are in multi-academy trusts (' + trusts + ' different trusts). **' + insp.length + '** have a report card so far' + (insp.length ? ': ' + GORDER.slice().reverse().map((g) => [g, insp.filter((x) => x.g_ach === g).length]).filter((x) => x[1]).map((x) => x[1] + ' ' + x[0]).join(', ') + ' for achievement.' : '.'));
    box.append(comp); });

  // ---------- table: filter, sort, chips ----------
  OE.tbl = {k: 'a8', dir: -1, q: '', insp: false, reg: false, near: false, area: 'g_ach'};
  const GI = (g) => (g ? GORDER.indexOf(g) : -1);
  dash.draw('neigh', (tb) => { const r = S(), nb = N(); tb.replaceChildren(); const ah = document.querySelector('#oe-ntable th[data-sort="a8"]'); if (ah) ah.textContent = OE.MEAS[OE.meas()].short; const cnt = document.getElementById('oe-ncount'); if (!r || !nb.length) { if (cnt) cnt.textContent = ''; return; }
    const T = OE.tbl; const mf = OE.meas(); const mv = (x) => { const v = x[mf]; return v === null || v === '' || isNaN(+v) ? -Infinity : +v; }; const gapOf = (x) => (mf === 'a8' ? x.ss_diff : (x[mf + '_ss'] === '' || x[mf + '_ss'] == null ? '' : +x[mf] - +x[mf + '_ss']));
    const all = nb.concat([r]).sort((a, b) => mv(b) - mv(a)); all.forEach((x, i) => { x._rank = i + 1; x._mi = x === r ? 0 : hav(r, x); });
    const toks = T.q.toLowerCase().split(/\s+/).filter(Boolean);
    let rows = all.filter((x) => x === r || ((!T.insp || x.g_ach) && (!T.reg || x.region === r.region) && (!T.near || x._mi <= 50) && toks.every((t) => (x.name + ' ' + x.la + ' ' + x.region + ' ' + (x.mat || '') + ' ' + (x.district || '')).toLowerCase().includes(t))));
    const SGI = (v) => (v === 'Not met' ? -2 : v === 'Met' ? 9 : GI(v)); const val = (x) => T.k === 'grade' ? (T.area === 'g_sg' ? SGI(x.g_sg) : GI(x[T.area])) : T.k === 'miles' ? x._mi : T.k === 'a8' ? mv(x) : T.k === 'ss_diff' ? (ok(gapOf(x)) ? +gapOf(x) : -Infinity) : T.k === 'name' || T.k === 'la' || T.k === 'region' ? String(x[T.k] || '') : (ok(x[T.k]) ? +x[T.k] : -Infinity);
    rows.sort((a, b) => { const va = val(a), vb = val(b); return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * T.dir; });
    if (cnt) cnt.textContent = 'Showing ' + (rows.length - 1) + ' of ' + nb.length;
    document.querySelectorAll('#oe-ntable th[data-sort]').forEach((th) => th.setAttribute('aria-sort', th.dataset.sort === T.k ? (T.dir > 0 ? 'ascending' : 'descending') : 'none'));
    const o = (v, f) => (ok(v) ? f(+v) : '—');
    rows.forEach((x) => { const tr = el('tr'); const self = x === r; if (self) tr.className = 'self'; else { tr.tabIndex = 0; tr.style.cursor = 'pointer'; tr.addEventListener('click', () => OE.choose(x.urn)); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') OE.choose(x.urn); }); }
      const cells = [[x._rank, 'n'], [self ? x.name + '  (this school)' : x.name, ''], [x.la, ''], [x.region, ''], [OE.mfmt(x[mf], mf), 'n'], [o(x.dis_pct, f1), 'n'], [o(x.pa_index, fs), 'n'], [o(x.pupils, d3.format(',.0f')), 'n'], [o(gapOf(x), fs), 'n'], [self ? '—' : o(x._mi, d3.format('.0f')), 'n']];
      cells.forEach(([t, c]) => tr.append(el('td', c, String(t))));
      const td = el('td'); const gv = x[T.area];
      if (GC[gv]) { const sp = el('span', 'oe-band', gv); sp.style.background = GC[gv]; if (gv === 'Expected standard' || gv === 'Needs attention') sp.style.color = '#0B1A2E'; td.append(sp); }
      else if (gv === 'Not met') { const sp = el('span', 'oe-band', 'Not met'); sp.style.background = '#CE1E02'; td.append(sp); }
      else if (gv === 'Met') td.textContent = 'Met';
      else { td.textContent = x.g_ach ? 'Not graded' : '—'; td.className = 'muted'; }
      tr.append(td); tb.append(tr); }); });
  const tsel = document.getElementById('oe-tarea'), tgh = document.getElementById('oe-tgh');
  if (tsel) tsel.addEventListener('change', () => { OE.tbl.area = tsel.value; if (tgh) tgh.textContent = tsel.options[tsel.selectedIndex].text; redrawT(); });
  const redrawT = () => dash.draw('neigh');
  const nf = document.getElementById('oe-nf'); if (nf) nf.addEventListener('input', () => { OE.tbl.q = nf.value; redrawT(); });
  [['oe-insp', 'insp'], ['oe-reg', 'reg'], ['oe-near', 'near']].forEach(([id, k]) => { const c = document.getElementById(id); if (c) c.addEventListener('change', () => { OE.tbl[k] = c.checked; redrawT(); }); });
  document.querySelectorAll('#oe-ntable th[data-sort]').forEach((th) => { th.tabIndex = 0; const go = () => { const k = th.dataset.sort; if (OE.tbl.k === k) OE.tbl.dir *= -1; else { OE.tbl.k = k; OE.tbl.dir = (k === 'name' || k === 'la' || k === 'region' || k === 'miles') ? 1 : -1; } redrawT(); }; th.addEventListener('click', go); th.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }); });

  // ---------- map ----------
  d3.json('/explorer/data/gb.json').then((g) => { OE.gb = g; dash.draw('map'); }).catch(() => {});
  const restyle = (m) => { const k = m.k || 1; m.all.selectAll('circle').attr('r', 1.5 / Math.sqrt(k)); m.nb.selectAll('circle').attr('r', 4.6 / k ** 0.75).style('stroke-width', 1.2 / k); m.links.selectAll('line').style('stroke-width', 0.8 / k); m.land.selectAll('path').style('stroke-width', 0.8 / k); if (m.pos) m.me.attr('transform', `translate(${m.pos}) scale(${1 / k ** 0.75})`); };
  dash.draw('map', {mount: (box) => { box.replaceChildren(); const tip = el('div', 'oe-tip'); tip.hidden = true; box.append(tip);
      const svg = d3.select(box).append('svg').attr('width', '100%').attr('role', 'img').attr('aria-label', 'Map of England showing the selected school and its 50 similar schools');
      const root = svg.append('g'); const m = {tip, svg, root, land: root.append('g'), all: root.append('g'), links: root.append('g'), nb: root.append('g'), k: 1, key: ''};
      m.me = root.append('path').attr('d', d3.symbol(d3.symbolDiamond, 190)()).attr('class', 'me');
      m.zoom = d3.zoom().scaleExtent([1, 16]).filter((e) => (e.type === 'wheel' ? e.ctrlKey : e.type === 'touchstart' ? e.touches.length > 1 : !e.button)).on('zoom', (e) => { root.attr('transform', e.transform); m.k = e.transform.k; restyle(m); });
      svg.call(m.zoom).on('dblclick.zoom', null);
      const z = (f) => svg.transition().duration(300).call(m.zoom.scaleBy, f);
      [['oe-zin', () => z(1.8)], ['oe-zout', () => z(1 / 1.8)], ['oe-zreset', () => svg.transition().duration(300).call(m.zoom.transform, d3.zoomIdentity)]].forEach(([id, f]) => { const b = document.getElementById(id); if (b) b.onclick = f; });
      const cg = document.getElementById('oe-mapgrade'); if (cg) cg.onchange = () => dash.draw('map');
      return m; },
    update: (box, m) => { const d = dash.data('ks4'); if (d.status !== 'ok') return; const p = P(); const rows = d.data.filter((r) => ok(r.lat));
      const W = box.clientWidth || 520, H = Math.round(Math.min(700, Math.max(420, W * 1.2))); m.svg.attr('viewBox', `0 0 ${W} ${H}`);
      const proj = d3.geoMercator().fitExtent([[16, 16], [W - 16, H - 16]], {type: 'MultiPoint', coordinates: rows.map((r) => [+r.lng, +r.lat])}); const path = d3.geoPath(proj);
      const XY = (r) => proj([+r.lng, +r.lat]);
      if (OE.gb) m.land.selectAll('path').data(OE.gb.features).join('path').attr('d', path).attr('class', 'land');
      const me = rows.find((r) => r.urn === p.urn); const ids = new Set(me ? String(me.nn).split(' ') : []);
      const byG = (document.getElementById('oe-mapgrade') || {}).checked;
      const show = (e, r, extra) => { m.tip.hidden = false; m.tip.textContent = r.name + ' (' + r.la + '): A8 ' + f1(+r.a8) + (r.g_ach ? ' · ' + r.g_ach : '') + (extra || '') + '. Click to open.'; const [px, py] = d3.pointer(e, box); m.tip.style.left = Math.max(0, Math.min(px + 12, box.clientWidth - 250)) + 'px'; m.tip.style.top = Math.max(0, py - 46) + 'px'; };
      const hide = () => { m.tip.hidden = true; };
      m.all.selectAll('circle').data(rows, (r) => r.urn).join('circle').attr('class', 'all').attr('cx', (r) => XY(r)[0]).attr('cy', (r) => XY(r)[1]).style('fill', (r) => (byG ? (GC[r.g_ach] || '#C9D0DC') : '#B9C2D0')).style('opacity', (r) => (byG && r.g_ach ? 0.95 : 0.7)).on('pointerenter', (e, r) => show(e, r)).on('pointerleave', hide).on('click', (e, r) => OE.choose(r.urn));
      const nbs = me ? rows.filter((r) => ids.has(r.urn)) : [];
      const ln = m.links.selectAll('line').data(me ? nbs : [], (r) => r.urn).join('line').attr('class', 'lnk').attr('x1', me ? XY(me)[0] : 0).attr('y1', me ? XY(me)[1] : 0);
      const nc = m.nb.selectAll('circle').data(nbs, (r) => r.urn).join('circle').attr('class', 'nb').style('fill', (r) => GC[r.g_ach] || '#6B7A92').attr('cy', (r) => XY(r)[1]).attr('cx', (r) => XY(r)[0]).on('pointerenter', (e, r) => show(e, r, ' · ' + d3.format('.0f')(hav(me, r)) + ' miles away')).on('pointerleave', hide).on('click', (e, r) => OE.choose(r.urn));
      if (motion() && me && m.key !== p.urn) { ln.attr('x2', XY(me)[0]).attr('y2', XY(me)[1]).transition().duration(800).delay((r, i) => i * 8).attr('x2', (r) => XY(r)[0]).attr('y2', (r) => XY(r)[1]); nc.style('opacity', 0).transition().duration(500).delay((r, i) => 300 + i * 8).style('opacity', 1); }
      else { ln.attr('x2', (r) => XY(r)[0]).attr('y2', (r) => XY(r)[1]); nc.style('opacity', 1); }
      if (me) { m.pos = XY(me); m.me.style('opacity', 1); } else { m.pos = null; m.me.style('opacity', 0); }
      if (m.key !== p.urn) { m.key = p.urn; m.svg.call(m.zoom.transform, d3.zoomIdentity); }
      restyle(m); }});

  dash.draw('geo', (box) => { const r = S(), nb = N(); box.replaceChildren(); if (!r || !nb.length) return; if (!ok(r.lat)) { box.append(el('p', '', 'No location is available for this school.')); return; }
    const ds = nb.map((x) => [x, hav(r, x)]).filter((x) => ok(x[1])).sort((a, b) => a[1] - b[1]); if (!ds.length) return;
    const within = (m) => ds.filter((x) => x[1] <= m).length; const same = nb.filter((x) => x.region === r.region).length; const med = d3.median(ds, (x) => x[1]);
    box.append(rich(el('p'), 'Similar does not mean nearby. Only **' + within(25) + '** of the 50 are within 25 miles and **' + same + '** are in the same region (' + r.region + '). The typical similar school is **' + d3.format('.0f')(med) + ' miles** away; the farthest is ' + d3.format('.0f')(ds[ds.length - 1][1]) + ' miles away, in ' + ds[ds.length - 1][0].la + '.'));
    box.append(el('h3', '', 'Nearest similar schools')); const ul = el('ol', 'oe-near');
    ds.slice(0, 6).forEach(([x, mi]) => { const li = el('li'); const a = el('button', 'lk', x.name); a.type = 'button'; a.addEventListener('click', () => OE.choose(x.urn)); li.append(a, el('span', '', x.la + ' · ' + d3.format('.0f')(mi) + ' mi · A8 ' + f1(+x.a8))); ul.append(li); }); box.append(ul);
    box.append(el('p', 'oe-note', 'Worth a visit: the nearest schools serving a comparable intake, especially those scoring higher.')); });

  // ---------- hero art: the real national scatter, faintly ----------
  dash.draw('heroart', {mount: (box) => ({done: false}), update: (box, m) => { const d = dash.data('ks4'); if (d.status !== 'ok' || m.done) return; m.done = true;
      const rows = d.data.filter((r) => ok(r.ss_mean) && ok(r.a8)); const W = 620, H = 380; const x = d3.scaleLinear().domain([20, 80]).range([10, W - 10]), y = d3.scaleLinear().domain([15, 85]).range([H - 10, 10]);
      const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMaxYMid slice');
      svg.append('line').attr('x1', x(20)).attr('y1', y(20)).attr('x2', x(80)).attr('y2', y(80)).style('stroke', '#5E78A8').style('stroke-dasharray', '3 5');
      const c = svg.selectAll('circle').data(rows).join('circle').attr('cx', (r) => x(+r.ss_mean)).attr('cy', (r) => y(+r.a8)).attr('r', 2.1).style('fill', (r) => GC[r.g_ach] || '#41557A');
      if (motion()) c.style('opacity', 0).transition().duration(900).delay((r, i) => (i % 400) * 3).style('opacity', (r) => (r.g_ach ? 0.9 : 0.55)); else c.style('opacity', (r) => (r.g_ach ? 0.9 : 0.55)); }});

  // ---------- actions ----------
  const pr = document.getElementById('oe-print'); if (pr) pr.addEventListener('click', () => { const s = S(); const d = document.getElementById('oe-printdate'); if (d) d.textContent = (s ? s.name + ' · ' : '') + 'generated ' + d3.timeFormat('%-d %B %Y')(new Date()) + ' · mrkdltn.com/explorer/#urn=' + (s ? s.urn : ''); const t = document.title; if (s) document.title = 'Ofsted Explorer - ' + s.name; window.print(); document.title = t; });
  const cp = document.getElementById('oe-copy'); if (cp) cp.addEventListener('click', async () => { try { const sc = S(); let u = location.href; if (sc && sc.urn) { const h = new URLSearchParams(location.hash.slice(1)); h.delete('urn'); const t = h.toString(); u = location.origin + '/explorer/school/' + sc.urn + '/' + (t ? '#' + t : ''); } await navigator.clipboard.writeText(u); cp.textContent = 'Link copied'; } catch (e) { cp.textContent = location.href; } setTimeout(() => { cp.textContent = 'Copy link'; }, 1800); });
  // section nav highlight
  const links = [...document.querySelectorAll('.oe-nav a')]; if ('IntersectionObserver' in window && links.length) { const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }); }, {rootMargin: '-30% 0px -60% 0px'}); links.forEach((a) => { const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) io.observe(t); }); }
})();
document.querySelectorAll('.oe-nav a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) t.scrollIntoView({behavior: 'smooth', block: 'start'}); }));

// Phone layout (16 November 2026): the national sections sit in a fold, open on wide screens and closed on
// phones. Charts drawn while the fold is closed have no width, so redraw them when it opens; a section-menu
// link into the fold opens it first.
(function () {
  const more = document.getElementById('oe-more'); if (!more) return;
  if (window.matchMedia('(min-width: 641px)').matches) more.open = true;
  more.addEventListener('toggle', () => { if (more.open) ['scatter', 'idaci', 'valid', 'offnote'].forEach((n) => dash.draw(n)); });
  document.querySelectorAll('.oe-nav a').forEach((a) => a.addEventListener('click', () => {
    const t = document.getElementById(a.getAttribute('href').slice(1)); if (t && more.contains(t) && !more.open) more.open = true; }, true));
})();

// Freshness: when the report cards were last checked, and the newest one read
(() => {
  const fmt = (iso) => new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
  fetch('/explorer/data/build.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((b) => {
    if (!b || !b.built) return;
    const hint = document.querySelector('.oe-fresh');
    if (hint) { hint.textContent = 'Report cards checked ' + fmt(b.built) + (b.latest_published ? ', newest published ' + fmt(b.latest_published) : '') + '.'; hint.hidden = false; }
    const src = document.querySelector('.oe-fresh-src');
    if (src) src.textContent = ' (last checked ' + fmt(b.built) + (b.latest_published ? '; newest read was published ' + fmt(b.latest_published) : '') + ')';
  }).catch(() => {});
})();

// ---------- tooltips: one floating box that always stays on screen ----------
(() => {
  const tip = document.createElement('div'); tip.className = 'oe-float'; tip.id = 'oe-float'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.append(tip);
  let cur = null;
  const place = (el) => { const r = el.getBoundingClientRect(); tip.style.maxWidth = Math.min(320, innerWidth - 24) + 'px'; tip.style.left = '0px'; tip.style.top = '0px'; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight; const left = Math.max(12, Math.min(r.left, innerWidth - w - 12));
    let top = r.bottom + 8; if (top + h > innerHeight - 12 && r.top - h - 8 > 12) top = r.top - h - 8;
    tip.style.left = Math.round(left) + 'px'; tip.style.top = Math.round(top) + 'px'; };
  const show = (el) => { const t = el.getAttribute('data-tip'); if (!t) return; if (cur && cur !== el) cur.removeAttribute('aria-describedby'); cur = el; tip.textContent = t; place(el); el.setAttribute('aria-describedby', 'oe-float'); };
  const hide = () => { if (cur) cur.removeAttribute('aria-describedby'); cur = null; tip.hidden = true; };
  document.addEventListener('pointerover', (e) => { if (e.pointerType === 'touch') return; const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { if (el !== cur) show(el); } else if (cur && document.activeElement !== cur) hide(); });
  document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { if (el === cur) hide(); else show(el); } else hide(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el); });
  document.addEventListener('focusout', () => { if (!cur || !cur.matches(':hover')) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  addEventListener('scroll', () => { if (cur) place(cur); }, {passive: true}); addEventListener('resize', hide);
})();

// results measure switch (Attainment 8, or English and maths 5+ / 4+)
document.querySelectorAll('#oe-meas button').forEach((b) => b.addEventListener('click', () => dash.setParams({meas: b.dataset.m})));
