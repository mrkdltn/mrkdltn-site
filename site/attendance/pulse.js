/* Attendance Explorer: the pulse (national, regional and local authority, from the DfE's in-year data).
   Data: /attendance/data/pulse.json (England by day, every area by week) and area/<code>.json (one area by day).
   Rates arrive as hundredths of a percentage point; null means withheld. Nothing animates. */
(function () {
  const INK = '#0B1A2E', MUTED = '#55627A', VERD = '#2F6F66', UNLIT = '#E3E6EB', GRID = '#EEF1F5', LAST = '#A9B2C1';
  const ramp = d3.interpolateRgb('#E9EDF3', INK);
  const PHASE = {A: 'all schools', P: 'primary schools', S: 'secondary schools', X: 'special schools'};
  const $ = (id) => document.getElementById(id);
  const pc = (v, dp) => (v == null ? '–' : (dp == null ? Math.round(v / 10) / 10 : v / 100).toFixed(dp == null ? 1 : dp) + '%');      // shown figures round hundredths to tenths, the same way differences do
  // differences are taken between the figures as shown (one decimal place), so the sentence always agrees with them
  const gap = (a, b) => Math.round(a / 10) - Math.round(b / 10);
  const pts = (t) => (Math.abs(t) / 10).toFixed(1);
  const day = (iso) => new Date(iso + 'T12:00:00');
  const fmtD = (iso, o) => day(iso).toLocaleDateString('en-GB', o || {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
  const ay = (y) => y + '/' + String((+y + 1) % 100).padStart(2, '0');
  const mean = (a) => { const b = a.filter((x) => x != null); return b.length ? d3.mean(b) : null; };

  let P, state = {area: null, phase: 'A'}, areaCache = new Map(), byCode = new Map(), cur, prev;

  // ---- tooltip (hover on desktop, tap on phones), always kept on screen
  const tip = $('ax-tip');
  const showTip = (ev, html) => {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect(), x = ev.clientX, y = ev.clientY;
    tip.style.left = Math.max(8, Math.min(x + 12, innerWidth - r.width - 8)) + 'px';
    tip.style.top = (y + 16 + r.height > innerHeight ? Math.max(8, y - r.height - 12) : y + 16) + 'px';
  };
  const hideTip = () => { tip.hidden = true; };
  const tipOn = (sel, html) => sel.on('pointerenter pointermove', (ev, d) => showTip(ev, html(d))).on('pointerleave', hideTip)
    .on('click', (ev, d) => { ev.stopPropagation(); showTip(ev, html(d)); });
  document.addEventListener('click', hideTip); addEventListener('scroll', hideTip, {passive: true});

  const svg = (el, w, h, label) => { el.innerHTML = '';
    return d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', label); };
  const key = (el, items) => { const k = document.createElement('div'); k.className = 'ax-key';
    items.forEach((t) => { const s = document.createElement('span'); s.innerHTML = t; k.appendChild(s); }); el.appendChild(k); };
  const width = (el) => Math.max(280, Math.floor(el.getBoundingClientRect().width));

  // ---- state in the address, so any view can be shared
  const readHash = () => { const p = new URLSearchParams(location.hash.slice(1));
    if (byCode.has(p.get('area'))) state.area = p.get('area'); if (PHASE[p.get('phase')]) state.phase = p.get('phase'); };
  const writeHash = () => { const p = new URLSearchParams();
    if (state.area !== P.areas[0].c) p.set('area', state.area); if (state.phase !== 'A') p.set('phase', state.phase);
    const s = p.toString(); history.replaceState(null, '', location.pathname + (s ? '#' + s : '')); };

  const daily = (code) => {
    if (code === P.areas[0].c) return Promise.resolve(P.england);
    if (!areaCache.has(code)) areaCache.set(code, d3.json('/attendance/data/area/' + code + '.json').then((j) => j.daily));
    return areaCache.get(code);
  };
  // weeks of the school year line up across years by counting from the Monday of the week holding 1 September
  const base = (y) => { const d = new Date(Date.UTC(+y, 8, 1)); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d; };
  const weekIx = (iso, y) => Math.round((Date.parse(iso + 'T00:00:00Z') - base(y)) / 6048e5 - 0.01 + ((new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7) / -7 + 0.01);
  const dowIx = (iso) => (new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7;

  // ---- headline
  function head() {
    const a = byCode.get(state.area), eng = P.areas[0].c, ph = state.phase;
    const y = P.ytd[a.c][cur][ph], yl = P.ytd[a.c][prev] && P.ytd[a.c][prev][ph], e = P.ytd[eng][cur][ph];
    const w = P.weekly[a.c][cur][ph].abs; let li = w.length - 1; while (li >= 0 && w[li] == null) li--;
    const first = P.days[cur][0], last = P.days[cur][P.days[cur].length - 1];
    $('ax-name').textContent = a.n + (ph === 'A' ? '' : ': ' + PHASE[ph]);
    document.body.dataset.axTitle = a.n + ': absence in ' + PHASE[ph];   // the title on saved images
    if (window.AXtools) AXtools.setPlace({kind: 'area', id: a.c, name: a.n, href: '/attendance/#area=' + a.c});
    const el = $('ax-reading');
    if (!y) { el.textContent = 'No rate is shown for ' + PHASE[ph] + ' in ' + a.n + '. The DfE’s release has no figures, or there were too few pupils to show one.'; $('ax-kpis').innerHTML = ''; return; }
    let t = `Pupils in ${PHASE[ph]} ${a.l === 'national' ? 'in England' : 'in ' + a.n} missed <b>${pc(y.abs)}</b> of their sessions between ${fmtD(first, {day: 'numeric', month: 'long'})} and ${fmtD(last, {day: 'numeric', month: 'long', year: 'numeric'})}`;
    if (yl) { const d = gap(y.abs, yl.abs); t += d === 0 ? `, unchanged from the same point last year` : `, <b>${pts(d)}</b> points ${d < 0 ? 'lower' : 'higher'} than at the same point last year (${pc(yl.abs)})`; }
    t += '.';
    if (a.l !== 'national' && e) { const d = gap(y.abs, e.abs); t += d === 0 ? ` England’s figure was the same.` : ` England’s figure was ${pc(e.abs)}, so absence here was ${pts(d)} points ${d < 0 ? 'lower' : 'higher'}.`; }
    el.innerHTML = t;
    const dl = yl ? gap(y.abs, yl.abs) : null, de = a.l !== 'national' && e ? gap(y.abs, e.abs) : null;
    el.innerHTML += '<span class="ax-pills">' + (dl == null ? '' : AXc.pill(dl, 'the same point last year')) + (de == null ? '' : AXc.pill(de, 'England')) + '</span>';
    if (a.l === 'la' && window.AXsearch) el.innerHTML += `<span class="ax-more-link"><a href="${AXsearch.ghref('a', a.c)}">Schools, pupil groups and comparisons for ${a.n}</a></span>`;
    const k = [
      ['Overall absence since September', pc(y.abs), yl ? 'same point last year ' + pc(yl.abs) : ''],
      ['Latest week, from ' + (li >= 0 ? fmtD(P.weeks[cur][li], {day: 'numeric', month: 'short'}) : ''), li >= 0 ? pc(w[li]) : '–', a.l !== 'national' ? 'England ' + pc(P.weekly[eng][cur][ph].abs[li]) : ''],
      ['Authorised absence', pc(y.auth), 'of which illness ' + pc(y.ill)],
      ['Unauthorised absence', pc(y.unauth), 'of which holiday ' + pc(y.hol_u, 2)],
    ];
    $('ax-kpis').innerHTML = k.map((x) => `<div class="ax-kpi"><div class="k">${x[0]}</div><div class="v">${x[1]}</div><div class="d">${x[2] || '&nbsp;'}</div></div>`).join('');
  }

  // ---- the year ribbon
  function ribbon(D) {
    const el = $('ax-ribbon'), ph = state.phase, W = width(el), narrow = W < 520;
    const years = [cur, prev].filter((y) => y && D[y]);
    const eng = P.england, all = []; P.years.forEach((y) => (eng[y][ph].abs || []).forEach((v) => v != null && all.push(v)));
    all.sort(d3.ascending); const lo = d3.quantile(all, 0.03), hi = d3.quantile(all, 0.97);
    const mid = (P.ytd[P.areas[0].c][cur][ph] || {}).abs || d3.median(all), span = Math.max(hi - mid, mid - lo);
    const col = (v) => AXc.div(v, mid, span);
    const nW = 47, left = narrow ? 30 : 64, cw = (W - left) / nW, chh = narrow ? 13 : Math.min(18, cw), gap = Math.min(2, cw * 0.18);
    const blockH = chh * 5, top = 36, pitch = blockH + 48, H = top + years.length * pitch - 12;
    const s = svg(el, W, H, 'Calendar of overall absence, one square per school day');
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    years.forEach((y, yi) => {
      const g = s.append('g').attr('transform', `translate(0,${top + yi * pitch})`).attr('class', 'ax-cells');
      g.append('text').attr('x', 0).attr('y', -22).attr('class', 'strong').text(ay(y));
      if (!narrow) ['Mon', '', 'Wed', '', 'Fri'].forEach((t, i) => g.append('text').attr('x', left - 8).attr('y', i * chh + chh * 0.72).attr('text-anchor', 'end').text(t));
      months.forEach((m, mi) => { const d = new Date(Date.UTC(+y + (mi > 3 ? 1 : 0), (8 + mi) % 12, 1)); const ix = Math.floor((d - base(y)) / 6048e5 + 0.99);
        if (ix < nW && (!narrow || mi % 2 === 0)) g.append('text').attr('x', left + ix * cw).attr('y', -6).text(m); });
      for (let wk = 0; wk < nW; wk++) for (let d = 0; d < 5; d++) g.append('rect').attr('x', left + wk * cw).attr('y', d * chh).attr('width', cw - gap).attr('height', chh - gap).attr('fill', 'none').attr('stroke', GRID).attr('pointer-events', 'none');
      const cells = P.days[y].map((iso, i) => ({iso, v: D[y][ph].abs[i], au: D[y][ph].auth[i], un: D[y][ph].unauth[i]})).filter((c) => c.v != null);
      const r = g.selectAll('rect.c').data(cells).join('rect').attr('class', 'c')
        .attr('x', (c) => left + Math.floor((Date.parse(c.iso + 'T00:00:00Z') - base(y)) / 6048e5) * cw).attr('y', (c) => dowIx(c.iso) * chh)
        .attr('width', cw - gap).attr('height', chh - gap).attr('fill', (c) => col(c.v));
      tipOn(r, (c) => `<b>${fmtD(c.iso)}</b><br>Overall absence ${pc(c.v)}<br>Authorised ${pc(c.au)} · unauthorised ${pc(c.un)}`);
    });
    key(el, [AXc.legend(mid, span, 'England so far this year'), 'Green is lower absence than England’s average for the year so far, rust higher']);
    const v = D[cur][ph].abs.filter((x) => x != null);
    const i = D[cur][ph].abs.indexOf(d3.max(v));
    $('ax-ribbon-r').innerHTML = v.length ? `Absence so far this year was highest on <b>${fmtD(P.days[cur][i], {weekday: 'long', day: 'numeric', month: 'long'})}</b>, at <b>${pc(D[cur][ph].abs[i])}</b>.` : '';
  }

  // ---- week by week
  function weeks() {
    const el = $('ax-weeks'), ph = state.phase, a = byCode.get(state.area), eng = P.areas[0].c, W = width(el), H = Math.round(Math.min(340, W * 0.72));
    const m = {t: 12, r: 14, b: 30, l: 40}, s = svg(el, W, H, 'Overall absence each week, this year and last');
    const ser = (code, y) => (P.weekly[code][y] ? P.weeks[y].map((iso, i) => ({x: Math.round((Date.parse(iso + 'T00:00:00Z') - base(y)) / 6048e5), v: P.weekly[code][y][ph].abs[i], iso})) : []);
    const lines = [{d: ser(a.c, prev), c: LAST, w: 2, n: ay(prev)}];
    if (a.c !== eng) lines.push({d: ser(eng, cur), c: MUTED, w: 2, n: 'England ' + ay(cur)});
    lines.push({d: ser(a.c, cur), c: INK, w: 3, n: ay(cur)});
    const vals = lines.flatMap((l) => l.d.map((p) => p.v)).filter((v) => v != null);
    const x = d3.scaleLinear([0, 46], [m.l, W - m.r]), y = d3.scaleLinear([Math.max(0, d3.min(vals) - 80), d3.max(vals) + 60], [H - m.b, m.t]).nice(4);
    y.ticks(4).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID);
      s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
    ['Sep', 'Nov', 'Jan', 'Mar', 'May', 'Jul'].forEach((t, i) => { const d = new Date(Date.UTC(+cur + (i > 1 ? 1 : 0), (8 + i * 2) % 12, 1)); const ix = (d - base(cur)) / 6048e5;
      s.append('text').attr('x', x(ix)).attr('y', H - 8).text(t); });
    const line = d3.line().defined((p) => p.v != null).x((p) => x(p.x)).y((p) => y(p.v));
    lines.forEach((l) => { s.append('path').attr('d', line(l.d)).attr('fill', 'none').attr('stroke', l.c).attr('stroke-width', l.w).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
      const dots = s.append('g').selectAll('circle').data(l.d.filter((p) => p.v != null)).join('circle').attr('cx', (p) => x(p.x)).attr('cy', (p) => y(p.v)).attr('r', 9).attr('fill', 'transparent');
      tipOn(dots, (p) => `<b>${l.n}</b><br>Week of ${fmtD(p.iso, {day: 'numeric', month: 'long', year: 'numeric'})}<br>Overall absence ${pc(p.v)}`); });
    const lastP = lines[lines.length - 1].d.filter((p) => p.v != null).pop();
    if (lastP) s.append('path').attr('d', d3.symbol(d3.symbolDiamond, 90)()).attr('transform', `translate(${x(lastP.x)},${y(lastP.v)})`).attr('fill', INK).attr('pointer-events', 'none');
    key(el, lines.slice().reverse().map((l) => `<i class="ln" style="border-color:${l.c}"></i>${l.n}`));
  }

  // ---- day of the week
  function dow(D) {
    const el = $('ax-dow'), ph = state.phase, W = width(el), H = Math.round(Math.min(340, W * 0.72));
    const g = [0, 1, 2, 3, 4].map((d) => { const ix = P.days[cur].map((iso, i) => (dowIx(iso) === d ? i : -1)).filter((i) => i >= 0);
      return {d, au: mean(ix.map((i) => D[cur][ph].auth[i])), un: mean(ix.map((i) => D[cur][ph].unauth[i]))}; });
    const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (g.some((b) => b.au == null)) { el.innerHTML = ''; $('ax-dow-r').textContent = 'There are too few sessions here to show each weekday.'; return; }
    const m = {t: 22, r: 8, b: 28, l: 40}, s = svg(el, W, H, 'Average absence by day of the week');
    const x = d3.scaleBand([0, 1, 2, 3, 4], [m.l, W - m.r]).padding(0.28), y = d3.scaleLinear([0, d3.max(g, (b) => b.au + b.un) * 1.08], [H - m.b, m.t]).nice(4);
    y.ticks(4).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID);
      s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
    const b = s.append('g').selectAll('g').data(g).join('g');
    b.append('rect').attr('x', (d) => x(d.d)).attr('width', x.bandwidth()).attr('y', (d) => y(d.au)).attr('height', (d) => y(0) - y(d.au)).attr('fill', LAST);
    b.append('rect').attr('x', (d) => x(d.d)).attr('width', x.bandwidth()).attr('y', (d) => y(d.au + d.un)).attr('height', (d) => y(d.au) - y(d.au + d.un)).attr('fill', INK);
    b.append('text').attr('class', 'strong').attr('x', (d) => x(d.d) + x.bandwidth() / 2).attr('y', (d) => y(d.au + d.un) - 6).attr('text-anchor', 'middle').text((d) => pc(d.au + d.un));
    b.append('text').attr('x', (d) => x(d.d) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').text((d) => (W < 420 ? names[d.d].slice(0, 3) : names[d.d]));
    tipOn(b, (d) => `<b>${names[d.d]}s</b><br>Authorised ${pc(d.au)}<br>Unauthorised ${pc(d.un)}`);
    key(el, [`<i style="background:${INK}"></i>Unauthorised`, `<i style="background:${LAST}"></i>Authorised`]);
    const mid = mean([1, 2, 3].map((i) => g[i].au + g[i].un)), fri = g[4].au + g[4].un, mon = g[0].au + g[0].un;
    $('ax-dow-r').innerHTML = `Absence averaged <b>${pc(fri)}</b> on Fridays and <b>${pc(mon)}</b> on Mondays, against <b>${pc(mid)}</b> from Tuesday to Thursday.`;
  }

  // ---- reasons
  function reasons() {
    const el = $('ax-reasons'), ph = state.phase, a = byCode.get(state.area), eng = P.areas[0].c, W = width(el), narrow = W < 560;
    const parts = [['Illness', (v) => v.ill, '#C3CAD6'], ['Other authorised', (v) => v.auth - v.ill, '#97A2B4'], ['Unauthorised holiday', (v) => v.hol_u, '#5F6E87'],
      ['Arrived after registers closed', (v) => v.late, '#3D4C68'], ['No reason given yet', (v) => v.none, '#22324D'], ['Other unauthorised', (v) => v.unauth - v.hol_u - v.late - v.none, INK]];
    const rows = [[a.n + ', ' + ay(cur), P.ytd[a.c][cur][ph]], [a.n + ', same point ' + ay(prev), P.ytd[a.c][prev] && P.ytd[a.c][prev][ph]]];
    if (a.c !== eng) rows.push(['England, ' + ay(cur), P.ytd[eng][cur][ph]]);
    const R = rows.filter((r) => r[1]); if (!R.length) { el.innerHTML = ''; return; }
    const rh = 56, m = {l: 0, r: 46, t: 4}, H = R.length * rh + m.t, s = svg(el, W, H, 'Absence by recorded reason');
    const x = d3.scaleLinear([0, d3.max(R, (r) => r[1].abs)], [m.l, W - m.r]);
    R.forEach((r, i) => { const g = s.append('g').attr('transform', `translate(0,${m.t + i * rh})`); let acc = 0;
      g.append('text').attr('class', i === 0 ? 'strong' : null).attr('y', 14).text(r[0]);
      const segs = parts.map((p) => { const v = Math.max(0, p[1](r[1])); const o = {n: p[0], v, x0: acc, c: p[2]}; acc += v; return o; });
      const rect = g.selectAll('rect').data(segs).join('rect').attr('x', (d) => x(d.x0)).attr('y', 22).attr('height', 22).attr('width', (d) => Math.max(0, x(d.x0 + d.v) - x(d.x0) - 1)).attr('fill', (d) => d.c);
      tipOn(rect, (d) => `<b>${d.n}</b><br>${pc(d.v, 2)} of possible sessions<br>${Math.round(100 * d.v / acc)}% of all absence`);
      g.append('text').attr('class', 'strong').attr('x', x(acc) + 6).attr('y', 38).text(pc(r[1].abs)); });
    key(el, parts.map((p) => `<i style="background:${p[2]}"></i>${p[0]}`));
  }

  // ---- hex map of authorities
  function hex() {
    const el = $('ax-hex'), ph = state.phase, W = Math.min(520, width(el));
    const las = P.areas.filter((a) => a.l === 'la' && P.hex.hexes[a.c]).map((a) => ({a, q: P.hex.hexes[a.c].q, r: P.hex.hexes[a.c].r, v: P.ytd[a.c][cur][ph] && P.ytd[a.c][cur][ph].abs}));
    const qs = d3.extent(las, (d) => d.q + (d.r & 1) / 2), rs = d3.extent(las, (d) => d.r);
    const size = Math.min((W - 4) / ((qs[1] - qs[0] + 1) * Math.sqrt(3)), 16), H = Math.ceil((rs[1] - rs[0]) * 1.5 * size + 2 * size + 4);
    const px = (d) => (d.q + (d.r & 1) / 2 - qs[0] + 0.5) * Math.sqrt(3) * size + 2, py = (d) => (rs[1] - d.r) * 1.5 * size + size + 2;
    const path = d3.range(6).map((i) => { const t = Math.PI / 180 * (60 * i - 30); return [Math.cos(t) * (size - 1), Math.sin(t) * (size - 1)]; });
    const dpath = 'M' + path.map((p) => p.map((n) => n.toFixed(2)).join(',')).join('L') + 'Z';
    const vals = las.map((d) => d.v).filter((v) => v != null).sort(d3.ascending), lo = d3.quantile(vals, 0.03), hi = d3.quantile(vals, 0.97);
    const mid = (P.ytd[P.areas[0].c][cur][ph] || {}).abs || d3.median(vals), span = Math.max(hi - mid, mid - lo);
    const s = svg(el, Math.ceil((qs[1] - qs[0] + 1) * Math.sqrt(3) * size + 4), H, 'Map of local authorities shaded by overall absence');
    s.style('max-width', '520px').style('margin', '0 auto');
    const g = s.append('g').attr('class', 'ax-hexes').selectAll('path').data(las).join('path').attr('d', dpath).attr('transform', (d) => `translate(${px(d)},${py(d)})`)
      .attr('fill', (d) => AXc.div(d.v, mid, span))
      .attr('tabindex', 0).attr('role', 'button').attr('aria-label', (d) => `${d.a.n}: ${pc(d.v)}`);
    g.on('pointerenter pointermove', (ev, d) => showTip(ev, `<b>${d.a.n}</b><br>Overall absence ${pc(d.v)}`)).on('pointerleave', hideTip)
      .on('click', (ev, d) => { ev.stopPropagation(); pick(d.a.c); showTip(ev, `<b>${d.a.n}</b><br>Overall absence ${pc(d.v)}`); })
      .on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(d.a.c); } });
    const me = las.find((d) => d.a.c === state.area);
    if (me) s.append('path').attr('d', dpath).attr('transform', `translate(${px(me)},${py(me)}) scale(1.12)`).attr('fill', 'none').attr('stroke', '#C9A24B').attr('stroke-width', 3).attr('pointer-events', 'none');
    key(el, [AXc.legend(mid, span, 'England'), me ? `<i style="background:none;border:2px solid #C9A24B"></i>${me.a.n}` : 'Green is lower absence than England, rust higher']);
  }

  // ---- this year against last
  function change() {
    const el = $('ax-change'), ph = state.phase, W = width(el), H = Math.round(Math.min(420, W * 0.86)), m = {t: 12, r: 14, b: 40, l: 46};
    const las = P.areas.filter((a) => a.l === 'la').map((a) => ({a, x: P.ytd[a.c][prev] && P.ytd[a.c][prev][ph] && P.ytd[a.c][prev][ph].abs, y: P.ytd[a.c][cur][ph] && P.ytd[a.c][cur][ph].abs})).filter((d) => d.x != null && d.y != null);
    if (!las.length) { el.innerHTML = ''; $('ax-change-r').textContent = ''; return; }
    const ext = d3.extent(las.flatMap((d) => [d.x, d.y])), pad = (ext[1] - ext[0]) * 0.06, dom = [ext[0] - pad, ext[1] + pad];
    const s = svg(el, W, H, 'Overall absence this year against the same point last year, by local authority');
    const x = d3.scaleLinear(dom, [m.l, W - m.r]), y = d3.scaleLinear(dom, [H - m.b, m.t]);
    x.ticks(5).forEach((t) => { s.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', GRID);
      s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID);
      s.append('text').attr('x', x(t)).attr('y', H - m.b + 16).attr('text-anchor', 'middle').text((t / 100) + '%');
      s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
    s.append('line').attr('x1', x(dom[0])).attr('y1', y(dom[0])).attr('x2', x(dom[1])).attr('y2', y(dom[1])).attr('stroke', MUTED).attr('stroke-dasharray', '4 4');
    s.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Same point in ' + ay(prev));
    s.append('text').attr('transform', `translate(12,${(m.t + H - m.b) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(ay(cur) + ' so far');
    const c = s.append('g').attr('class', 'ax-dots').selectAll('circle').data(las.filter((d) => d.a.c !== state.area)).join('circle').attr('cx', (d) => x(d.x)).attr('cy', (d) => y(d.y)).attr('r', W < 420 ? 3.5 : 4.5).attr('fill', (d) => AXc.gap(gap(d.y, d.x))).attr('fill-opacity', 0.6);
    const html = (d) => `<b>${d.a.n}</b><br>${ay(cur)}: ${pc(d.y)}<br>Same point ${ay(prev)}: ${pc(d.x)}`;
    c.on('pointerenter pointermove', (ev, d) => showTip(ev, html(d))).on('pointerleave', hideTip).on('click', (ev, d) => { ev.stopPropagation(); pick(d.a.c); showTip(ev, html(d)); });
    const me = las.find((d) => d.a.c === state.area);
    if (me) tipOn(s.append('path').datum(me).attr('d', d3.symbol(d3.symbolDiamond, 150)()).attr('transform', `translate(${x(me.x)},${y(me.y)})`).attr('fill', INK).attr('stroke', '#fff'), html);
    const lower = las.filter((d) => gap(d.y, d.x) < 0).length, higher = las.filter((d) => gap(d.y, d.x) > 0).length;
    key(el, [`<i style="background:${AXc.VERD};border-radius:50%;width:10px"></i>Lower than last year`, `<i style="background:${AXc.RUST};border-radius:50%;width:10px"></i>Higher`, `<i style="background:${AXc.SLATE};border-radius:50%;width:10px"></i>The same`].concat(me ? [`<i style="background:${INK};transform:rotate(45deg);width:10px"></i>${me.a.n}`] : []));
    $('ax-change-r').innerHTML = `Overall absence in ${PHASE[ph]} is lower than at the same point last year in <b>${lower}</b> of ${las.length} local authorities and higher in <b>${higher}</b>.`;
  }

  function pick(code) { if (code === state.area) return; state.area = code; $('ax-area').value = code; draw(); }
  let token = 0;
  function draw() {
    writeHash();
    document.querySelectorAll('#ax-phase button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === state.phase)));
    head(); weeks(); reasons(); hex(); change();
    const t = ++token;
    daily(state.area).then((D) => { if (t === token) { ribbon(D); dow(D); } })
      .catch(() => { $('ax-ribbon').textContent = 'The daily figures for this area could not be loaded. Please try again.'; });
  }

  d3.json('/attendance/data/pulse.json').then((j) => {
    P = j; cur = String(P.years[P.years.length - 1]); prev = P.years.length > 1 ? String(P.years[P.years.length - 2]) : null;
    P.areas.forEach((a) => byCode.set(a.c, a)); state.area = P.areas[0].c; readHash();
    const sel = $('ax-area'), groups = [['national', ''], ['region', 'Regions'], ['la', 'Local authorities']];
    groups.forEach(([l, label]) => { const host = label ? sel.appendChild(Object.assign(document.createElement('optgroup'), {label})) : sel;
      P.areas.filter((a) => a.l === l).forEach((a) => host.appendChild(new Option(a.n, a.c))); });
    sel.value = state.area; sel.addEventListener('change', () => { state.area = sel.value; draw(); });
    $('ax-phase').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.phase = b.dataset.p; draw(); } });
    const last = P.days[cur][P.days[cur].length - 1];
    $('ax-date').textContent = `Figures to ${fmtD(last)}. Published by the DfE on ${fmtD(P.release.published, {day: 'numeric', month: 'long', year: 'numeric'})}.`;
    $('ax-src').textContent = `version ${P.release.version}, published ${fmtD(P.release.published, {day: 'numeric', month: 'long', year: 'numeric'})}, covering ${fmtD(P.days[cur][0], {day: 'numeric', month: 'long'})} to ${fmtD(last, {day: 'numeric', month: 'long', year: 'numeric'})}`;
    let w = innerWidth; addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; draw(); } });
    addEventListener('hashchange', () => { readHash(); sel.value = state.area; draw(); });
    draw();
    if (window.AXtools) { AXtools.renderPins($('ax-places')); const was = AXtools.seen('pulse', P.release.published);
      if (was && was !== P.release.published) { const n = $('ax-new'); n.hidden = false; n.textContent = `New since your last visit: the DfE published figures to ${fmtD(last, {day: 'numeric', month: 'long'})} on ${fmtD(P.release.published, {day: 'numeric', month: 'long'})}.`; } }
    if (window.AXsearch) AXsearch($('ax-q'), $('ax-qlist'), AXsearch.go, true);
  }).catch((e) => { console.error(e); $('ax-date').textContent = 'The attendance data could not be loaded. Please try again shortly.'; });
})();
