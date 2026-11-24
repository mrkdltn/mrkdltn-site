/* Attendance Explorer: one school, from the DfE's termly and full-year absence statistics.
   Data: bench.json (England and local authority by phase and period), sch/<urn % shards>.json (one school's history),
   dist_<phase>.json (every school of the phase, newest period). Rates are hundredths of a percentage point.
   A school's values per period: [enrolments, overall, unauthorised, persistent absence, illness, unauthorised holiday];
   benchmarks: [overall, unauthorised, persistent absence]. Nothing animates. */
(function () {
  const INK = '#0B1A2E', MUTED = '#55627A', VERD = '#2F6F66', GRID = '#EEF1F5', SOFT = '#C9D0DB';
  // added schools are slate lines told apart by dash and a number, never by extra hues
  const OTHERS = ['#33405A', '#55627A', '#33405A', '#55627A'], ODASH = ['7 3', '2 3', '10 3 2 3', '1 4'];
  const GRADES = [['Exceptional', '#0176E0', '#fff'], ['Strong standard', '#33903C', '#fff'], ['Expected standard', '#5CD168', '#0B1A2E'], ['Needs attention', '#FF8341', '#0B1A2E'], ['Urgent improvement', '#CE1E02', '#fff']];
  const PH = {P: 'primary schools', S: 'secondary schools', X: 'special schools'};
  const MEAS = {abs: {i: 1, b: 0, n: 'overall absence', step: 25}, pa: {i: 3, b: 2, n: 'persistent absence', step: 100}};
  const $ = (id) => document.getElementById(id);
  const pc = (v, dp) => (v == null ? '–' : (v / 100).toFixed(dp == null ? 1 : dp) + '%');
  const gap = (a, b) => Math.round(a / 10) - Math.round(b / 10);
  const pts = (t) => (Math.abs(t) / 10).toFixed(1);
  const ay = (p) => { const y = +p.slice(0, 4); return y + '/' + String((y + 1) % 100).padStart(2, '0'); };
  const period = (p) => (p.endsWith('AS') ? 'autumn and spring terms ' + ay(p) : ay(p));
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

  let B, S, urn, meas = 'abs', vs = [], dist = null, random = false;
  const shards = new Map(), dists = new Map();
  const school = (u) => { const k = (+u) % B.shards; if (!shards.has(k)) shards.set(k, d3.json('/attendance/data/sch/' + k + '.json')); return shards.get(k).then((j) => j[u] || null); };
  const getDist = (ph) => { if (!dists.has(ph)) dists.set(ph, d3.json('/attendance/data/dist_' + ph + '.json')); return dists.get(ph); };
  const bench = (area, ph, p) => (B.bench[area] && B.bench[area][ph] && B.bench[area][ph][p]) || null;

  function head() {
    const L = B.latest, prevP = B.periods.filter((p) => p.endsWith('AS') && p < L).pop(), now = S.h[L], was = prevP && S.h[prevP];
    const la = B.la_names[S.la] || '', e = bench('E', S.ph, L), l = bench(S.la, S.ph, L);
    $('sx-name').textContent = S.n;
    if (window.AXtools) AXtools.setPlace({kind: 'school', id: urn, name: S.n, href: AXsearch.href(urn)});
    $('sx-hint').hidden = !random;
    const link = (t, k, id) => (id ? `<a href="${AXsearch.ghref(k, id)}">${esc(t)}</a>` : esc(t));
    $('sx-meta').innerHTML = [esc(PH[S.ph].replace(/s$/, '').replace(/^./, (c) => c.toUpperCase())), esc(S.town), esc(la), S.trust ? link(S.tname || S.trust, 't', S.multi ? S.tid : '') + (S.tj ? esc(', joined ' + month(S.tj) + (S.tprev ? ' from ' + S.tprev : '')) : '') : '', S.pcon ? link(S.pcon + ' constituency', 'c', S.pc_code) : ''].filter(Boolean).join(' · ');
    document.title = S.n + ': attendance · Attendance Explorer · Mark Dalton';
    $('sx-period').textContent = 'The ' + period(L);
    $('sx-phase-n').textContent = PH[S.ph]; $('sx-base-n').textContent = ay(B.base) + ' and ' + ay(B.fy_last);
    $('sx-src').textContent = `“${B.release.autumn_spring.title}” (${B.release.autumn_spring.release}, published ${date(B.release.autumn_spring.published)}) and “${B.release.full_year.title}” (${B.release.full_year.release}, published ${date(B.release.full_year.published)})`;
    const R = $('sx-reading'), K = $('sx-kpis');
    if (!now) { R.textContent = `No rate is shown for this school for the ${period(L)}: it had fewer than ${B.min_enrol} pupils on roll, or no figures were published.`; K.innerHTML = ''; }
    else {
      let t = `Pupils at ${esc(S.n)} missed <b>${pc(now[1])}</b> of sessions in the ${period(L)}`;
      if (was) { const d = gap(now[1], was[1]); t += d === 0 ? `, the same as in the same two terms a year earlier` : `, <b>${pts(d)}</b> points ${d < 0 ? 'lower' : 'higher'} than in the same two terms a year earlier (${pc(was[1])})`; }
      t += '.';
      if (e) { const d = gap(now[1], e[0]); t += ` Across England’s ${PH[S.ph]} the figure was ${pc(e[0])}` + (d === 0 ? '.' : `, so absence here was ${pts(d)} points ${d < 0 ? 'lower' : 'higher'}.`); }
      t += ` <b>${pc(now[3])}</b> of pupils were persistently absent, missing a tenth or more of their sessions` + (e ? `; in England’s ${PH[S.ph]} it was ${pc(e[2])}.` : '.');
      R.innerHTML = t + '<span class="ax-pills">' + (was ? AXc.pill(gap(now[1], was[1]), 'a year earlier', true) : '') + (e ? AXc.pill(gap(now[1], e[0]), 'England', true) : '') + (l ? AXc.pill(gap(now[1], l[0]), la, true) : '') + '</span>';
      const k = [['Overall absence', pc(now[1]), was ? 'a year earlier ' + pc(was[1]) : ''], ['Persistent absence', pc(now[3]), was ? 'a year earlier ' + pc(was[3]) : ''],
        ['Unauthorised absence', pc(now[2]), e ? 'England ' + pc(e[1]) : ''], [la + ' ' + PH[S.ph], l ? pc(l[0]) : '–', l ? 'persistent ' + pc(l[2]) : ''], ['England ' + PH[S.ph], e ? pc(e[0]) : '–', e ? 'persistent ' + pc(e[2]) : '']];
      K.innerHTML = k.map((x) => `<div class="ax-kpi"><div class="k">${esc(x[0])}</div><div class="v">${x[1]}</div><div class="d">${x[2] || '&nbsp;'}</div></div>`).join('');
    }
    const O = $('sx-ofsted');
    if (S.g) { const g = GRADES[S.g[0]]; O.innerHTML = `Ofsted graded attendance and behaviour <span class="ax-grade"><i style="background:${g[1]}"></i>${g[0]}</span>` + (S.g[1] ? ` at the inspection of ${date(S.g[1])}.` : '.') + ` <a href="/explorer/school/${urn}/">See the full report card in the Ofsted Explorer</a>.`; O.hidden = false; }
    else { O.hidden = true; O.innerHTML = ''; }
  }

  let names = null;
  // the school beside England, its local authority and the 20 schools most like it. No expected rate is given.
  function readings() {
    const card = $('sx-read-c'), el = $('sx-read'), M = MEAS[meas], L = B.latest, now = S.h[L]; card.hidden = !(now && S.sim); if (card.hidden) return;
    const mine = now[M.i], e = bench('E', S.ph, L), l = bench(S.la, S.ph, L);
    const rows = [['England ' + PH[S.ph], e && e[M.b]], [(B.la_names[S.la] || 'Local authority') + ' ' + PH[S.ph], l && l[M.b]], ['The 20 similar schools', S.sim[M.b], true]].filter((r) => r[1] != null);
    const W = width(el), narrow = W < 560, rh = narrow ? 62 : 46, lab = narrow ? 0 : 250, m = {l: lab + 8, r: narrow ? 12 : 200, t: 8, b: 26}, H = m.t + rows.length * rh + m.b, s = svg(el, W, H, 'The school beside three comparisons');
    const all = rows.map((r) => r[1]).concat([mine]), pad = (d3.max(all) - d3.min(all)) * 0.15 + 30;
    const x = d3.scaleLinear([Math.max(0, d3.min(all) - pad), d3.max(all) + pad], [m.l, W - m.r]);
    x.ticks(narrow ? 4 : 6).forEach((t) => { s.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', GRID); s.append('text').attr('x', x(t)).attr('y', H - 8).attr('text-anchor', 'middle').text((t / 100) + '%'); });
    rows.forEach((r, i) => { const y = m.t + i * rh + (narrow ? 40 : rh / 2), g = gap(mine, r[1]), col = AXc.gap(g);
      s.append('text').attr('x', narrow ? m.l : lab).attr('y', narrow ? y - 22 : y + 4).attr('text-anchor', narrow ? 'start' : 'end').attr('class', 'strong').text(r[0] + (narrow ? ': ' + pc(r[1]) : ''));
      s.append('line').attr('x1', x(r[1])).attr('x2', x(mine)).attr('y1', y).attr('y2', y).attr('stroke', col).attr('stroke-width', 3);
      s.append('line').attr('x1', x(r[1])).attr('x2', x(r[1])).attr('y1', y - 11).attr('y2', y + 11).attr('stroke', MUTED).attr('stroke-width', 3);      // comparisons are slate; green and rust mean direction only (Mark, 24 November)
      s.append('path').attr('d', d3.symbol(d3.symbolDiamond, 110)()).attr('transform', `translate(${x(mine)},${y})`).attr('fill', INK);
      s.append('text').attr('x', narrow ? W - m.r : W - m.r + 10).attr('y', narrow ? y - 22 : y + 4).attr('text-anchor', narrow ? 'end' : 'start').style('fill', col).text(narrow ? (g === 0 ? 'same' : (g < 0 ? '−' : '+') + pts(g)) : pc(r[1]) + ' · ' + (g === 0 ? 'the same' : pts(g) + ' points ' + (g < 0 ? 'lower' : 'higher'))); });
    key(el, [`<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${esc(S.n)}, ${pc(mine)}`, `<i style="background:${MUTED};width:3px;height:14px"></i>The comparison`, `<i style="background:${AXc.VERD}"></i>Lower absence here`, `<i style="background:${AXc.RUST}"></i>Higher`]);
    const gs = gap(mine, S.sim[M.b]);
    $('sx-read-r').innerHTML = `Across the 20 schools most like it, ${M.n} was <b>${pc(S.sim[M.b])}</b>. The school’s ${pc(mine)} is ` + (gs === 0 ? 'the same.' : `<b>${pts(gs)}</b> points ${gs < 0 ? 'lower' : 'higher'}.`) + (now[0] < 200 ? ` With ${now[0]} pupils on roll, one pupil is about ${(100 / now[0]).toFixed(1)} points of persistent absence, so small gaps mean little.` : '');
    const c = S.ctx; $('sx-ctx').textContent = c ? `Its circumstances, January 2026 census: ${c[4].toLocaleString('en-GB')} pupils; ${c[0].toFixed(1)}% eligible for free school meals; ${c[2].toFixed(1)}% with SEN support; ${c[3].toFixed(1)}% with an education, health and care plan; ${c[1].toFixed(1)}% with a first language other than English; ${c[5] ? 'rural' : 'urban'}.` : '';
    const ul = $('sx-sim'), fill = () => { ul.innerHTML = S.nn.map((u) => names.get(u)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)).map((r) => `<li><a href="${AXsearch.href(r.urn)}">${esc(r.name)}</a> <small>${esc(r.town)}</small></li>`).join(''); };
    ul.innerHTML = ''; $('sx-sim-d').ontoggle = () => { if (!$('sx-sim-d').open) return; if (names) { fill(); return; } ul.textContent = 'Loading…';
      d3.json('/attendance/data/schools.json').then((j) => { names = new Map(j.data.urn.map((u, i) => [u, {urn: u, name: j.data.name[i], town: j.data.town[i]}])); fill(); }); };
    if ($('sx-sim-d').open) $('sx-sim-d').ontoggle();
  }

  // histogram of a distribution with this school marked and its local authority's schools as ticks beneath
  function strip(el, values, mine, ticks, step, label, fmtTick, zero) {
    const W = width(el), H = Math.round(Math.min(300, Math.max(200, W * 0.34))), m = {t: 26, r: 14, b: 44, l: 14};
    const v = values.filter((x) => x != null).sort(d3.ascending), lo = Math.floor(d3.quantile(v, 0.005) / step) * step, hi = Math.ceil(d3.quantile(v, 0.995) / step) * step;
    const clamp = (x) => Math.max(lo, Math.min(hi - 1e-6, x));
    const bins = d3.bin().domain([lo, hi]).thresholds(d3.range(lo, hi, step))(v.map(clamp));
    const s = svg(el, W, H, label), x = d3.scaleLinear([lo, hi], [m.l, W - m.r]), y = d3.scaleLinear([0, d3.max(bins, (b) => b.length)], [H - m.b, m.t]);
    s.append('g').selectAll('rect').data(bins).join('rect').attr('x', (b) => x(b.x0) + 0.5).attr('width', (b) => Math.max(0, x(b.x1) - x(b.x0) - 1)).attr('y', (b) => y(b.length)).attr('height', (b) => y(0) - y(b.length)).attr('fill', SOFT);
    s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', MUTED);
    x.ticks(W < 480 ? 5 : 9).forEach((t) => s.append('text').attr('x', x(t)).attr('y', H - 6).attr('text-anchor', 'middle').text(fmtTick(t)));
    if (zero) s.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t).attr('y2', y(0)).attr('stroke', MUTED).attr('stroke-dasharray', '3 3');
    s.append('g').selectAll('line').data(ticks.filter((t) => t != null)).join('line').attr('x1', (t) => x(clamp(t))).attr('x2', (t) => x(clamp(t))).attr('y1', y(0) + 4).attr('y2', y(0) + 14).attr('stroke', MUTED).attr('stroke-width', 1.5).attr('stroke-opacity', 0.75);
    if (mine != null) { const cx = x(clamp(mine));
      s.append('line').attr('x1', cx).attr('x2', cx).attr('y1', m.t - 4).attr('y2', y(0)).attr('stroke', INK).attr('stroke-width', 1.5);
      s.append('path').attr('d', d3.symbol(d3.symbolDiamond, 130)()).attr('transform', `translate(${cx},${m.t - 8})`).attr('fill', INK);
      s.append('text').attr('class', 'strong').attr('x', cx + (cx > W * 0.7 ? -12 : 12)).attr('y', m.t - 4).attr('text-anchor', cx > W * 0.7 ? 'end' : 'start').text(fmtTick(mine, true)); }
    return v;
  }

  function position() {
    const el = $('sx-dist'), M = MEAS[meas], now = S.h[B.latest];
    document.querySelectorAll('.sx-meas button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === meas)));
    document.querySelectorAll('.sx-meas-n').forEach((n) => { n.textContent = M.n + ' in the ' + period(B.latest); });
    if (!dist) return;
    const laIx = dist.la[dist.urn.indexOf(+urn)], ticks = dist[meas].filter((v, i) => dist.la[i] === laIx && dist.urn[i] !== +urn);
    const mine = now ? now[M.i] : null;
    const v = strip(el, dist[meas], mine, laIx == null ? [] : ticks, M.step, 'Distribution of ' + M.n + ' across ' + PH[S.ph], (t, own) => (own ? pc(t) : (t / 100) + '%'));
    key(el, [`<i style="background:${SOFT}"></i>All ${PH[S.ph]} in England (${v.length.toLocaleString('en-GB')})`, `<i style="background:${MUTED};width:2px;height:12px"></i>Others in ${esc(B.la_names[S.la] || 'the local authority')} (${ticks.length})`, `<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${esc(S.n)}`]);
    if (mine == null) { $('sx-dist-r').textContent = ''; return; }
    const lower = d3.bisectLeft(v, mine), share = Math.round(100 * (v.length - d3.bisectRight(v, mine)) / v.length), below = Math.round(100 * lower / v.length);
    const med = d3.median(v);
    $('sx-dist-r').innerHTML = `${M.n.replace(/^./, (c) => c.toUpperCase())} here was <b>${pc(mine)}</b>. The middle school of this phase had ${pc(med)}; <b>${share}%</b> of ${PH[S.ph]} had a higher rate and <b>${below}%</b> a lower one.`;
  }

  // (named yearChart, not history: a function called history hides the browser's own and breaks every address change)
  function yearChart(others) {
    const el = $('sx-hist'), M = MEAS[meas], W = width(el), H = Math.round(Math.min(380, Math.max(240, W * 0.5))), m = {t: 14, r: 16, b: 30, l: 42};
    const yrs = d3.range(+B.fy[0], +B.fy_last + 1).map(String), s = svg(el, W, H, M.n + ' by school year');
    const ser = (h, i) => yrs.map((p) => ({p, v: h[p] ? h[p][i] : null}));
    const lines = [{d: yrs.map((p) => ({p, v: (bench('E', S.ph, p) || [])[M.b]})), c: MUTED, w: 2, n: 'England ' + PH[S.ph]},
      {d: yrs.map((p) => ({p, v: (bench(S.la, S.ph, p) || [])[M.b]})), c: MUTED, w: 2, dash: '2 3', n: (B.la_names[S.la] || 'Local authority') + ' ' + PH[S.ph]}]
      .concat(others.map((o, i) => ({d: ser(o.s.h, M.i), c: OTHERS[i % 4], w: 2, n: o.s.n, dash: ODASH[i % 4], tag: i + 1})), [{d: ser(S.h, M.i), c: INK, w: 3, n: S.n, me: true}]);
    const vals = lines.flatMap((l) => l.d.map((p) => p.v)).filter((v) => v != null); if (!vals.length) { el.textContent = 'No full-year figures are published for this school yet.'; $('sx-hist-r').textContent = ''; return; }
    const x = d3.scalePoint(yrs, [m.l + 8, W - m.r - 8]), y = d3.scaleLinear([others.length ? d3.min(vals) * 0.85 : 0, d3.max(vals) * 1.08], [H - m.b, m.t]).nice(5);      // with places added, the axis closes in so the lines separate
    y.ticks(5).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID); s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
    const gx = x('2019'); s.append('rect').attr('x', gx - x.step() * 0.38).attr('width', x.step() * 0.76).attr('y', m.t).attr('height', H - m.b - m.t).attr('fill', '#F4F5F8');
    s.append('text').attr('x', gx).attr('y', m.t + 12).attr('text-anchor', 'middle').text(W < 520 ? 'none' : 'not published');
    yrs.forEach((p, i) => { if (W >= 640 || i % 2 === 0) s.append('text').attr('x', x(p)).attr('y', H - 8).attr('text-anchor', 'middle').text(W < 640 ? "'" + ay(p).slice(2) : ay(p)); });
    const line = d3.line().defined((p) => p.v != null).x((p) => x(p.p)).y((p) => y(p.v));
    lines.forEach((l) => { if (l.tag) { const z = l.d.filter((p) => p.v != null).pop(); if (z) s.append('text').attr('class', 'strong ax-tag').attr('x', x(z.p) + 7).attr('y', y(z.v) + 4).text(l.tag); }
      s.append('path').attr('d', line(l.d)).attr('fill', 'none').attr('stroke', l.c).attr('stroke-width', l.w).attr('stroke-dasharray', l.dash || null).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
      const pt = s.append('g').selectAll('circle').data(l.d.filter((p) => p.v != null)).join('circle').attr('cx', (p) => x(p.p)).attr('cy', (p) => y(p.v)).attr('r', l.me ? 3.5 : 8).attr('fill', l.me ? l.c : 'transparent');
      tipOn(pt, (p) => `<b>${esc(l.n)}</b><br>${ay(p.p)}: ${M.n} ${pc(p.v)}`); });
    const ty = S.tj ? String(+S.tj.slice(0, 4) - (S.tj.slice(5) < '09' ? 1 : 0)) : null;      // the school year in which it joined its trust
    if (ty && x(ty) != null) { const tx = x(ty) - x.step() / 2 + (S.join === ty ? 3 : 0); s.append('line').attr('x1', tx).attr('x2', tx).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', '#C9A24B').attr('stroke-width', 2);
      s.append('text').attr('x', tx > W * 0.6 ? tx - 5 : tx + 5).attr('text-anchor', tx > W * 0.6 ? 'end' : 'start').attr('y', H - m.b - 6).attr('class', 'strong').text(W < 520 ? 'Joined trust' : 'Joined ' + (S.tname || 'its trust').slice(0, 34)); }
    if (S.join && x(S.join) != null) { const jx = x(S.join) - x.step() / 2; s.append('line').attr('x1', jx).attr('x2', jx).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', '#C9A24B').attr('stroke-width', 1.5).attr('stroke-dasharray', '2 3'); }
    { const tg = s.selectAll('text.ax-tag').nodes().map((n) => ({n, y: +n.getAttribute('y')})).sort((a, b) => a.y - b.y); tg.forEach((t, i) => { if (i && t.y - tg[i - 1].y < 14) t.y = tg[i - 1].y + 14; t.n.setAttribute('y', t.y); }); }      // keep the numbers at the line ends apart
    key(el, lines.slice().reverse().map((l) => `<i class="ln" style="border-color:${l.c}${l.dash ? ';border-top-style:dashed' : ''}"></i>${l.tag ? l.tag + ' ' : ''}${esc(l.n)}`).concat(S.join ? ['<i class="ln" style="border-color:#C9A24B;border-top-style:dotted"></i>Earlier years are the predecessor school'] : [], ty && x(ty) != null ? [`<i class="ln" style="border-color:#C9A24B"></i>Joined ${esc(S.tname || 'its trust')}, ${month(S.tj)}` + (S.tprev ? `, from ${esc(S.tprev)}` : '')] : []));
    const a = S.h[B.base], b = S.h[B.fy_last]; let t = '';
    if (b) { t = `In ${ay(B.fy_last)}, ${M.n} was <b>${pc(b[M.i])}</b>`; if (a) { const d = gap(b[M.i], a[M.i]); t += d === 0 ? `, the same as in ${ay(B.base)}, the last full year before the pandemic.` : `, <b>${pts(d)}</b> points ${d < 0 ? 'lower' : 'higher'} than in ${ay(B.base)}, the last full year before the pandemic (${pc(a[M.i])}).`; } else t += '.'; }
    $('sx-hist-r').innerHTML = t;
  }

  function changed() {
    const el = $('sx-chg'); if (!dist) return;
    const a = S.h[B.base], b = S.h[B.fy_last], mine = a && b ? b[1] - a[1] : null;
    const laIx = dist.la[dist.urn.indexOf(+urn)], ticks = dist.chg.filter((v, i) => dist.la[i] === laIx && dist.urn[i] !== +urn);
    const v = strip(el, dist.chg, mine, ticks, 25, 'Change in overall absence since ' + ay(B.base), (t, own) => (t > 0 ? '+' : t < 0 ? '−' : '') + (Math.abs(t) / 100).toFixed(own ? 1 : (Math.abs(t) % 100 ? 1 : 0)) + (own ? ' points' : ''), true);
    key(el, [`<i style="background:${SOFT}"></i>${PH[S.ph].replace(/^./, (c) => c.toUpperCase())} with figures for both years (${v.length.toLocaleString('en-GB')})`, `<i style="background:${MUTED};width:2px;height:12px"></i>Others in the local authority`]);
    const med = d3.median(v), up = Math.round(100 * v.filter((x) => x > 0).length / v.length);
    $('sx-chg-r').innerHTML = (mine == null ? `This school has no figures for both years, so it is not marked. ` : `Overall absence here ${gap(b[1], a[1]) === 0 ? 'was unchanged' : (mine > 0 ? 'rose' : 'fell') + ` by <b>${pts(gap(b[1], a[1]))}</b> points`} between ${ay(B.base)} and ${ay(B.fy_last)}. `)
      + `Absence was higher in ${ay(B.fy_last)} than in ${ay(B.base)} at <b>${up}%</b> of ${PH[S.ph]}; the middle school rose by ${(med / 100).toFixed(1)} points.`;
  }

  function chips(others) {
    const c = $('sx-chips'); c.innerHTML = '';
    others.forEach((o, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ax-chip'; b.innerHTML = `<span class="ax-num">${i + 1}</span>${esc(o.s.n)} <span aria-hidden="true">×</span>`; b.setAttribute('aria-label', 'Remove ' + o.s.n);
      b.addEventListener('click', () => { vs = vs.filter((u) => u !== o.u); go(); }); c.appendChild(b); });
    $('sx-q2').disabled = vs.length >= 4; $('sx-q2').placeholder = vs.length >= 4 ? 'Four schools added' : 'Add a school';
  }

  // side by side: this school, any added, its local authority and England, set out as on area and trust pages
  function side(others) {
    const L = B.latest, P1 = B.periods.filter((p) => p.endsWith('AS') && p < L).pop(), d = (a, b) => (a == null || b == null ? null : a - b), sg = (v) => { const t = Math.round(v / 10); return (t > 0 ? '+' : t < 0 ? '−' : '') + (Math.abs(t) / 10).toFixed(1); };
    const sch = (name, h, col, me) => { const g = (p, i) => (h && h[p] ? h[p][i] : null); return {name, col, me, abs: g(L, 1), pa: g(L, 3), yr: d(g(L, 1), g(P1, 1)), yrp: d(g(L, 3), g(P1, 3)), base: d(g(B.fy_last, 1), g(B.base, 1))}; };
    const grp = (name, a) => { const g = (p, i) => (bench(a, S.ph, p) || [])[i]; return {name, col: MUTED, ref: true, abs: g(L, 0), pa: g(L, 2), yr: d(g(L, 0), g(P1, 0)), yrp: d(g(L, 2), g(P1, 2)), base: d(g(B.fy_last, 0), g(B.base, 0))}; };
    const rows = [sch(S.n, S.h, INK, true)].concat(others.map((o, i) => Object.assign(sch(o.s.n, o.s.h, OTHERS[i % 4]), {tag: i + 1}))).concat([grp((B.la_names[S.la] || 'Local authority') + ' ' + PH[S.ph], S.la), grp('England ' + PH[S.ph], 'E')]);
    const e = rows[rows.length - 1], cell = (v, ref, f, r) => (v == null ? '<td class="n">–</td>' : `<td class="n">${f(v)}</td>`);      // no green or rust on a named school's figures (Mark, 23 November)
    $('sx-cmp-s').textContent = `The first two columns are the autumn and spring terms ${ay(L)}; “in a year” compares them with the same two terms a year earlier; “since 2018/19” compares full years ${ay(B.base)} and ${ay(B.fy_last)}.`;
    $('sx-cmp').innerHTML = '<thead><tr><th>School</th><th class="n">Overall absence</th><th class="n">Persistent absence</th><th class="n">Overall, in a year</th><th class="n">Persistent, in a year</th><th class="n">Overall, since 2018/19</th></tr></thead><tbody>' + rows.map((r) =>
      `<tr><td>${r.tag ? '<span class="ax-num">' + r.tag + '</span>' : `<i class="ax-sw" style="background:${r.col}${r.me ? ';transform:rotate(45deg)' : ''}"></i>`}${r.me ? '<b>' + esc(r.name) + '</b>' : esc(r.name)}</td>${cell(r.abs, e.abs, pc, r)}${cell(r.pa, e.pa, pc, r)}${cell(r.yr, e.yr, sg, r)}${cell(r.yrp, e.yrp, sg, r)}${cell(r.base, e.base, sg, r)}</tr>`).join('') + '</tbody>';
  }

  let token = 0;
  function draw() {
    const t = ++token;
    Promise.all(vs.map((u) => school(u).then((s) => (s ? {u, s} : null)))).then((o) => { if (t !== token) return; const others = o.filter(Boolean);
      head(); side(others); readings(); position(); yearChart(others); changed(); chips(others); });
  }
  function go() { random = false; const h = vs.length ? '#vs=' + vs.join(',') : ''; history.replaceState(null, '', AXsearch.href(urn, h)); draw(); }
  function open(u, push) {
    school(u).then((s) => { if (!s) { $('sx-name').textContent = 'School not found'; $('sx-meta').textContent = 'No school with that number appears in the newest release. It may have closed or changed. Search for it by name below.'; $('sx-body').hidden = true; return; }
      urn = String(u); S = s; if (push) random = false;
      // the address always names the school on screen, so a copied link opens the same school for the next person
      if (!push) history.replaceState(null, '', AXsearch.href(urn, vs.length ? '#vs=' + vs.join(',') : '')); vs = vs.filter((x) => x !== urn); $('sx-body').hidden = false; dist = null;
      if (push) history.pushState(null, '', AXsearch.href(urn, vs.length ? '#vs=' + vs.join(',') : ''));
      draw(); getDist(S.ph).then((d) => { if (urn === String(u)) { dist = d; position(); changed(); } }); });
  }

  d3.json('/attendance/data/bench.json').then((j) => {
    B = j; const u = AXsearch.urn();
    vs = (new URLSearchParams(location.hash.slice(1)).get('vs') || '').split(',').filter((x) => /^\d{5,7}$/.test(x)).slice(0, 4);
    AXsearch($('sx-q'), $('sx-list'), (r) => { if (r.kind) { AXsearch.go(r); return; } open(r.urn, true); scrollTo({top: 0}); }, true);
    AXsearch($('sx-q2'), $('sx-list2'), (r) => { const k = String(r.urn); if (k !== urn && !vs.includes(k) && vs.length < 4) { vs.push(k); go(); } });
    document.querySelector('.sx-meas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { meas = b.dataset.m; draw(); } });
    let w = innerWidth; addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; if (S) draw(); } });
    addEventListener('popstate', () => { const p = AXsearch.urn(); if (p) open(p, false); });
    // with no school chosen, open on a secondary picked at random, as the Ofsted Explorer does; the address stays unchanged until someone chooses
    const another = () => getDist('S').then((d) => { random = true; vs = []; open(d.urn[Math.floor(Math.random() * d.urn.length)], false); });
    $('sx-another').addEventListener('click', another);
    if (u) open(u, false); else another();
  }).catch((e) => { console.error(e); $('sx-meta').textContent = 'The school data could not be loaded. Please try again shortly.'; });
})();
