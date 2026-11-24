/* Attendance Explorer: a trust or a parliamentary constituency, built from the DfE's school-level absence statistics.
   Data: bench.json (England by phase and period), grp/<kind><shard>.json (one group: pooled rates and its schools),
   grp/<kind>_all.json (every constituency, or every trust with pooled figures, for the map and the funnel).
   Pooled values per period: [overall, unauthorised, persistent absence, schools]; rates in hundredths of a point.
   A school row: [urn, name, phase, town, enrolments, overall, persistent absence]. Nothing animates. */
(function () {
  const INK = '#0B1A2E', MUTED = '#55627A', VERD = '#2F6F66', GRID = '#EEF1F5', SOFT = '#C9D0DB', UNLIT = '#E3E6EB', BRASS = '#C9A24B';
  const ramp = d3.interpolateRgb('#E9EDF3', INK);
  const PH = {P: 'primary schools', S: 'secondary schools', X: 'special schools'}, PH1 = {P: 'Primary', S: 'Secondary', X: 'Special'};
  // b: index in a pooled value; s: in a school row; o: in an overview row [schools, pupils, overall, unauthorised, persistent]
  // Severe absence (half or more of sessions missed) is pooled for areas, trusts and phases only: never for a single school.
  const MEAS = {abs: {b: 0, s: 5, o: 2, n: 'overall absence'}, pa: {b: 2, s: 6, o: 4, n: 'persistent absence'}, sev: {b: 4, s: null, o: 11, n: 'severe absence'}};
  const KIND = {t: 'Trust', c: 'Parliamentary constituency', w: 'Ward', y: 'Ceremonial county', a: 'Local authority'}, KINDS = {t: 'Trusts', c: 'Constituencies', w: 'Wards', y: 'Counties', a: 'Local authorities'}, SH = {t: 16, c: 16, w: 64, y: 1, a: 8};
  const $ = (id) => document.getElementById(id);
  const pc = (v, dp) => (v == null ? '–' : (dp == null ? Math.round(v / 10) / 10 : v / 100).toFixed(dp == null ? 1 : dp) + '%');      // shown figures round hundredths to tenths, the same way differences do
  // a difference between two rates is the difference of the figures as shown (tenths), in hundredths
  const rd = (a, b) => (Math.round(a / 10) - Math.round(b / 10)) * 10;
  const gap = (a, b) => Math.round(a / 10) - Math.round(b / 10);
  const pts = (t) => (Math.abs(t) / 10).toFixed(1);
  const ay = (p) => { const y = +p.slice(0, 4); return y + '/' + String((y + 1) % 100).padStart(2, '0'); };
  const period = (p) => (p.endsWith('AS') ? 'autumn and spring terms ' + ay(p) : ay(p));
  const num = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const count = (n) => (n < 10 ? num[n] : n.toLocaleString('en-GB'));
  const month = (ym) => new Date(ym + '-15T12:00:00').toLocaleDateString('en-GB', {month: 'long', year: 'numeric'});
  const date = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'});
  const width = (el) => Math.max(280, Math.floor(el.getBoundingClientRect().width));
  const svg = (el, w, h, label) => { el.innerHTML = ''; return d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', label); };
  const key = (el, items) => { const k = document.createElement('div'); k.className = 'ax-key'; items.forEach((t) => { const s = document.createElement('span'); s.innerHTML = t; k.appendChild(s); }); el.appendChild(k); };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  const tip = $('ax-tip');
  const showTip = (ev, html) => { tip.innerHTML = html; tip.hidden = false; const r = tip.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(ev.clientX + 12, innerWidth - r.width - 8)) + 'px';
    tip.style.top = (ev.clientY + 16 + r.height > innerHeight ? Math.max(8, ev.clientY - r.height - 12) : ev.clientY + 16) + 'px'; };
  const hideTip = () => { tip.hidden = true; };
  const tipOn = (sel, html) => sel.on('pointerenter pointermove', (ev, d) => showTip(ev, html(d))).on('pointerleave', hideTip).on('click', (ev, d) => { ev.stopPropagation(); showTip(ev, html(d)); });
  document.addEventListener('click', hideTip); addEventListener('scroll', hideTip, {passive: true});

  let B, G, ALL, PGE = null, VS = [], kind, id, phase, meas = 'abs', view = 'now', pgsel = 'all', random = false;
  // pupil groups can be chosen wherever the DfE publishes them: local authorities and counties
  const PGL = {fsm: 'eligible for free school meals', sen: 'with SEN support', ehcp: 'with an education, health and care plan'};
  const pgOn = () => pgsel !== 'all' && (kind === 'a' || kind === 'y'), pgi = () => (meas === 'abs' ? 0 : meas === 'pa' ? 1 : 2), sub = (a, b) => (a == null || b == null ? null : rd(a, b));
  const pgVal = (pg) => { const t = pg && pg[phase] && pg[phase][pgsel], i = pgi(), g = (k) => (t && t[k] ? t[k][i] : null); return view === 'now' ? g(0) : view === 'yr' ? sub(g(0), g(1)) : sub(g(0), g(2)); };
  const pgEng = () => { const t = PGE && PGE.england[phase] && PGE.england[phase][pgsel], i = pgi(), g = (p) => (t && t[p] ? t[p][i] : null), L = B.latest; return view === 'now' ? g(L) : view === 'yr' ? sub(g(L), g(B.periods.filter((p) => p.endsWith('AS') && p < L).pop())) : sub(g(L), g(B.base + 'AS')); };
  // links to other places keep the schools, measure and view chosen here
  const glink = (k, i) => AXsearch.ghref(k, i) + (phase ? '&phase=' + phase : '') + (meas !== 'abs' ? '&m=' + meas : '') + (view !== 'now' ? '&v=' + view : '') + (pgOn() && (k === 'a' || k === 'y') ? '&g=' + pgsel : '');
  const KINDA = {t: 'a trust', c: 'a constituency', w: 'a ward', y: 'a county', a: 'a local authority'};
  const recs = new Map(), rec = (k, i) => { const u = `/attendance/data/grp/${k}${[...i].reduce((a, c) => a + c.charCodeAt(0), 0) % SH[k]}.json`; if (!recs.has(u)) recs.set(u, d3.json(u)); return recs.get(u).then((j) => j[i] || null); };
  const eng = (ph, p) => (B.bench.E[ph] && B.bench.E[ph][p]) || null;
  const mine = (p) => (G.bench[phase] && G.bench[phase][p]) || null;
  const of = () => (kind === 't' ? 'of ' + G.name : 'in ' + G.name);

  // what the controls above have chosen, said in the summary so their effect is never out of sight
  function focusLine() {
    if (!phase || (meas === 'abs' && view === 'now' && !pgOn())) return '';
    const M = MEAS[meas], L = B.latest, P0 = view === 'yr' ? prevP() : null, i = pgi(), d = (a, b) => (a == null || b == null ? null : rd(a, b));
    let v, ev, ch = null, ech = null;
    if (pgOn()) { const a = G.pg && G.pg[phase] && G.pg[phase][pgsel], en = PGE && PGE.england[phase] && PGE.england[phase][pgsel], g = (s, p) => (s && s[p] ? s[p][i] : null), Pb = view === 'yr' ? P0 : B.base + 'AS';
      v = g(a, L); ev = g(en, L); if (view !== 'now') { ch = d(v, g(a, Pb)); ech = d(ev, g(en, Pb)); } }
    else { const g = (p) => (mine(p) || [])[M.b], ge = (p) => (eng(phase, p) || [])[M.b]; v = g(L); ev = ge(L);
      if (view === 'yr') { ch = d(v, g(P0)); ech = d(ev, ge(P0)); } if (view === 'base') { ch = d(g(B.fy_last), g(B.base)); ech = d(ge(B.fy_last), ge(B.base)); } }
    if (v == null) return `<span class="ax-focus">Chosen above: no figure is published for ${M.n}${pgOn() ? ' for pupils ' + PGL[pgsel] : ''} here.</span>`;
    return `<span class="ax-focus"><b>Chosen above:</b> ${M.n} for ${pgOn() ? 'pupils ' + PGL[pgsel] : 'all pupils'} in its ${PH[phase]} was <b>${pc(v)}</b>` + (ev == null ? '' : `, against ${pc(ev)} across England`)
      + (ch == null ? '' : `. ${view === 'yr' ? 'In a year' : 'Since 2018/19'} it changed by <b>${sign(ch)}</b> points` + (ech == null ? '' : ` (England ${sign(ech)})`)) + '.</span>';
  }

  function head() {
    const L = B.latest, prevP = B.periods.filter((p) => p.endsWith('AS') && p < L).pop();
    $('gx-kind').innerHTML = kind === 't' ? 'Trusts' : `<a href="/attendance/">Areas</a> · <a href="/attendance/group/?k=${kind}">${KINDS[kind]}</a>`;      // a breadcrumb in place of the row of kinds
    if (window.AXtools) AXtools.setPlace({kind: 'group', id: kind + ':' + id, name: G.name, href: glink(kind, id)});
    $('gx-name').textContent = G.name; document.title = G.name + ': attendance · Attendance Explorer · Mark Dalton';
    const by = d3.rollup(G.schools, (v) => v.length, (s) => s[2]);
    $('gx-meta').textContent = (random ? 'Chosen at random to start you off. ' : '') + KIND[kind] + ' · ' + (kind === 'y' ? G.n.toLocaleString('en-GB') + ' schools in ' + count(G.las.length) + (G.las.length === 1 ? ' local authority' : ' local authorities') : '') + ['P', 'S', 'X'].filter((p) => by.get(p)).map((p) => by.get(p) + ' ' + (by.get(p) === 1 ? PH[p].replace(/s$/, '') : PH[p])).join(', ');
    $('gx-period').textContent = 'Absence in the ' + period(L); $('gx-table-p').textContent = period(L);
    $('gx-src').textContent = `“${B.release.autumn_spring.title}” (published ${date(B.release.autumn_spring.published)}) and “${B.release.full_year.title}” (published ${date(B.release.full_year.published)})`;
    const R = $('gx-reading'), K = $('gx-kpis'), now = phase && mine(L), was = phase && prevP && mine(prevP), e = phase && eng(phase, L);
    if (!now) { K.innerHTML = '';
      R.textContent = kind === 't' && !G.pooled ? `${G.name} has ${count(G.n)} schools. A figure for all of a trust’s schools taken together is given only for trusts with five or more, so its schools are listed below without one.`
        : `There are too few schools of any one phase here for a figure across them, so the schools are listed below without one.`; return; }
    let t = `Across the ${count(now[3])} ${PH[phase]} ${of()}, pupils missed <b>${pc(now[0])}</b> of their sessions in the ${period(L)}`;
    if (was) { const d = gap(now[0], was[0]); t += d === 0 ? ', unchanged from the same two terms a year earlier' : `, <b>${pts(d)}</b> points ${d < 0 ? 'lower' : 'higher'} than in the same two terms a year earlier (${pc(was[0])})`; }
    t += '.'; if (e) { const d = gap(now[0], e[0]); t += ` Across England’s ${PH[phase]} the figure was ${pc(e[0])}` + (d === 0 ? ', the same.' : `, so absence here was ${pts(d)} points ${d < 0 ? 'lower' : 'higher'}.`); }
    R.innerHTML = t + '<span class="ax-pills">' + (was ? AXc.pill(gap(now[0], was[0]), 'a year earlier') : '') + (e ? AXc.pill(gap(now[0], e[0]), 'England') : '') + '</span>' + focusLine();
    const k = [['Overall absence', pc(now[0]), was ? 'a year earlier ' + pc(was[0]) : ''], ['Persistent absence', pc(now[2]), was ? 'a year earlier ' + pc(was[2]) : ''], ['Severe absence', now[4] == null ? '–' : pc(now[4]), now[4] == null ? 'too few pupils to show' : was && was[4] != null ? 'a year earlier ' + pc(was[4]) : ''], ['Unauthorised absence', pc(now[1]), e ? 'England ' + pc(e[1]) : ''], ['England ' + PH[phase], e ? pc(e[0]) : '–', e ? 'persistent ' + pc(e[2]) + (e[4] != null ? ', severe ' + pc(e[4]) : '') : '']];
    K.innerHTML = k.map((x) => `<div class="ax-kpi"><div class="k">${esc(x[0])}</div><div class="v">${x[1]}</div><div class="d">${x[2] || '&nbsp;'}</div></div>`).join('');
  }

  function strip() {
    const card = $('gx-strip-c'), el = $('gx-strip'), M = MEAS[meas], L = B.latest;
    const ph = phase || (G.schools[0] && G.schools[0][2]), S = G.schools.filter((s) => s[2] === ph && s[M.s] != null);
    card.querySelector('.ax-sub').hidden = meas === 'sev';
    if (meas === 'sev') { card.hidden = !phase; el.innerHTML = ''; $('gx-strip-r').textContent = 'Severe absence is never shown for a single school, where it usually describes a handful of children. Choose overall or persistent absence to see each school.'; return; }
    card.hidden = S.length < 2; if (S.length < 2) return;
    document.querySelectorAll('.gx-phase-n').forEach((n) => { n.textContent = PH[ph]; }); document.querySelectorAll('.gx-meas-n').forEach((n) => { n.textContent = M.n + ' in the ' + period(L); });
    const W = width(el), m = {t: 22, r: 18, b: 30, l: 18}, e = eng(ph, L), g = phase && mine(L);
    const ext = d3.extent(S.map((s) => s[M.s]).concat(e ? [e[M.b]] : [], g ? [g[M.b]] : [])), pad = Math.max(40, (ext[1] - ext[0]) * 0.08);
    const x = d3.scaleLinear([Math.max(0, ext[0] - pad), ext[1] + pad], [m.l, W - m.r]).nice(), r = d3.scaleSqrt([0, d3.max(S, (s) => s[4])], [0, W < 480 ? 9 : 13]);
    // place circles in rows so none overlap
    const placed = []; S.slice().sort((a, b) => b[4] - a[4]).forEach((s) => { const cx = x(s[M.s]), rr = Math.max(3, r(s[4])); let lane = 0;
      for (;; lane++) { const cy = (lane % 2 ? -1 : 1) * Math.ceil(lane / 2) * 7; if (!placed.some((p) => Math.hypot(p.cx - cx, p.cy - cy) < p.r + rr + 1)) { placed.push({s, cx, cy, r: rr}); break; } } });
    const half = d3.max(placed, (p) => Math.abs(p.cy) + p.r) + 6, H = Math.ceil(m.t + half * 2 + m.b), mid = m.t + half;
    const s = svg(el, W, H, M.n + ' at each school');
    s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', mid).attr('y2', mid).attr('stroke', GRID);
    x.ticks(W < 480 ? 4 : 8).forEach((t) => s.append('text').attr('x', x(t)).attr('y', H - 8).attr('text-anchor', 'middle').text((t / 100) + '%'));
    if (e) { s.append('line').attr('x1', x(e[M.b])).attr('x2', x(e[M.b])).attr('y1', m.t - 6).attr('y2', H - m.b).attr('stroke', MUTED).attr('stroke-width', 2); }
    const c = s.append('g').attr('class', 'ax-dots').selectAll('circle').data(placed).join('circle').attr('cx', (p) => p.cx).attr('cy', (p) => mid + p.cy).attr('r', (p) => p.r).attr('fill', SOFT).attr('stroke', MUTED);      // named schools take no green or rust (Mark, 24 November)
    tipOn(c, (p) => `<b>${esc(p.s[1])}</b><br>${esc(p.s[3])}<br>Overall absence ${pc(p.s[5])}<br>Persistent absence ${pc(p.s[6])}`);
    if (g) s.append('path').attr('d', d3.symbol(d3.symbolDiamond, 150)()).attr('transform', `translate(${x(g[M.b])},${m.t - 8})`).attr('fill', INK);
    key(el, [`<i style="background:${SOFT};border:1px solid ${MUTED};border-radius:50%;width:10px"></i>A school (a larger circle is a larger school)`].concat(g ? [`<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${esc(G.name)}, its schools taken together`] : [], e ? [`<i style="background:${MUTED};width:2px;height:12px"></i>England ${PH[ph]}`] : []));
    const v = S.map((s) => s[M.s]).sort(d3.ascending), below = e ? S.filter((s) => s[M.s] < e[M.b]).length : null;
    $('gx-strip-r').innerHTML = `${M.n.replace(/^./, (ch) => ch.toUpperCase())} at these ${count(S.length)} schools ran from <b>${pc(v[0])}</b> to <b>${pc(v[v.length - 1])}</b>` + (e ? `, and ${below === 0 ? 'none' : below === S.length ? (below === 2 ? 'both' : 'all ' + count(below)) : count(below)} had a lower rate than England’s ${PH[ph]} taken together.` : '.');
  }

  function hist() {
    const card = $('gx-hist-c'), el = $('gx-hist'), M = MEAS[meas]; card.hidden = !(phase && G.bench[phase]); if (card.hidden) return;
    $('gx-hist-s').textContent = (kind === 'w' || kind === 'y' || kind === 'a' ? 'Its schools taken together, for each full school year.' : kind === 't' ? !(G.bench_in && G.bench_in[phase]) ? 'The schools it holds today, taken together for each full school year, including years before they joined it. No joining dates are recorded for them, so the trust’s own record cannot be drawn separately.' : 'The solid line takes together only the schools that were in the trust in each year. It is the trust’s own record. The dashed line takes together the schools it holds today in every year, including the years before they joined.' : 'The schools located in the constituency, taken together for each full school year.') + ' No figures were published for 2019/20.';
    const W = width(el), H = Math.round(Math.min(360, Math.max(230, W * 0.46))), m = {t: 14, r: 16, b: 30, l: 42};
    const yrs = d3.range(+B.fy[0], +B.fy_last + 1).map(String), s = svg(el, W, H, M.n + ' by school year');
    const inT = kind === 't' && G.bench_in && G.bench_in[phase], at = (p) => (inT && inT[p]) || null;
    const lines = [{d: yrs.map((p) => ({p, v: (eng(phase, p) || [])[M.b]})), c: MUTED, w: 2, n: 'England ' + PH[phase]},
      {d: yrs.map((p) => ({p, v: (mine(p) || [])[M.b], k: (mine(p) || [])[3]})), c: INK, w: inT ? 2 : 3, n: inT ? 'The schools it holds today, in every year' : G.name, me: !inT, dash: inT ? '5 4' : null}]
      .concat(inT ? [{d: yrs.map((p) => ({p, v: (at(p) || [])[M.b], k: (at(p) || [])[3], of: (mine(p) || [])[3]})), c: INK, w: 3, n: 'Schools in the trust at the time', me: true}] : []);
    lines.splice(1, 0, ...VS.filter((o) => o.g.bench[phase]).map((o, i) => ({d: yrs.map((p) => ({p, v: (o.g.bench[phase][p] || [])[M.b]})), c: OTHERS[i % 4], w: 2, n: o.g.name, dash: ODASH[i % 4], tag: i + 1})));
    const vals = lines.flatMap((l) => l.d.map((p) => p.v)).filter((v) => v != null);
    const x = d3.scalePoint(yrs, [m.l + 8, W - m.r - 8]), y = d3.scaleLinear([VS.length ? d3.min(vals) * 0.85 : 0, d3.max(vals) * 1.08], [H - m.b, m.t]).nice(5);      // with places added, the axis closes in so the lines separate
    y.ticks(5).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID); s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
    const gx = x('2019'); s.append('rect').attr('x', gx - x.step() * 0.38).attr('width', x.step() * 0.76).attr('y', m.t).attr('height', H - m.b - m.t).attr('fill', '#F4F5F8');
    yrs.forEach((p, i) => { if (W >= 640 || i % 2 === 0) s.append('text').attr('x', x(p)).attr('y', H - 8).attr('text-anchor', 'middle').text(W < 640 ? "'" + ay(p).slice(2) : ay(p)); });
    const line = d3.line().defined((p) => p.v != null).x((p) => x(p.p)).y((p) => y(p.v));
    lines.forEach((l) => { if (l.tag) { const z = l.d.filter((p) => p.v != null).pop(); if (z) s.append('text').attr('class', 'strong ax-tag').attr('x', x(z.p) + 7).attr('y', y(z.v) + 4).text(l.tag); }
      s.append('path').attr('d', line(l.d)).attr('fill', 'none').attr('stroke', l.c).attr('stroke-width', l.w).attr('stroke-dasharray', l.dash || null).attr('stroke-linejoin', 'round').attr('stroke-linecap', l.dash ? 'butt' : 'round');
      tipOn(s.append('g').selectAll('circle').data(l.d.filter((p) => p.v != null)).join('circle').attr('cx', (p) => x(p.p)).attr('cy', (p) => y(p.v)).attr('r', l.me ? 3.5 : 8).attr('fill', l.me ? l.c : 'transparent'),
        (p) => `<b>${esc(l.n)}</b><br>${ay(p.p)}: ${M.n} ${pc(p.v)}` + (p.of ? `<br>${p.k} of today’s ${p.of} schools were in the trust` : p.k ? `<br>${p.k} schools with figures` : '')); });
    { const tg = s.selectAll('text.ax-tag').nodes().map((n) => ({n, y: +n.getAttribute('y')})).sort((a, b) => a.y - b.y); tg.forEach((t, i) => { if (i && t.y - tg[i - 1].y < 14) t.y = tg[i - 1].y + 14; t.n.setAttribute('y', t.y); }); }      // keep the numbers at the line ends apart
    key(el, lines.slice().reverse().map((l) => `<i class="ln" style="border-color:${l.c}${l.dash ? ';border-top-style:dashed' : ''}"></i>${l.tag ? l.tag + ' ' : ''}${esc(l.n)}`));
    const first = inT ? yrs.find((p) => at(p)) : null, r = $('gx-hist-r');
    r.hidden = !(kind === 't'); if (kind !== 't') return;
    const jn = G.schools.filter((s) => s[2] === phase && s[7]).map((s) => s[7]).sort(), nj = G.schools.filter((s) => s[2] === phase).length, mv = G.schools.filter((s) => s[2] === phase && s[8]).length;
    r.innerHTML = !jn.length ? 'No joining dates are recorded for these schools, so the line shows the schools it holds today in every year.'
      : `Its ${count(nj)} ${PH[phase]} joined between <b>${month(jn[0])}</b> and <b>${month(jn[jn.length - 1])}</b>` + (mv ? `, and ${count(mv)} came from another trust` : '') + '. ' + (first ? `The solid line starts in ${ay(first)}, the first year with three of them in the trust.` : 'Fewer than three were in the trust in any year with figures, so only the dashed line is drawn.');
  }

  // a tapped mark names itself beneath the chart, with a link to open it: hover is no use on a phone
  function picked(el, name, text, href) { let p = el.querySelector('.ax-picked'); if (!p) { p = document.createElement('p'); p.className = 'ax-picked'; el.appendChild(p); }
    p.innerHTML = `<span><b>${esc(name)}</b>${text ? ': ' + text : ''}</span>` + (href ? ` <a class="ax-btn" href="${href}">Open</a>` : ''); }

  // ---- what is being compared: the newest rate, or its change
  const VIEW = {now: 'Latest', yr: 'Change in a year', base: 'Change since 2018/19'}, CH = {abs: [5, 7, 8], pa: [6, 9, 10], sev: [12, 13, 14]};
  const prevP = () => B.periods.filter((p) => p.endsWith('AS') && p < B.latest).pop();
  // from an overview row [schools, pupils, overall, unauthorised, persistent, year-earlier overall and persistent, newest full year and 2018/19 overall, then persistent]
  const val = (r) => { const c = CH[meas], d = (a, b) => (a == null || b == null ? null : rd(a, b)); return !r ? null : view === 'now' ? r[MEAS[meas].o] : view === 'yr' ? d(r[MEAS[meas].o], r[c[0]]) : d(r[c[1]], r[c[2]]); };
  const engVal = (ph) => { if (pgOn()) return pgEng(); const b = MEAS[meas].b, g = (p) => (eng(ph, p) || [])[b], d = (a, c) => (a == null || c == null ? null : rd(a, c)); return view === 'now' ? g(B.latest) : view === 'yr' ? d(g(B.latest), g(prevP())) : d(g(B.fy_last), g(B.base)); };
  const sign = (v) => { const t = Math.round(v / 10); return (t > 0 ? '+' : t < 0 ? '−' : '') + (Math.abs(t) / 10).toFixed(1); };   // never '−0.0'
  const fv = (v) => (v == null ? '–' : view === 'now' ? pc(v) : sign(v) + ' points');
  // pupil groups are published for the autumn and spring terms only, so their change since 2018/19 compares those two terms
  const vname = () => (pgOn() && view === 'base' ? `the change in ${MEAS[meas].n} between the autumn and spring terms of ${ay(B.base)} and ${ay(B.latest)}` : vname0()) + (pgOn() ? ' for pupils ' + PGL[pgsel] : '');
  const vname0 = () => (view === 'now' ? MEAS[meas].n : view === 'yr' ? 'the change in ' + MEAS[meas].n + ' from the same two terms a year earlier' : `the change in ${MEAS[meas].n} between ${ay(B.base)} and ${ay(B.fy_last)}`);
  const vkey = () => (view === 'now' ? 'Green is lower than England, rust higher' : 'Green means it fell, or rose less than across England, and rust that it rose more');
  const cap = (t) => t.replace(/^./, (c) => c.toUpperCase());

  // constituencies and local authorities: a hex map. Counties: an ordered plot. Wards: a map of the district. Trusts: a funnel, or a line of dots for change.
  function over() {
    const card = $('gx-over-c'), el = $('gx-over'), M = MEAS[meas]; card.hidden = !(phase && ALL); if (card.hidden) return;
    if (kind === 'w') { wardMap(el, M); return; }
    const rows = ALL.filter((r) => r[phase]).map((r) => ({r, n: r[phase][1], v: pgOn() ? pgVal(r.pg) : val(r[phase])})).filter((d) => d.v != null);
    if (kind === 'y') { ordered(el, rows); return; }
    if (kind === 'c' || kind === 'a') { hexMap(el, rows); return; }
    if (view === 'now') { funnel(el, M, rows); return; }
    $('gx-over-h').textContent = 'Among trusts'; $('gx-over-s').textContent = `Each dot is a trust with at least three ${PH[phase]}, placed by ${vname()}, for the schools it holds today. Tap a dot to name the trust.`;
    el.innerHTML = ''; const W = width(el), H = 120, m = {t: 30, r: 16, b: 30, l: 16}, s = svg(el, W, H, 'Trusts by ' + vname()), mid = engVal(phase);
    const x = d3.scaleLinear(d3.extent(rows.map((d) => d.v).concat([mid])), [m.l, W - m.r]).nice();
    x.ticks(W < 480 ? 4 : 8).forEach((t) => s.append('text').attr('x', x(t)).attr('y', H - 8).attr('text-anchor', 'middle').text(sign(t)));
    s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', 60).attr('y2', 60).attr('stroke', GRID);
    if (mid != null) s.append('line').attr('x1', x(mid)).attr('x2', x(mid)).attr('y1', m.t - 6).attr('y2', H - m.b).attr('stroke', MUTED).attr('stroke-width', 2);
    const c = s.append('g').attr('class', 'ax-dots').selectAll('circle').data(rows.filter((d) => d.r.id !== id)).join('circle').attr('cx', (d) => x(d.v)).attr('cy', (d, i) => 60 + ((i * 37) % 31) - 15).attr('r', 3.5).attr('fill', (d) => AXc.gap(d.v - mid)).attr('fill-opacity', 0.55);
    const html = (d) => `<b>${esc(d.r.name)}</b><br>${cap(vname())}: ${fv(d.v)}`;
    c.on('pointerenter pointermove', (ev, d) => showTip(ev, html(d))).on('pointerleave', hideTip).on('click', (ev, d) => { ev.stopPropagation(); picked(el, d.r.name, fv(d.v), glink('t', d.r.id)); });
    const me = rows.find((d) => d.r.id === id); if (me) tipOn(s.append('path').datum(me).attr('d', d3.symbol(d3.symbolDiamond, 150)()).attr('transform', `translate(${x(me.v)},60)`).attr('fill', INK).attr('stroke', '#fff'), html);
    key(el, [`<i style="background:${AXc.VERD};border-radius:50%;width:10px"></i>Fell, or rose less than England`, `<i style="background:${AXc.RUST};border-radius:50%;width:10px"></i>Rose more`, `<i style="background:${MUTED};width:2px;height:12px"></i>England ${PH[phase]}, ${fv(mid)}`].concat(me ? [`<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${esc(G.name)}, ${fv(me.v)}`] : []));
    $('gx-over-r').innerHTML = me ? `Across the ${PH[phase]} it holds today, ${vname()} was <b>${fv(me.v)}</b>, against ${fv(mid)} across England. <b>${rows.filter((d) => d.v < me.v).length}</b> of the other ${rows.length - 1} trusts had a smaller rise or a larger fall.` : '';
  }

  function hexMap(el, rows) {
    const what = kind === 'c' ? ['constituency', 'constituencies'] : ['local authority', 'local authorities'], M = MEAS[meas];
    $('gx-over-h').textContent = 'Every ' + what[0] + ' in England'; $('gx-over-s').textContent = `One hexagon for each, placed roughly where it sits and coloured by ${vname()} in its ${PH[phase]} against England. ${vkey()}. Grey means no figure. Tap a hexagon to name it.`;
    el.innerHTML = ''; const H2 = rows.filter((d) => d.r.q != null), cap2 = kind === 'c' ? 620 : 480, W = Math.min(cap2, width(el)), qs = d3.extent(ALL.filter((r) => r.q != null), (r) => r.q + (r.r & 1) / 2), rs = d3.extent(ALL.filter((r) => r.q != null), (r) => r.r);
    const size = (W - 4) / ((qs[1] - qs[0] + 1) * Math.sqrt(3)), H = Math.ceil((rs[1] - rs[0]) * 1.5 * size + 2 * size + 4);
    const px = (d) => (d.r.q + (d.r.r & 1) / 2 - qs[0] + 0.5) * Math.sqrt(3) * size + 2, py = (d) => (rs[1] - d.r.r) * 1.5 * size + size + 2;
    const dpath = 'M' + d3.range(6).map((i) => { const t = Math.PI / 180 * (60 * i - 30); return (Math.cos(t) * (size - 0.6)).toFixed(2) + ',' + (Math.sin(t) * (size - 0.6)).toFixed(2); }).join('L') + 'Z';
    const vals = H2.map((d) => d.v).sort(d3.ascending), lo = d3.quantile(vals, 0.03), hi = d3.quantile(vals, 0.97), s = svg(el, W, H, 'Map of ' + what[1] + ' coloured by ' + vname());
    const e = engVal(phase), mid = e == null ? d3.median(vals) : e, span = Math.max(hi - mid, mid - lo) || 50;
    s.style('max-width', cap2 + 'px').style('margin', '0 auto');
    const has = new Set(H2.map((d) => d.r.id)), blank = ALL.filter((r) => !has.has(r.id) && r.q != null).map((r) => ({r, v: null}));
    const g = s.append('g').attr('class', 'ax-hexes').selectAll('path').data(blank.concat(H2)).join('path').attr('d', dpath).attr('transform', (d) => `translate(${px(d)},${py(d)})`).attr('fill', (d) => AXc.div(d.v, mid, span));
    g.on('pointerenter pointermove', (ev, d) => showTip(ev, `<b>${esc(d.r.name)}</b><br>${d.v == null ? 'No figure' : cap(vname()) + ': ' + fv(d.v)}`)).on('pointerleave', hideTip).on('click', (ev, d) => { ev.stopPropagation(); if (d.r.id === id) return; picked(el, d.r.name, d.v == null ? 'no figure' : fv(d.v), glink(kind, d.r.id)); });
    const me = H2.find((d) => d.r.id === id); if (me) s.append('path').attr('d', dpath).attr('transform', `translate(${px(me)},${py(me)}) scale(${kind === 'c' ? 1.6 : 1.15})`).attr('fill', 'none').attr('stroke', BRASS).attr('stroke-width', 2.5).attr('pointer-events', 'none');
    key(el, [AXc.legend(mid, span, 'England', view === 'now' ? null : (v) => sign(v) + ' points'), `<i style="background:none;border:2px solid ${BRASS}"></i>${esc(G.name)}`]);
    const below = me ? H2.filter((d) => d.v < me.v).length : null;
    $('gx-over-r').innerHTML = !me ? '' : view === 'now' ? `<b>${below}</b> of the other ${H2.length - 1} ${what[1]} had a lower rate than ${esc(G.name)} and <b>${H2.length - below - 1}</b> a higher one.`
      : `For ${esc(G.name)}, ${vname()} was <b>${fv(me.v)}</b>, against ${fv(mid)} across England. <b>${below}</b> of the other ${H2.length - 1} ${what[1]} had a smaller rise or a larger fall.`;
  }

  function funnel(el, M, rows) {
    $('gx-over-h').textContent = 'Among trusts, allowing for size'; $('gx-over-s').textContent = `Each dot is a trust with at least three ${PH[phase]}, placed by its number of pupils and by ${M.n}. The bands show where about 95% and 99.8% of trusts of each size fall. A small trust varies more by chance, so the bands are wider on the left. Tap a dot to name the trust.`;
    el.innerHTML = ''; const p0 = d3.sum(rows, (d) => d.v * d.n) / d3.sum(rows, (d) => d.n) / 10000;
    const z = rows.map((d) => (d.v / 10000 - p0) / Math.sqrt(p0 * (1 - p0) / d.n)).sort(d3.ascending), k = Math.floor(z.length * 0.1), zw = z.map((v, i) => (i < k ? z[k] : i >= z.length - k ? z[z.length - k - 1] : v));
    const phi = Math.max(1, d3.mean(zw, (v) => v * v));
    const W = width(el), H = Math.round(Math.min(420, Math.max(260, W * 0.5))), m = {t: 14, r: 16, b: 40, l: 44}, s = svg(el, W, H, 'Funnel plot of trusts');
    const xe = d3.extent(rows, (d) => d.n), x = d3.scaleLog([xe[0] * 0.85, xe[1] * 1.15], [m.l + 6, W - m.r - 6]), lim = (n, q) => 10000 * (p0 + q * Math.sqrt(phi * p0 * (1 - p0) / n));
    const ys = rows.map((d) => d.v).concat([lim(x.domain()[0], 3.09), lim(x.domain()[0], -3.09)]), y = d3.scaleLinear([Math.max(0, d3.min(ys)), d3.max(ys)], [H - m.b, m.t]).nice(5);
    y.ticks(5).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID); s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
    [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000].filter((t) => t >= x.domain()[0] && t <= x.domain()[1]).forEach((t) => s.append('text').attr('x', x(t)).attr('y', H - m.b + 16).attr('text-anchor', 'middle').text(t.toLocaleString('en-GB')));
    s.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Pupils in the trust’s ' + PH[phase]);
    const ns = d3.range(60).map((i) => x.invert(m.l + 6 + i * (W - m.r - m.l - 12) / 59)), area = (q) => d3.area().x((n) => x(n)).y0((n) => y(Math.max(y.domain()[0], lim(n, -q)))).y1((n) => y(Math.min(y.domain()[1], lim(n, q))))(ns);
    s.append('path').attr('d', area(3.09)).attr('fill', '#F4F5F8'); s.append('path').attr('d', area(1.96)).attr('fill', '#E6EAF0');
    s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(p0 * 10000)).attr('y2', y(p0 * 10000)).attr('stroke', MUTED).attr('stroke-width', 2);
    const html = (d) => `<b>${esc(d.r.name)}</b><br>${d.r[phase][0]} ${PH[phase]}, ${d.n.toLocaleString('en-GB')} pupils<br>${cap(M.n)} ${pc(d.v)}`;
    const c = s.append('g').attr('class', 'ax-dots').selectAll('circle').data(rows.filter((d) => d.r.id !== id)).join('circle').attr('cx', (d) => x(d.n)).attr('cy', (d) => y(d.v)).attr('r', W < 480 ? 3 : 4).attr('fill', MUTED).attr('fill-opacity', 0.5);
    c.on('pointerenter pointermove', (ev, d) => showTip(ev, html(d))).on('pointerleave', hideTip).on('click', (ev, d) => { ev.stopPropagation(); picked(el, d.r.name, fv(d.v), glink('t', d.r.id)); });
    const me = rows.find((d) => d.r.id === id); if (me) tipOn(s.append('path').datum(me).attr('d', d3.symbol(d3.symbolDiamond, 150)()).attr('transform', `translate(${x(me.n)},${y(me.v)})`).attr('fill', INK).attr('stroke', '#fff'), html);
    key(el, [`<i style="background:${MUTED};border-radius:50%;width:10px"></i>Trusts (${rows.length})`, `<i style="background:#E6EAF0"></i>About 95% of trusts`, `<i style="background:#F4F5F8;border:1px solid ${GRID}"></i>About 99.8%`, `<i class="ln" style="border-color:${MUTED}"></i>All these trusts together, ${pc(p0 * 10000)}`].concat(me ? [`<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${esc(G.name)}`] : []));
    if (me) { const zz = (me.v / 10000 - p0) / Math.sqrt(phi * p0 * (1 - p0) / me.n), a = Math.abs(zz);
      $('gx-over-r').innerHTML = `With ${me.n.toLocaleString('en-GB')} pupils in its ${PH[phase]}, ${esc(G.name)} sits ` + (a < 1.96 ? 'inside the band that holds about 95% of trusts of its size.' : `${zz < 0 ? 'below' : 'above'} the band that holds about ${a < 3.09 ? '95' : '99.8'}% of trusts of its size, with ${zz < 0 ? 'lower' : 'higher'} ${M.n} than chance alone would explain in a trust of its size.`) + ' The comparison takes no account of the pupils its schools serve.'; }
    else $('gx-over-r').textContent = '';
  }

  // a ward among the wards of its district (ONS boundaries); primary schools only
  function wardMap(el, M) {
    el.innerHTML = ''; const D = ALL, W = Math.min(640, width(el)), k = W / D.w, H = Math.ceil(D.h * k), wv = (w) => (w.v ? val([w.v[0], null].concat(w.v.slice(1))) : null);
    $('gx-over-h').textContent = 'The wards of ' + D.name; $('gx-over-s').textContent = `Each ward is coloured by ${vname()} in its primary schools against England. ${vkey()}. A grey ward has fewer than three primary schools, so no figure is given. Tap a ward to name it.`;
    const s = svg(el, W, H, 'Map of wards in ' + D.name); s.style('max-width', '640px').style('margin', '0 auto').attr('class', 'ax-map');
    const vals = D.wards.map(wv).filter((v) => v != null), e = engVal('P'), mid = e == null ? d3.median(vals) : e, span = Math.max(d3.max(vals.concat([mid])) - mid, mid - d3.min(vals.concat([mid]))) || 100;
    const path = (w) => w.p.map((r) => 'M' + d3.range(r.length / 2).map((i) => (r[2 * i] * k).toFixed(1) + ',' + ((D.h - r[2 * i + 1]) * k).toFixed(1)).join('L') + 'Z').join('');
    const g = s.selectAll('path').data(D.wards.slice().sort((a, b) => (a.c === id) - (b.c === id))).join('path').attr('d', path).attr('fill-rule', 'evenodd').attr('class', (w) => (w.c === id ? 'me' : null)).attr('fill', (w) => AXc.div(wv(w), mid, span));
    const html = (w) => `<b>${esc(w.n)}</b><br>` + (!w.v ? 'No state-funded school in the newest figures' : wv(w) == null ? `${w.v[0]} ${w.v[0] === 1 ? 'school' : 'schools'}: no figure` : `${cap(vname())}: ${fv(wv(w))}`);
    g.on('pointerenter pointermove', (ev, w) => showTip(ev, html(w))).on('pointerleave', hideTip).on('click', (ev, w) => { ev.stopPropagation(); if (w.c !== id) picked(el, w.n, !w.v ? 'no state-funded school in the newest figures' : wv(w) == null ? 'no figure' : fv(wv(w)), w.v ? glink('w', w.c) : null); });
    key(el, [AXc.legend(mid, span, 'England primary schools', view === 'now' ? null : (v) => sign(v) + ' points'), `<i style="background:${AXc.NONE}"></i>No figure`, `<i style="background:none;border:2px solid ${INK}"></i>${esc(G.name)}`, 'Boundaries: Office for National Statistics, OGL v3.0. Contains OS data © Crown copyright and database right 2026']);
    $('gx-over-r').innerHTML = `<b>${vals.length}</b> of the ${D.wards.length} wards in ${esc(D.name)} have a figure. A ward figure describes the schools located there, not the children who live there.`;
  }

  // areas in order, each set against England (areas may be ordered; schools never are)
  function ordered(el, rows) {
    el.innerHTML = ''; const e = engVal(phase), mid = e == null ? d3.median(rows, (d) => d.v) : e, R = rows.slice().sort((a, b) => a.v - b.v), W = width(el), narrow = W < 520, rh = 20, m = {t: 22, r: narrow ? 46 : 84, b: 8, l: narrow ? 128 : 190}, H = m.t + R.length * rh + m.b;
    $('gx-over-h').textContent = 'The ceremonial counties'; $('gx-over-s').textContent = `Each county’s ${PH[phase]} taken together, in order of ${vname()}, set against England. Tap a county to open it.`;
    const s = svg(el, W, H, 'Counties by ' + vname()), x = d3.scaleLinear(d3.extent(R.map((d) => d.v).concat([mid])), [m.l + 8, W - m.r]).nice();
    x.ticks(narrow ? 3 : 6).forEach((t) => { s.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t - 4).attr('y2', H - m.b).attr('stroke', GRID); s.append('text').attr('x', x(t)).attr('y', 12).attr('text-anchor', 'middle').text(view === 'now' ? (t / 100) + '%' : sign(t)); });
    s.append('line').attr('x1', x(mid)).attr('x2', x(mid)).attr('y1', m.t - 4).attr('y2', H - m.b).attr('stroke', MUTED).attr('stroke-width', 2);
    const g = s.append('g').selectAll('g').data(R).join('g').attr('transform', (d, i) => `translate(0,${m.t + i * rh + rh / 2})`).style('cursor', 'pointer').on('click', (ev, d) => { location.href = glink('y', d.r.id); });
    g.append('rect').attr('x', 0).attr('y', -rh / 2).attr('width', W).attr('height', rh).attr('fill', (d) => (d.r.id === id ? '#F6F3EC' : 'transparent'));
    g.append('text').attr('x', m.l - 4).attr('y', 4).attr('text-anchor', 'end').attr('class', (d) => (d.r.id === id ? 'strong' : null)).text((d) => (narrow && d.r.name.length > 19 ? d.r.name.slice(0, 18) + '…' : d.r.name));
    g.append('line').attr('x1', x(mid)).attr('x2', (d) => x(d.v)).attr('stroke', (d) => AXc.gap(d.v - mid)).attr('stroke-width', 3);
    g.append('path').attr('d', (d) => (d.r.id === id ? d3.symbol(d3.symbolDiamond, 110)() : d3.symbol(d3.symbolCircle, 60)())).attr('transform', (d) => `translate(${x(d.v)},0)`).attr('fill', (d) => (d.r.id === id ? INK : AXc.gap(d.v - mid)));
    g.append('text').attr('x', W - m.r + 6).attr('y', 4).attr('class', (d) => (d.r.id === id ? 'strong' : null)).text((d) => (view === 'now' ? pc(d.v) : sign(d.v) + (narrow ? '' : ' points')));
    key(el, [`<i style="background:${AXc.VERD}"></i>${view === 'now' ? 'Lower than England' : 'Fell, or rose less than England'}`, `<i style="background:${AXc.RUST}"></i>${view === 'now' ? 'Higher' : 'Rose more'}`, `<i style="background:${MUTED};width:2px;height:12px"></i>England ${PH[phase]}, ${fv(mid)}`, `<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${esc(G.name)}`]);
    const me = R.findIndex((d) => d.r.id === id); $('gx-over-r').innerHTML = me < 0 ? '' : view === 'now' ? `<b>${me}</b> of the other ${R.length - 1} counties with a figure had lower ${MEAS[meas].n} in their ${PH[phase]} than ${esc(G.name)} and <b>${R.length - 1 - me}</b> had higher.`
      : `For ${esc(G.name)}, ${vname()} was <b>${fv(R[me].v)}</b>, against ${fv(mid)} across England. <b>${me}</b> of the other ${R.length - 1} counties had a smaller rise or a larger fall.`;
  }

  // ---- pupil groups (local authorities and counties): the DfE publishes these to local authority level only
  const PGN = [['fsm', 'Eligible for free school meals'], ['nfsm', 'Not eligible for free school meals'], ['sen', 'SEN support'], ['ehcp', 'Education, health and care plan'], ['nosen', 'No identified SEN']];
  function groups() {
    const card = $('gx-pg-c'), el = $('gx-pg'); card.hidden = !(G.pg && PGE && phase && G.pg[phase]); if (card.hidden) return; el.innerHTML = '';
    const i = meas === 'abs' ? 0 : meas === 'pa' ? 1 : 2, L = B.latest, P0 = view === 'yr' ? prevP() : view === 'base' ? B.base + 'AS' : null;
    const get = (src, g) => { const ps = src && src[phase] && src[phase][g]; if (!ps || !ps[L] || ps[L][i] == null) return null; return P0 ? (ps[P0] && ps[P0][i] != null ? rd(ps[L][i], ps[P0][i]) : null) : ps[L][i]; };
    const R = PGN.map(([g, n]) => ({g, n, v: get(G.pg, g), e: get(PGE.england, g), all: view === 'now' && ALL ? ALL.map((r) => r.pg && r.pg[phase] && r.pg[phase][g] && r.pg[phase][g][0] && r.pg[phase][g][0][i]).filter((v) => v != null) : []})).filter((r) => r.v != null);
    if (!R.length) { card.hidden = true; return; }
    $('gx-pg-s').textContent = `${cap(view === 'now' ? MEAS[meas].n : vname().replace(/between .*$/, 'since the autumn and spring terms 2018/19'))}. Every pupil group in its ${PH[phase]} is shown for the autumn and spring terms ${ay(L)}, with any group chosen above highlighted. ` + (view === 'now' ? `The faint marks are the other ${kind === 'a' ? 'local authorities' : 'counties'}. ` : '') + 'The DfE publishes these figures for local authorities and above, not for single schools.';
    const W = width(el), narrow = W < 560, rh = narrow ? 58 : 44, lab = narrow ? 0 : 250, m = {l: lab + 10, r: narrow ? 12 : 150, t: 8, b: 26}, H = m.t + R.length * rh + m.b, s = svg(el, W, H, 'Absence by pupil group');
    const allv = R.flatMap((r) => [r.v, r.e].concat(r.all)).filter((v) => v != null), x = d3.scaleLinear(d3.extent(allv), [m.l + 6, W - m.r - 6]).nice();
    x.ticks(narrow ? 4 : 7).forEach((t) => { s.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', GRID); s.append('text').attr('x', x(t)).attr('y', H - 8).attr('text-anchor', 'middle').text(view === 'now' ? (t / 100) + '%' : sign(t)); });
    R.forEach((r, k) => { const y = m.t + k * rh + (narrow ? 38 : rh / 2), col = r.e == null ? MUTED : AXc.gap(gap(r.v, r.e));
      if (r.g === pgsel) s.append('rect').attr('x', 0).attr('y', y - rh / 2 + (narrow ? -10 : 2)).attr('width', W).attr('height', rh - 4).attr('fill', '#F6F3EC');
      s.append('text').attr('x', narrow ? m.l - 6 : lab).attr('y', narrow ? y - 20 : y + 4).attr('text-anchor', narrow ? 'start' : 'end').attr('class', 'strong').text(r.n);
      s.append('g').selectAll('line').data(r.all).join('line').attr('x1', (v) => x(v)).attr('x2', (v) => x(v)).attr('y1', y - 7).attr('y2', y + 7).attr('stroke', SOFT).attr('stroke-opacity', 0.7);
      if (r.e != null) { s.append('line').attr('x1', x(r.e)).attr('x2', x(r.v)).attr('y1', y).attr('y2', y).attr('stroke', col).attr('stroke-width', 3); s.append('line').attr('x1', x(r.e)).attr('x2', x(r.e)).attr('y1', y - 11).attr('y2', y + 11).attr('stroke', MUTED).attr('stroke-width', 3); }
      s.append('path').attr('d', d3.symbol(d3.symbolDiamond, 110)()).attr('transform', `translate(${x(r.v)},${y})`).attr('fill', INK);
      s.append('text').attr('x', narrow ? W - m.r : W - m.r + 10).attr('y', narrow ? y - 20 : y + 4).attr('text-anchor', narrow ? 'end' : 'start').style('fill', col).text(fv(r.v) + (r.e == null || narrow ? '' : ' · England ' + fv(r.e))); });
    key(el, [`<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${esc(G.name)}`, `<i style="background:${MUTED};width:3px;height:14px"></i>England`, `<i style="background:${AXc.VERD}"></i>Lower than England`, `<i style="background:${AXc.RUST}"></i>Higher`].concat(view === 'now' ? [`<i style="background:${SOFT};width:2px;height:12px"></i>Other ${kind === 'a' ? 'local authorities' : 'counties'}`] : []));
    const f = R.find((r) => r.g === 'fsm'), nf = R.find((r) => r.g === 'nfsm'), eh = R.find((r) => r.g === 'ehcp'), ss = R.find((r) => r.g === 'sen'); let t = '';
    if (view === 'now' && f && nf) { const d = gap(f.v, nf.v), de = f.e != null && nf.e != null ? gap(f.e, nf.e) : null; t += `Pupils eligible for free school meals had ${MEAS[meas].n} of <b>${pc(f.v)}</b>, against <b>${pc(nf.v)}</b> for other pupils. That is a gap of <b>${pts(d)}</b> points` + (de == null ? '.' : `, against ${pts(de)} across England.`); }
    if (view === 'now' && (ss || eh)) t += ` For pupils with SEN support it was ${fv(ss && ss.v)} and for those with an education, health and care plan ${fv(eh && eh.v)}` + (ss && ss.e != null && eh && eh.e != null ? ` (England ${pc(ss.e)} and ${pc(eh.e)}).` : '.');
    if (view !== 'now' && f) t = `For pupils eligible for free school meals, ${MEAS[meas].n} ${f.v > 0 ? 'rose' : f.v < 0 ? 'fell' : 'did not change'}${f.v ? ' by <b>' + (Math.abs(f.v) / 100).toFixed(1) + '</b> points' : ''}` + (f.e == null ? '.' : `, against ${sign(f.e)} points across England.`) + (nf ? ` For other pupils the change was ${sign(nf.v)} points.` : '');
    $('gx-pg-r').innerHTML = t;
    // every group at once: overall, persistent and severe, with England beneath, and the change in a year in the chosen measure
    const P1 = prevP(), cellv = (g, k) => { const a = G.pg[phase] && G.pg[phase][g], en = PGE.england[phase] && PGE.england[phase][g], v = a && a[L] ? a[L][k] : null, ev = en && en[L] ? en[L][k] : null;
      return `<td class="n">${v == null ? '–' : `<span style="color:${ev == null ? 'inherit' : AXc.gap(gap(v, ev))}">${pc(v)}</span>`}<small>England ${pc(ev)}</small></td>`; };
    const chg = (g) => { const a = G.pg[phase] && G.pg[phase][g], k = i; return a && a[L] && a[P1] && a[L][k] != null && a[P1][k] != null ? sign(rd(a[L][k], a[P1][k])) : '–'; };
    $('gx-pgt').innerHTML = `<thead><tr><th>Pupils</th><th class="n">Overall</th><th class="n">Persistent</th><th class="n">Severe</th><th class="n">${cap(MEAS[meas].n.split(' ')[0])}, in a year</th></tr></thead><tbody>` + PGN.filter(([g]) => G.pg[phase] && G.pg[phase][g] && G.pg[phase][g][L]).map(([g, n]) =>
      `<tr${g === pgsel ? ' class="on"' : ''}><td>${n}</td>${cellv(g, 0)}${cellv(g, 1)}${cellv(g, 2)}<td class="n">${chg(g)}</td></tr>`).join('') + '</tbody>';
  }

  // ---- side by side: this place, up to four others of the same kind, and England
  // added places are slate lines told apart by dash and a number, never by extra hues
  const OTHERS = ['#33405A', '#55627A', '#33405A', '#55627A'], ODASH = ['7 3', '2 3', '10 3 2 3', '1 4'];
  function compare() {
    const card = $('gx-cmp-c'); card.hidden = !phase; if (!phase) return;
    const L = B.latest, P1 = prevP(), row = (name, b, col, me) => { const g = (p, i) => (b && b[p] ? b[p][i] : null), d = (a, c) => (a == null || c == null ? null : rd(a, c));
      return {name, col, me, abs: g(L, 0), pa: g(L, 2), sev: g(L, 4), yr: d(g(L, 0), g(P1, 0)), base: d(g(B.fy_last, 0), g(B.base, 0)), yrp: d(g(L, 2), g(P1, 2))}; };
    const rows = [row(G.name, G.bench[phase], INK, true)].concat(VS.map((o, i) => Object.assign(row(o.g.name, o.g.bench[phase], OTHERS[i % 4]), {tag: i + 1}))).concat([row('England', B.bench.E[phase], MUTED)]);
    const e = rows[rows.length - 1], cell = (v, ref, f) => (v == null ? '<td class="n">–</td>' : `<td class="n" style="color:${ref == null || v === ref ? 'inherit' : AXc.gap(v - ref)}">${f(v)}</td>`), sp = (v) => sign(v);
    $('gx-cmp-s').textContent = `${cap(PH[phase])}. Overall absence is the share of sessions (mornings and afternoons) that pupils missed. Persistent absence is the share of pupils who missed a tenth or more of their sessions, and severe absence the share who missed half or more. The first three columns are the autumn and spring terms ${ay(L)}. “In a year” is the change from the same two terms a year earlier, and “since 2018/19” the change between the full years ${ay(B.base)} and ${ay(B.fy_last)}, both in percentage points. A green figure is lower than England’s, a rust figure higher.`;
    $('gx-cmp').innerHTML = '<thead><tr><th>Place</th><th class="n">Overall absence</th><th class="n">Persistent absence</th><th class="n">Severe absence</th><th class="n">Overall, in a year</th><th class="n">Persistent, in a year</th><th class="n">Overall, since 2018/19</th></tr></thead><tbody>' + rows.map((r) =>
      `<tr><td>${r.tag ? '<span class="ax-num">' + r.tag + '</span>' : `<i class="ax-sw" style="background:${r.col}${r.me ? ';transform:rotate(45deg)' : ''}"></i>`}${r.me ? '<b>' + esc(r.name) + '</b>' : esc(r.name)}</td>${cell(r.abs, r === e ? null : e.abs, pc)}${cell(r.pa, r === e ? null : e.pa, pc)}${cell(r.sev, r === e ? null : e.sev, pc)}${cell(r.yr, r === e ? null : e.yr, sp)}${cell(r.yrp, r === e ? null : e.yrp, sp)}${cell(r.base, r === e ? null : e.base, sp)}</tr>`).join('') + '</tbody>';
    const c = $('gx-chips'); c.innerHTML = '';
    VS.forEach((o, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ax-chip'; b.innerHTML = `<span class="ax-num">${i + 1}</span>${esc(o.g.name)} <span aria-hidden="true">×</span>`; b.setAttribute('aria-label', 'Remove ' + o.g.name);
      b.addEventListener('click', () => { VS = VS.filter((x) => x.id !== o.id); draw(); }); c.appendChild(b); });
    $('gx-q2').disabled = VS.length >= 4; $('gx-q2').placeholder = VS.length >= 4 ? 'Four added' : 'Add ' + KINDA[kind];
  }

  let showAll = false, allPh = false;
  function table() {
    const t = $('gx-table'); t.innerHTML = '<thead><tr><th>School</th><th class="n">Overall absence</th><th class="n">Persistent absence</th></tr></thead>';
    const b = t.appendChild(document.createElement('tbody'));
    $('gx-more').hidden = true;
    if (kind === 'y') { $('gx-table-h').textContent = 'Its local authorities'; t.querySelector('th').textContent = 'Local authority';
      G.las.forEach((l) => { const v = l[2][phase]; const tr = b.appendChild(document.createElement('tr')); tr.innerHTML = `<td><a href="${AXsearch.ghref('a', l[0])}">${esc(l[1])}</a><small>${PH1[phase] || ''} schools, taken together</small></td><td class="n">${pc(v && v[0])}</td><td class="n">${pc(v && v[2])}</td>`; }); return; }
    const mine2 = G.schools.filter((s) => allPh || !phase || s[2] === phase), list = showAll ? mine2 : mine2.slice(0, 10);
    const pn = $('gx-table-n'); pn.hidden = !phase || mine2.length === G.schools.length && !allPh; pn.innerHTML = allPh ? `All ${G.schools.length} schools. <button type="button" class="ax-linkbtn">Show only its ${PH[phase]}</button>` : `Its ${count(mine2.length)} ${PH[phase]}. <button type="button" class="ax-linkbtn">Show all ${G.schools.length} schools</button>`;
    const lb = pn.querySelector('button'); if (lb) lb.onclick = () => { allPh = !allPh; showAll = false; table(); };
    if (mine2.length > 10) { const m = $('gx-more'); m.hidden = false; m.textContent = showAll ? 'Show the first 10' : `Show all ${mine2.length}`; m.onclick = () => { showAll = !showAll; table(); }; }
    list.forEach((s) => { const tr = b.appendChild(document.createElement('tr'));
      tr.innerHTML = `<td><a href="${AXsearch.href(s[0])}">${esc(s[1])}</a><small>${esc([PH1[s[2]], s[3], s[7] ? 'joined ' + month(s[7]) + (s[8] ? ' from ' + s[8] : '') : ''].filter(Boolean).join(' · '))}</small></td><td class="n">${pc(s[5])}</td><td class="n">${pc(s[6])}</td>`; });
  }

  function draw() {
    document.querySelectorAll('#gx-phase button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === phase)));
    document.querySelectorAll('#gx-meas button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === meas)));
    document.querySelectorAll('#gx-view button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === view)));
    document.querySelectorAll('#gx-pgs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.g === pgsel)));
    const p = new URLSearchParams({k: kind, id}); if (phase) p.set('phase', phase); if (meas !== 'abs') p.set('m', meas); if (view !== 'now') p.set('v', view); if (pgOn()) p.set('g', pgsel); if (VS.length) p.set('vs', VS.map((o) => o.id).join(','));
    history.replaceState(null, '', location.pathname + '?' + p.toString());      // always: a copied link must open this place
    head(); compare(); groups(); strip(); hist(); over(); table();
  }

  d3.json('/attendance/data/bench.json').then((j) => {
    B = j; const q = new URLSearchParams(location.search); kind = SH[q.get('k')] ? q.get('k') : 'c'; id = q.get('id') || '';
    AXsearch($('gx-q'), $('gx-list'), AXsearch.go, true, null, kind);
    $('gx-another').addEventListener('click', () => { location.href = '/attendance/group/?k=' + kind; });
    // which part of the Explorer this is: trusts stand apart; every other kind is an area
    const nv = document.querySelector(`.ax-nav a[data-v="${kind === 't' ? 'trusts' : 'areas'}"]`); if (nv) nv.setAttribute('aria-current', 'page');
    const ks = $('ax-kinds'); if (ks && kind !== 't') { ks.hidden = false; const a = ks.querySelector(`a[data-k="${kind}"]`); if (a) a.setAttribute('aria-current', 'page'); }
    // with no place chosen, open on one of that kind picked at random
    const pick = (list) => { random = true; id = list[Math.floor(Math.random() * list.length)]; };
    const start = id ? Promise.resolve() : kind === 'w' ? d3.json('/attendance/data/groups.json').then((g) => pick(g.data.id.filter((x, i) => g.data.k[i] === 'w' && g.data.n[i] >= 6)))
      : d3.json(`/attendance/data/grp/${kind}_all.json`).then((all) => pick(all.filter((r) => (r.P && r.P[0] >= 3) || (r.S && r.S[0] >= 3)).map((r) => r.id)));      // only places with a pooled figure
    return start.then(() => { const shard = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % SH[kind];
      return d3.json(`/attendance/data/grp/${kind}${shard}.json`); }).then((sh) => { G = sh[id];
      const extra = !G ? null : kind === 'w' ? (G.lad ? d3.json(`/attendance/data/geo/${G.lad}.json`).catch(() => null) : null) : d3.json(`/attendance/data/grp/${kind}_all.json`);
      return Promise.all([sh, extra]); }).then(([sh, all]) => { if (!G) { $('gx-name').textContent = 'Place not found'; $('gx-meta').textContent = 'No area or trust matches that address. Search for it by name below.'; return; }
      ALL = all; const phases = ['P', 'S', 'X'].filter((p) => G.bench[p] && G.bench[p][B.latest]);
      const pupils = (p) => d3.sum(G.schools.filter((s) => s[2] === p), (s) => s[4] || 0);
      phase = phases.includes(q.get('phase')) ? q.get('phase') : phases.slice().sort((a, b) => pupils(b) - pupils(a))[0] || null; if (MEAS[q.get('m')]) meas = q.get('m');
      $('gx-phase').innerHTML = phases.map((p) => `<button type="button" data-p="${p}">${PH1[p]}</button>`).join(''); $('gx-phase-f').hidden = phases.length < 2; $('gx-meas-f').hidden = false;
      $('gx-phase').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { phase = b.dataset.p; draw(); } });
      $('gx-meas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { meas = b.dataset.m; draw(); } });
      $('gx-view-f').hidden = false; if (VIEW[q.get('v')]) view = q.get('v');
      $('gx-view').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { view = b.dataset.v; draw(); } });
      AXsearch($('gx-q2'), $('gx-list2'), (r) => { if (r.id === id || VS.some((o) => o.id === r.id) || VS.length >= 4) return; rec(kind, r.id).then((g) => { if (g) { VS.push({id: r.id, g}); random = false; draw(); } }); }, true, kind);
      const want = (q.get('vs') || '').split(',').filter((x) => x && x !== id).slice(0, 4);
      Promise.all(want.map((x) => rec(kind, x).then((g) => (g ? {id: x, g} : null)))).then((o) => { VS = o.filter(Boolean); if (VS.length) draw(); });
      if (G.pg) { $('gx-pg-f').hidden = false; if (PGL[q.get('g')]) pgsel = q.get('g');
        $('gx-pgs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { pgsel = b.dataset.g; draw(); } });
        d3.json('/attendance/data/pg.json').then((j) => { PGE = j; draw(); }); }
      $('gx-body').hidden = false; draw();
      let w = innerWidth; addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; draw(); } });
    });
  }).catch((e) => { console.error(e); $('gx-meta').textContent = 'The data could not be loaded. Please try again shortly.'; });
})();
