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
  const MEAS = {abs: {b: 0, s: 5, o: 2, n: 'overall absence'}, pa: {b: 2, s: 6, o: 4, n: 'persistent absence'}};
  const KIND = {t: 'Trust', c: 'Parliamentary constituency', w: 'Ward', y: 'Ceremonial county'}, KINDS = {t: 'Trusts', c: 'Constituencies', w: 'Wards', y: 'Counties'}, SH = {t: 16, c: 16, w: 64, y: 1};
  const $ = (id) => document.getElementById(id);
  const pc = (v, dp) => (v == null ? '–' : (v / 100).toFixed(dp == null ? 1 : dp) + '%');
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

  let B, G, ALL, kind, id, phase, meas = 'abs', random = false;
  const eng = (ph, p) => (B.bench.E[ph] && B.bench.E[ph][p]) || null;
  const mine = (p) => (G.bench[phase] && G.bench[phase][p]) || null;
  const of = () => (kind === 't' ? 'of ' + G.name : 'in ' + G.name);

  function head() {
    const L = B.latest, prevP = B.periods.filter((p) => p.endsWith('AS') && p < L).pop();
    $('gx-kind').textContent = KINDS[kind];
    if (window.AXtools) AXtools.setPlace({kind: 'group', id: kind + ':' + id, name: G.name, href: AXsearch.ghref(kind, id)});
    $('gx-name').textContent = G.name; document.title = G.name + ': attendance · Attendance Explorer · Mark Dalton';
    const by = d3.rollup(G.schools, (v) => v.length, (s) => s[2]);
    $('gx-meta').textContent = (random ? 'Chosen at random to start you off. ' : '') + KIND[kind] + ' · ' + (kind === 'y' ? G.n.toLocaleString('en-GB') + ' schools in ' + count(G.las.length) + (G.las.length === 1 ? ' local authority' : ' local authorities') : '') + ['P', 'S', 'X'].filter((p) => by.get(p)).map((p) => by.get(p) + ' ' + (by.get(p) === 1 ? PH[p].replace(/s$/, '') : PH[p])).join(', ');
    $('gx-period').textContent = 'The ' + period(L); $('gx-table-p').textContent = period(L);
    $('gx-src').textContent = `“${B.release.autumn_spring.title}” (published ${date(B.release.autumn_spring.published)}) and “${B.release.full_year.title}” (published ${date(B.release.full_year.published)})`;
    const R = $('gx-reading'), K = $('gx-kpis'), now = phase && mine(L), was = phase && prevP && mine(prevP), e = phase && eng(phase, L);
    if (!now) { K.innerHTML = '';
      R.textContent = kind === 't' && !G.pooled ? `${G.name} has ${count(G.n)} schools. Pooled figures are given for trusts with five or more, so its schools are listed below without one.`
        : `There are too few schools of one phase here for a pooled figure, so the schools are listed below without one.`; return; }
    let t = `Across the ${count(now[3])} ${PH[phase]} ${of()}, pupils missed <b>${pc(now[0])}</b> of sessions in the ${period(L)}`;
    if (was) { const d = gap(now[0], was[0]); t += d === 0 ? ', the same as in the same two terms a year earlier' : `, <b>${pts(d)}</b> points ${d < 0 ? 'lower' : 'higher'} than in the same two terms a year earlier (${pc(was[0])})`; }
    t += '.'; if (e) { const d = gap(now[0], e[0]); t += ` Across England’s ${PH[phase]} the figure was ${pc(e[0])}` + (d === 0 ? '.' : `, so absence here was ${pts(d)} points ${d < 0 ? 'lower' : 'higher'}.`); }
    t += ` <b>${pc(now[2])}</b> of pupils were persistently absent` + (e ? `, against ${pc(e[2])} across England.` : '.');
    R.innerHTML = t + '<span class="ax-pills">' + (was ? AXc.pill(gap(now[0], was[0]), 'a year earlier') : '') + (e ? AXc.pill(gap(now[0], e[0]), 'England') : '') + '</span>';
    const k = [['Overall absence', pc(now[0]), was ? 'a year earlier ' + pc(was[0]) : ''], ['Persistent absence', pc(now[2]), was ? 'a year earlier ' + pc(was[2]) : ''], ['Unauthorised absence', pc(now[1]), e ? 'England ' + pc(e[1]) : ''], ['England ' + PH[phase], e ? pc(e[0]) : '–', e ? 'persistent ' + pc(e[2]) : '']];
    K.innerHTML = k.map((x) => `<div class="ax-kpi"><div class="k">${esc(x[0])}</div><div class="v">${x[1]}</div><div class="d">${x[2] || '&nbsp;'}</div></div>`).join('');
  }

  function strip() {
    const card = $('gx-strip-c'), el = $('gx-strip'), M = MEAS[meas], L = B.latest;
    const ph = phase || (G.schools[0] && G.schools[0][2]), S = G.schools.filter((s) => s[2] === ph && s[M.s] != null);
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
    const c = s.append('g').attr('class', 'ax-dots').selectAll('circle').data(placed).join('circle').attr('cx', (p) => p.cx).attr('cy', (p) => mid + p.cy).attr('r', (p) => p.r).attr('fill', (p) => (e ? AXc.div(p.s[M.s], e[M.b], e[M.b] * 0.5) : SOFT)).attr('stroke', '#fff');
    tipOn(c, (p) => `<b>${esc(p.s[1])}</b><br>${esc(p.s[3])}<br>Overall absence ${pc(p.s[5])}<br>Persistent absence ${pc(p.s[6])}`);
    if (g) s.append('path').attr('d', d3.symbol(d3.symbolDiamond, 150)()).attr('transform', `translate(${x(g[M.b])},${m.t - 8})`).attr('fill', INK);
    key(el, [`<i style="background:${AXc.VERD};border-radius:50%;width:10px"></i>A school with lower absence than England`, `<i style="background:${AXc.RUST};border-radius:50%;width:10px"></i>Higher (larger circle, more pupils)`].concat(g ? [`<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${esc(G.name)}, pooled`] : [], e ? [`<i style="background:${MUTED};width:2px;height:12px"></i>England ${PH[ph]}`] : []));
    const v = S.map((s) => s[M.s]).sort(d3.ascending), below = e ? S.filter((s) => s[M.s] < e[M.b]).length : null;
    $('gx-strip-r').innerHTML = `${M.n.replace(/^./, (ch) => ch.toUpperCase())} at these ${count(S.length)} schools ran from <b>${pc(v[0])}</b> to <b>${pc(v[v.length - 1])}</b>` + (e ? `; ${below === 0 ? 'none' : count(below)} had a lower rate than England’s ${PH[ph]} as a whole.` : '.');
  }

  function hist() {
    const card = $('gx-hist-c'), el = $('gx-hist'), M = MEAS[meas]; card.hidden = !(phase && G.bench[phase]); if (card.hidden) return;
    $('gx-hist-s').textContent = (kind === 'w' || kind === 'y' ? 'Its schools pooled for each full school year.' : kind === 't' ? 'The solid line pools only the schools that were in the trust in each year: the trust’s own record. The dashed line pools all the schools it holds today in every year, including years before they joined.' : 'The schools located in the constituency, pooled for each full school year.') + ' No figures were published for 2019/20.';
    const W = width(el), H = Math.round(Math.min(360, Math.max(230, W * 0.46))), m = {t: 14, r: 16, b: 30, l: 42};
    const yrs = d3.range(+B.fy[0], +B.fy_last + 1).map(String), s = svg(el, W, H, M.n + ' by school year');
    const inT = kind === 't' && G.bench_in && G.bench_in[phase], at = (p) => (inT && inT[p]) || null;
    const lines = [{d: yrs.map((p) => ({p, v: (eng(phase, p) || [])[M.b]})), c: MUTED, w: 2, n: 'England ' + PH[phase]},
      {d: yrs.map((p) => ({p, v: (mine(p) || [])[M.b], k: (mine(p) || [])[3]})), c: INK, w: inT ? 2 : 3, n: inT ? 'The schools it holds today, in every year' : G.name, me: !inT, dash: inT ? '5 4' : null}]
      .concat(inT ? [{d: yrs.map((p) => ({p, v: (at(p) || [])[M.b], k: (at(p) || [])[3], of: (mine(p) || [])[3]})), c: INK, w: 3, n: 'Schools in the trust at the time', me: true}] : []);
    const vals = lines.flatMap((l) => l.d.map((p) => p.v)).filter((v) => v != null);
    const x = d3.scalePoint(yrs, [m.l + 8, W - m.r - 8]), y = d3.scaleLinear([0, d3.max(vals) * 1.08], [H - m.b, m.t]).nice(5);
    y.ticks(5).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID); s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
    const gx = x('2019'); s.append('rect').attr('x', gx - x.step() * 0.38).attr('width', x.step() * 0.76).attr('y', m.t).attr('height', H - m.b - m.t).attr('fill', '#F4F5F8');
    yrs.forEach((p, i) => { if (W >= 640 || i % 2 === 0) s.append('text').attr('x', x(p)).attr('y', H - 8).attr('text-anchor', 'middle').text(W < 640 ? "'" + ay(p).slice(2) : ay(p)); });
    const line = d3.line().defined((p) => p.v != null).x((p) => x(p.p)).y((p) => y(p.v));
    lines.forEach((l) => { s.append('path').attr('d', line(l.d)).attr('fill', 'none').attr('stroke', l.c).attr('stroke-width', l.w).attr('stroke-dasharray', l.dash || null).attr('stroke-linejoin', 'round').attr('stroke-linecap', l.dash ? 'butt' : 'round');
      tipOn(s.append('g').selectAll('circle').data(l.d.filter((p) => p.v != null)).join('circle').attr('cx', (p) => x(p.p)).attr('cy', (p) => y(p.v)).attr('r', l.me ? 3.5 : 8).attr('fill', l.me ? l.c : 'transparent'),
        (p) => `<b>${esc(l.n)}</b><br>${ay(p.p)}: ${M.n} ${pc(p.v)}` + (p.of ? `<br>${p.k} of today’s ${p.of} schools were in the trust` : p.k ? `<br>${p.k} schools with figures` : '')); });
    key(el, lines.slice().reverse().map((l) => `<i class="ln" style="border-color:${l.c}${l.dash ? ';border-top-style:dashed' : ''}"></i>${esc(l.n)}`));
    const first = inT ? yrs.find((p) => at(p)) : null, r = $('gx-hist-r');
    r.hidden = !(kind === 't'); if (kind !== 't') return;
    const jn = G.schools.filter((s) => s[2] === phase && s[7]).map((s) => s[7]).sort(), nj = G.schools.filter((s) => s[2] === phase).length, mv = G.schools.filter((s) => s[2] === phase && s[8]).length;
    r.innerHTML = !jn.length ? 'No joining dates are recorded for these schools, so the line shows the schools it holds today in every year.'
      : `Its ${count(nj)} ${PH[phase]} joined between <b>${month(jn[0])}</b> and <b>${month(jn[jn.length - 1])}</b>` + (mv ? `; ${count(mv)} came from another trust` : '') + '. ' + (first ? `The solid line starts in ${ay(first)}, the first year with three of them in the trust.` : 'Fewer than three were in the trust in any year with figures, so only the dashed line is drawn.');
  }

  // constituencies: a hex map. Trusts: a funnel of rate against pupils.
  function over() {
    const card = $('gx-over-c'), el = $('gx-over'), M = MEAS[meas]; card.hidden = !(phase && ALL); if (card.hidden) return;
    if (kind === 'w') { wardMap(el, M); return; }
    const rows = ALL.filter((r) => r[phase]).map((r) => ({r, n: r[phase][1], v: r[phase][M.o]}));
    if (kind === 'y') { countyPlot(el, M, rows); return; }
    if (kind === 'c') {
      $('gx-over-h').textContent = 'Every constituency in England'; $('gx-over-s').textContent = `One hexagon each, placed roughly where it sits and coloured by ${M.n} in its ${PH[phase]} against England: green lower, rust higher. Grey where fewer than three schools contribute. Tap one to open it.`;
      const H2 = rows.filter((d) => d.r.q != null), W = Math.min(620, width(el)), qs = d3.extent(H2, (d) => d.r.q + (d.r.r & 1) / 2), rs = d3.extent(H2, (d) => d.r.r);
      const size = (W - 4) / ((qs[1] - qs[0] + 1) * Math.sqrt(3)), H = Math.ceil((rs[1] - rs[0]) * 1.5 * size + 2 * size + 4);
      const px = (d) => (d.r.q + (d.r.r & 1) / 2 - qs[0] + 0.5) * Math.sqrt(3) * size + 2, py = (d) => (rs[1] - d.r.r) * 1.5 * size + size + 2;
      const dpath = 'M' + d3.range(6).map((i) => { const t = Math.PI / 180 * (60 * i - 30); return (Math.cos(t) * (size - 0.6)).toFixed(2) + ',' + (Math.sin(t) * (size - 0.6)).toFixed(2); }).join('L') + 'Z';
      const vals = H2.map((d) => d.v).sort(d3.ascending), lo = d3.quantile(vals, 0.03), hi = d3.quantile(vals, 0.97), s = svg(el, W, H, 'Map of constituencies coloured by ' + M.n);
      const mid = (eng(phase, B.latest) || [])[M.b] || d3.median(vals), span = Math.max(hi - mid, mid - lo);
      s.style('max-width', '620px').style('margin', '0 auto');
      const blank = ALL.filter((r) => !r[phase] && r.q != null).map((r) => ({r, v: null}));
      const g = s.append('g').attr('class', 'ax-hexes').selectAll('path').data(blank.concat(H2)).join('path').attr('d', dpath).attr('transform', (d) => `translate(${px(d)},${py(d)})`).attr('fill', (d) => AXc.div(d.v, mid, span));
      g.on('pointerenter pointermove', (ev, d) => showTip(ev, `<b>${esc(d.r.name)}</b><br>${d.v == null ? 'Too few schools' : M.n.replace(/^./, (c) => c.toUpperCase()) + ' ' + pc(d.v)}`)).on('pointerleave', hideTip).on('click', (ev, d) => { location.href = AXsearch.ghref('c', d.r.id); });
      const me = H2.find((d) => d.r.id === id); if (me) s.append('path').attr('d', dpath).attr('transform', `translate(${px(me)},${py(me)}) scale(1.6)`).attr('fill', 'none').attr('stroke', BRASS).attr('stroke-width', 2).attr('pointer-events', 'none');
      key(el, [`${pc(lo)} or less<i class="ramp" style="background:linear-gradient(90deg,${ramp(0)},${ramp(1)})"></i>${pc(hi)} or more`, `<i style="background:none;border:2px solid ${BRASS}"></i>${esc(G.name)}`]);
      const below = me ? H2.filter((d) => d.v < me.v).length : null;
      $('gx-over-r').innerHTML = me ? `${H2.length} constituencies have enough ${PH[phase]} for a figure. <b>${below}</b> have a lower rate than ${esc(G.name)} and <b>${H2.length - below - 1}</b> a higher one.` : '';
      return;
    }
    $('gx-over-h').textContent = 'Among trusts, allowing for size'; $('gx-over-s').textContent = `Each dot is a trust with at least three ${PH[phase]}, placed by pupils and by ${M.n}. The bands show where about 95% and 99.8% of trusts of each size fall. Small trusts vary more by chance.`;
    const e = eng(phase, B.latest), p0 = d3.sum(rows, (d) => d.v * d.n) / d3.sum(rows, (d) => d.n) / 10000;
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
    s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(p0 * 10000)).attr('y2', y(p0 * 10000)).attr('stroke', VERD).attr('stroke-width', 2);
    const html = (d) => `<b>${esc(d.r.name)}</b><br>${d.r[phase][0]} ${PH[phase]}, ${d.n.toLocaleString('en-GB')} pupils<br>${M.n.replace(/^./, (c) => c.toUpperCase())} ${pc(d.v)}`;
    const c = s.append('g').attr('class', 'ax-dots').selectAll('circle').data(rows.filter((d) => d.r.id !== id)).join('circle').attr('cx', (d) => x(d.n)).attr('cy', (d) => y(d.v)).attr('r', W < 480 ? 3 : 4).attr('fill', MUTED).attr('fill-opacity', 0.5);
    c.on('pointerenter pointermove', (ev, d) => showTip(ev, html(d))).on('pointerleave', hideTip).on('click', (ev, d) => { location.href = AXsearch.ghref('t', d.r.id); });
    const me = rows.find((d) => d.r.id === id); if (me) tipOn(s.append('path').datum(me).attr('d', d3.symbol(d3.symbolDiamond, 150)()).attr('transform', `translate(${x(me.n)},${y(me.v)})`).attr('fill', INK).attr('stroke', '#fff'), html);
    key(el, [`<i style="background:${MUTED};border-radius:50%;width:10px"></i>Trusts (${rows.length})`, `<i style="background:#E6EAF0"></i>About 95% of trusts`, `<i style="background:#F4F5F8;border:1px solid ${GRID}"></i>About 99.8%`, `<i class="ln" style="border-color:${VERD}"></i>All these trusts together, ${pc(p0 * 10000)}`].concat(me ? [`<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${esc(G.name)}`] : []));
    if (me) { const zz = (me.v / 10000 - p0) / Math.sqrt(phi * p0 * (1 - p0) / me.n), a = Math.abs(zz);
      $('gx-over-r').innerHTML = `With ${me.n.toLocaleString('en-GB')} pupils in its ${PH[phase]}, ${esc(G.name)} sits ` + (a < 1.96 ? 'inside the band that holds about 95% of trusts of its size.' : `${zz < 0 ? 'below' : 'above'} the band that holds about ${a < 3.09 ? '95' : '99.8'}% of trusts of its size, with ${zz < 0 ? 'lower' : 'higher'} ${M.n} than size alone would explain.`) + ' The comparison takes no account of the pupils its schools serve.'; }
    else $('gx-over-r').textContent = '';
  }

  // a ward among the wards of its district (ONS boundaries); primary schools only
  function wardMap(el, M) {
    const D = ALL, vi = meas === 'abs' ? 1 : 3, e = eng('P', B.latest), W = Math.min(640, width(el)), k = W / D.w, H = Math.ceil(D.h * k);
    $('gx-over-h').textContent = 'The wards of ' + D.name; $('gx-over-s').textContent = `Each ward coloured by ${M.n} in its primary schools against England: green lower, rust higher. Grey wards have fewer than three primary schools, so no figure is given. Tap a ward to open it.`;
    const s = svg(el, W, H, 'Map of wards in ' + D.name); s.style('max-width', '640px').style('margin', '0 auto').attr('class', 'ax-map');
    const vals = D.wards.map((w) => w.v && w.v[vi]).filter((v) => v != null), mid = e ? e[M.b] : d3.median(vals), span = Math.max(d3.max(vals.concat([mid])) - mid, mid - d3.min(vals.concat([mid]))) || 100;
    const path = (w) => w.p.map((r) => 'M' + d3.range(r.length / 2).map((i) => (r[2 * i] * k).toFixed(1) + ',' + ((D.h - r[2 * i + 1]) * k).toFixed(1)).join('L') + 'Z').join('');
    const g = s.selectAll('path').data(D.wards.slice().sort((a, b) => (a.c === id) - (b.c === id))).join('path').attr('d', path).attr('fill-rule', 'evenodd').attr('class', (w) => (w.c === id ? 'me' : null)).attr('fill', (w) => AXc.div(w.v ? w.v[vi] : null, mid, span));
    const html = (w) => `<b>${esc(w.n)}</b><br>` + (!w.v ? 'No state-funded school in the newest figures' : w.v[vi] == null ? `${w.v[0]} ${w.v[0] === 1 ? 'school' : 'schools'}: too few primary schools for a figure` : `${M.n.replace(/^./, (c) => c.toUpperCase())} ${pc(w.v[vi])}`);
    g.on('pointerenter pointermove', (ev, w) => showTip(ev, html(w))).on('pointerleave', hideTip).on('click', (ev, w) => { ev.stopPropagation(); if (w.v && w.c !== id) location.href = AXsearch.ghref('w', w.c); else showTip(ev, html(w)); });
    key(el, [AXc.legend(mid, span, 'England primary schools'), `<i style="background:${AXc.NONE}"></i>No figure`, `<i style="background:none;border:2px solid ${INK}"></i>${esc(G.name)}`, 'Boundaries: Office for National Statistics, OGL v3.0. Contains OS data © Crown copyright and database right 2026']);
    $('gx-over-r').innerHTML = `<b>${vals.length}</b> of the ${D.wards.length} wards in ${esc(D.name)} have three or more primary schools and so carry a figure. A ward figure describes the schools located there, not the children who live there.`;
  }

  // counties in order, each set against England (areas may be ordered; schools never are)
  function countyPlot(el, M, rows) {
    const e = eng(phase, B.latest), mid = e ? e[M.b] : d3.median(rows, (d) => d.v), R = rows.slice().sort((a, b) => a.v - b.v), W = width(el), narrow = W < 520, rh = 20, m = {t: 22, r: 46, b: 8, l: narrow ? 128 : 190}, H = m.t + R.length * rh + m.b;
    $('gx-over-h').textContent = 'The ceremonial counties'; $('gx-over-s').textContent = `Each county’s ${PH[phase]} pooled, in order of ${M.n}, set against England. Tap a county to open it.`;
    const s = svg(el, W, H, 'Counties by ' + M.n), x = d3.scaleLinear(d3.extent(R.map((d) => d.v).concat([mid])), [m.l + 8, W - m.r]).nice();
    x.ticks(narrow ? 3 : 6).forEach((t) => { s.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t - 4).attr('y2', H - m.b).attr('stroke', GRID); s.append('text').attr('x', x(t)).attr('y', 12).attr('text-anchor', 'middle').text((t / 100) + '%'); });
    s.append('line').attr('x1', x(mid)).attr('x2', x(mid)).attr('y1', m.t - 4).attr('y2', H - m.b).attr('stroke', MUTED).attr('stroke-width', 2);
    const g = s.append('g').selectAll('g').data(R).join('g').attr('transform', (d, i) => `translate(0,${m.t + i * rh + rh / 2})`).style('cursor', 'pointer').on('click', (ev, d) => { location.href = AXsearch.ghref('y', d.r.id); });
    g.append('rect').attr('x', 0).attr('y', -rh / 2).attr('width', W).attr('height', rh).attr('fill', (d) => (d.r.id === id ? '#F6F3EC' : 'transparent'));
    g.append('text').attr('x', m.l - 4).attr('y', 4).attr('text-anchor', 'end').attr('class', (d) => (d.r.id === id ? 'strong' : null)).text((d) => (narrow && d.r.name.length > 19 ? d.r.name.slice(0, 18) + '…' : d.r.name));
    g.append('line').attr('x1', x(mid)).attr('x2', (d) => x(d.v)).attr('stroke', (d) => AXc.gap(d.v - mid)).attr('stroke-width', 3);
    g.append('path').attr('d', (d) => (d.r.id === id ? d3.symbol(d3.symbolDiamond, 110)() : d3.symbol(d3.symbolCircle, 60)())).attr('transform', (d) => `translate(${x(d.v)},0)`).attr('fill', (d) => (d.r.id === id ? INK : AXc.gap(d.v - mid)));
    g.append('text').attr('x', W - m.r + 6).attr('y', 4).attr('class', (d) => (d.r.id === id ? 'strong' : null)).text((d) => pc(d.v));
    key(el, [`<i style="background:${AXc.VERD}"></i>Lower than England`, `<i style="background:${AXc.RUST}"></i>Higher`, `<i style="background:${MUTED};width:2px;height:12px"></i>England ${PH[phase]}, ${pc(mid)}`, `<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${esc(G.name)}`]);
    const me = R.findIndex((d) => d.r.id === id); $('gx-over-r').innerHTML = me < 0 ? '' : `<b>${me}</b> of the other ${R.length - 1} counties with a figure have lower ${M.n} in their ${PH[phase]} than ${esc(G.name)} and <b>${R.length - 1 - me}</b> have higher.`;
  }

  let showAll = false;
  function table() {
    const t = $('gx-table'); t.innerHTML = '<thead><tr><th>School</th><th class="n">Overall absence</th><th class="n">Persistent absence</th></tr></thead>';
    const b = t.appendChild(document.createElement('tbody'));
    $('gx-more').hidden = true;
    if (kind === 'y') { $('gx-table-h').textContent = 'Its local authorities'; t.querySelector('th').textContent = 'Local authority';
      G.las.forEach((l) => { const v = l[2][phase]; const tr = b.appendChild(document.createElement('tr')); tr.innerHTML = `<td><a href="/attendance/#area=${l[0]}">${esc(l[1])}</a><small>${PH1[phase] || ''} schools, pooled</small></td><td class="n">${pc(v && v[0])}</td><td class="n">${pc(v && v[2])}</td>`; }); return; }
    const list = showAll ? G.schools : G.schools.slice(0, 10);
    if (G.schools.length > 10) { const m = $('gx-more'); m.hidden = false; m.textContent = showAll ? 'Show the first 10' : `Show all ${G.schools.length} schools`; m.onclick = () => { showAll = !showAll; table(); }; }
    list.forEach((s) => { const tr = b.appendChild(document.createElement('tr'));
      tr.innerHTML = `<td><a href="${AXsearch.href(s[0])}">${esc(s[1])}</a><small>${esc([PH1[s[2]], s[3], s[7] ? 'joined ' + month(s[7]) + (s[8] ? ' from ' + s[8] : '') : ''].filter(Boolean).join(' · '))}</small></td><td class="n">${pc(s[5])}</td><td class="n">${pc(s[6])}</td>`; });
  }

  function draw() {
    document.querySelectorAll('#gx-phase button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === phase)));
    document.querySelectorAll('#gx-meas button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === meas)));
    const p = new URLSearchParams({k: kind, id}); if (phase) p.set('phase', phase); if (meas !== 'abs') p.set('m', meas);
    if (!random) history.replaceState(null, '', location.pathname + '?' + p.toString());
    head(); strip(); hist(); over(); table();
  }

  d3.json('/attendance/data/bench.json').then((j) => {
    B = j; const q = new URLSearchParams(location.search); kind = SH[q.get('k')] ? q.get('k') : 'c'; id = q.get('id') || '';
    AXsearch($('gx-q'), $('gx-list'), AXsearch.go, true);
    $('gx-another').addEventListener('click', () => { location.href = '/attendance/group/'; });
    const start = id ? Promise.resolve() : d3.json('/attendance/data/grp/c_all.json').then((all) => { random = true; kind = 'c'; id = all[Math.floor(Math.random() * all.length)].id; });
    return start.then(() => { const shard = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % SH[kind];
      return d3.json(`/attendance/data/grp/${kind}${shard}.json`); }).then((sh) => { G = sh[id];
      const extra = !G ? null : kind === 'w' ? (G.lad ? d3.json(`/attendance/data/geo/${G.lad}.json`).catch(() => null) : null) : d3.json(`/attendance/data/grp/${kind}_all.json`);
      return Promise.all([sh, extra]); }).then(([sh, all]) => { if (!G) { $('gx-name').textContent = 'Not found'; $('gx-meta').textContent = 'No trust or constituency matches that address. Search for it by name below.'; return; }
      ALL = all; const phases = ['P', 'S', 'X'].filter((p) => G.bench[p] && G.bench[p][B.latest]);
      const pupils = (p) => d3.sum(G.schools.filter((s) => s[2] === p), (s) => s[4] || 0);
      phase = phases.includes(q.get('phase')) ? q.get('phase') : phases.slice().sort((a, b) => pupils(b) - pupils(a))[0] || null; if (q.get('m') === 'pa') meas = 'pa';
      $('gx-phase').innerHTML = phases.map((p) => `<button type="button" data-p="${p}">${PH1[p]}</button>`).join(''); $('gx-phase-f').hidden = phases.length < 2; $('gx-meas-f').hidden = false;
      $('gx-phase').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { phase = b.dataset.p; draw(); } });
      $('gx-meas').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { meas = b.dataset.m; draw(); } });
      $('gx-body').hidden = false; draw();
      let w = innerWidth; addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; draw(); } });
    });
  }).catch((e) => { console.error(e); $('gx-meta').textContent = 'The data could not be loaded. Please try again shortly.'; });
})();
