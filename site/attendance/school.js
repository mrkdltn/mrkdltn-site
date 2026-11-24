/* Attendance Explorer: a school. Rebuilt 25 November 2026 to a budget: the answer within one phone screen, no page-wide
   controls, three sections and one "More detail". The first heading is a reading of the school's overall absence against
   England, its local authority and its 20 similar schools, always in that order. A single school takes no green or rust:
   everything here is ink and slate. Rates are stored as hundredths of a point; a difference is taken before rounding. */
(function () {
  const $ = (id) => document.getElementById(id), INK = '#0B1A2E', SLATE = '#55627A', GRID = '#E3E6EC';
  const PH = {P: 'primary schools', S: 'secondary schools', X: 'special schools'}, PH1 = {P: 'Primary school', S: 'Secondary school', X: 'Special school'};
  const GRADES = [['Exceptional', '#0176E0'], ['Strong standard', '#33903C'], ['Expected standard', '#5CD168'], ['Needs attention', '#FF8341'], ['Urgent improvement', '#CE1E02']];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const pc = (v) => (v == null ? '–' : (Math.round(v / 10) / 10).toFixed(1) + '%');
  const gap = (a, b) => { const d = a - b; return Math.sign(d) * Math.round(Math.abs(d) / 10); };          // in tenths of a point, rounded once
  const pts = (t) => (Math.abs(t) / 10).toFixed(1), ay = (p) => { const y = +String(p).slice(0, 4); return y + '/' + String((y + 1) % 100).padStart(2, '0'); };
  const dmy = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'});
  const joinAnd = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const tip = $('ax-tip');
  const showTip = (ev, html) => { tip.innerHTML = html; tip.hidden = false; const r = tip.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(ev.clientX + 12, innerWidth - r.width - 8)) + 'px'; tip.style.top = (ev.clientY + 16 + r.height > innerHeight ? Math.max(8, ev.clientY - r.height - 12) : ev.clientY + 16) + 'px'; };
  const hideTip = () => { tip.hidden = true; };
  addEventListener('scroll', hideTip, {passive: true});

  AXsearch($('sx-q'), $('sx-list'), (r) => AXsearch.go(r), true);
  const urn = AXsearch.urn();
  if (!urn || !/^\d{5,7}$/.test(urn)) { $('sx-empty').hidden = false; return; }

  let B, S, DIST = null;
  const bench = (code, p) => (B.bench[code] && B.bench[code][S.ph] && B.bench[code][S.ph][p]) || null;          // [overall, unauthorised, persistent, ...]

  function first() {
    const L = B.latest, prev = B.periods.filter((p) => p.endsWith('AS') && p < L).pop(), me = S.h[L], was = prev && S.h[prev], la = B.la_names[S.la] || 'its local authority';
    document.title = S.n + ': attendance · Attendance Explorer · Mark Dalton';
    $('sx-name').textContent = S.n; $('sx-meta').textContent = [PH1[S.ph], S.town, la].filter(Boolean).join(' · ');
    if (!me || me[1] == null) { $('sx-period').textContent = 'Autumn and spring terms ' + ay(L); $('sx-verdict').textContent = 'No figure is published for this school for the latest period';
      $('sx-reading').textContent = 'The DfE has no absence figure for it in the autumn and spring terms of ' + ay(L) + ', or it has fewer than 10 pupils. Earlier years, where there are any, are in the chart below.'; $('sx-table').hidden = true; return; }
    const e = bench('E', L), l0 = bench(S.la, L), l = l0 && l0[3] >= 3 ? l0 : null, sim = S.sim || null;          // a local authority figure needs three schools
    const cmp = [['England', e && e[0], e && e[2], `England’s ${PH[S.ph]}`], [la, l && l[0], l && l[2], la], ['similar schools', sim && sim[0], sim && sim[2], 'its 20 similar schools']].filter((c) => c[1] != null);
    // the verdict: one word for each comparison, grouped, in the fixed order
    const word = (t) => (Math.abs(t) < 3 ? 'close to' : t > 0 ? 'higher than' : 'lower than'), groups = [];
    cmp.forEach((c) => { const w = word(gap(me[1], c[1])), g = groups.find((x) => x.w === w); if (g) g.names.push(c[0]); else groups.push({w, names: [c[0]]}); });
    $('sx-period').textContent = 'Autumn and spring terms ' + ay(L);
    const parts = groups.map((g) => g.w + ' ' + joinAnd(g.names));
    $('sx-verdict').textContent = 'Absence is ' + (parts.length < 2 ? parts.join('') : parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1]);
    let t = `<b>${pc(me[1])}</b> of school time was missed here, against ` + joinAnd(cmp.map((c) => `${pc(c[1])} ${c[0] === 'England' ? 'across ' + c[3] : c[0] === 'similar schools' ? 'in ' + c[3] : 'in ' + esc(c[3])}`)) + '.';
    if (was && was[1] != null) { const d = gap(me[1], was[1]); t += d === 0 ? ' That is the same as a year earlier.' : ` That is <b>${pts(d)} percentage points ${d < 0 ? 'lower' : 'higher'}</b> than a year earlier.`; }
    $('sx-reading').innerHTML = t + ' <span id="sx-share"></span>';
    const row = (cls, name, a, p) => `<tr class="${cls}"><th scope="row">${name}</th><td class="n">${pc(a)}</td><td class="n">${pc(p)}</td></tr>`;
    $('sx-table').innerHTML = '<thead><tr><th></th><th class="n">Overall absence</th><th class="n">Persistent absence</th></tr></thead><tbody>' + row('me', 'This school', me[1], me[3])
      + cmp.map((c) => row('', c[0] === 'England' ? 'England, ' + PH[S.ph] : c[0] === 'similar schools' ? 'Its 20 similar schools' : esc(c[0]), c[1], c[2])).join('')
      + (was && was[1] != null ? row('prev', 'This school, a year earlier', was[1], was[3]) : '') + '</tbody>';
    $('sx-tnote').textContent = 'Persistent absence is the share of pupils who missed 10% or more of their half-days.' + (sim ? '' : S.ph === 'X' ? ' Special schools are not matched to similar schools.' : '');
  }

  function share() {          // where the school sits among all schools of its kind, in the first card
    const me = S.h[B.latest], el = $('sx-share'); if (!el || !me || me[1] == null || !DIST) return;
    const v = DIST.abs.filter((x) => x != null), hi = v.filter((x) => x > me[1]).length, p = Math.round(100 * hi / v.length);
    el.textContent = `${p}% of ${PH[S.ph]} in England had a higher rate.`;
  }

  function trend() {
    const el = $('sx-trend'), W = Math.max(280, Math.floor(el.getBoundingClientRect().width)), narrow = W < 520, H = narrow ? 240 : 300, m = {l: 38, r: narrow ? 46 : 60, t: 14, b: 28};
    const fy = B.fy.filter((p) => +p >= 2013), as = B.periods.filter((p) => p.endsWith('AS')), xs = fy.map((p) => +p).concat(as.map((p) => +p.slice(0, 4))), x0 = d3.min(xs), x1 = d3.max(xs);
    const val = (p) => (S.h[p] && S.h[p][1] != null ? S.h[p][1] : null), eng = (p) => { const b = bench('E', p); return b ? b[0] : null; };
    const all = fy.concat(as).flatMap((p) => [val(p), eng(p)]).filter((v) => v != null); el.innerHTML = ''; if (!all.length) { el.textContent = 'No earlier figures are published for this school.'; return; }
    const x = d3.scaleLinear([x0, x1], [m.l, W - m.r]), y = d3.scaleLinear([0, d3.max(all)], [H - m.b, m.t]).nice(5);
    const s = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', `Overall absence at ${S.n} and across England’s ${PH[S.ph]}, by school year`);
    y.ticks(5).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID); s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text(t / 100 + '%'); });
    d3.range(x0, x1 + 1).filter((yr) => (x1 - yr) % (narrow ? 3 : 2) === 0).forEach((yr) => s.append('text').attr('x', x(yr)).attr('y', H - 8).attr('text-anchor', 'middle').text(String(yr).slice(2) + '/' + String(yr + 1).slice(2)));
    const draw = (get, colour, w, name) => { const pf = d3.range(x0, +fy[fy.length - 1] + 1).map((yr) => ({yr, v: fy.includes(String(yr)) ? get(String(yr)) : null, p: String(yr)}))          /* a year with no figure breaks the line */, pa = as.map((p) => ({yr: +p.slice(0, 4), v: get(p), p, two: true})).filter((d) => d.v != null);
      s.append('path').attr('d', d3.line().defined((d) => d.v != null).x((d) => x(d.yr)).y((d) => y(d.v))(pf)).attr('fill', 'none').attr('stroke', colour).attr('stroke-width', w);
      if (pa.length > 1) s.append('path').attr('d', d3.line().x((d) => x(d.yr)).y((d) => y(d.v))(pa)).attr('fill', 'none').attr('stroke', colour).attr('stroke-width', w - 0.5).attr('stroke-dasharray', '4 3');
      s.append('g').selectAll('circle').data(pf.filter((d) => d.v != null).concat(pa)).join('circle').attr('cx', (d) => x(d.yr)).attr('cy', (d) => y(d.v)).attr('r', w + 1.5).attr('fill', (d) => (d.two ? '#fff' : colour)).attr('stroke', colour).attr('stroke-width', 1.5)
        .on('pointerenter pointermove', (ev, d) => showTip(ev, `<b>${esc(name)}</b><br>${d.two ? 'Autumn and spring terms ' : 'Full year '}${ay(d.p)}: ${pc(d.v)}`)).on('pointerleave', hideTip);
      const last = pa.length ? pa[pa.length - 1] : pf.filter((d) => d.v != null).pop(); if (last) s.append('text').attr('x', x(last.yr) + 8).attr('y', y(last.v) + 4).attr('class', 'strong').style('fill', colour).text(pc(last.v)); };
    draw(eng, SLATE, 2, 'England, ' + PH[S.ph]); draw(val, INK, 3, S.n);
    const k = document.createElement('div'); k.className = 'ax-key'; k.innerHTML = `<span><i style="background:${INK};height:3px"></i>${esc(S.n)}</span><span><i style="background:${SLATE};height:2px"></i>England, ${PH[S.ph]}</span><span><i style="background:#fff;border:1.5px solid ${INK};border-radius:50%;width:9px;height:9px"></i>Autumn and spring terms only</span>`; el.appendChild(k);
    $('sx-trend-n').textContent = 'Solid points are full school years. The open points are the autumn and spring terms alone, which is as far as the newest figures go; a full year includes the summer term and usually comes out higher. No figures were published for 2019/20.' + (S.join ? ' Earlier years include the school this one replaced.' : '');
  }

  function detail() {
    const L = B.latest, me = S.h[L] || [], e = bench('E', L), la = B.la_names[S.la], host = $('sx-detail'), out = [];
    if (me[2] != null) out.push(`<h3>Unauthorised absence</h3><p>${pc(me[2])} of school time was missed without the school’s agreement, against ${pc(e && e[1])} across England’s ${PH[S.ph]}.</p>`);
    const b0 = S.h[B.base], b1 = S.h[B.fy_last], eb0 = bench('E', B.base), eb1 = bench('E', B.fy_last);
    if (b0 && b1 && b0[1] != null && b1[1] != null) { const d = gap(b1[1], b0[1]), de = eb0 && eb1 ? gap(eb1[0], eb0[0]) : null;
      out.push(`<h3>Since before the pandemic</h3><p>Over the full year ${ay(B.fy_last)} overall absence was ${pc(b1[1])}, ${d === 0 ? 'the same as' : pts(d) + ' percentage points ' + (d > 0 ? 'higher than' : 'lower than')} in ${ay(B.base)} (${pc(b0[1])}).` + (de == null ? '' : ` Across England’s ${PH[S.ph]} the change was ${de > 0 ? 'a rise' : 'a fall'} of ${pts(de)}.`) + '</p>'); }
    if (S.nn) out.push('<h3>Its 20 similar schools</h3><p>The schools of the same kind most like this one in their pupils, size and setting. They are listed alphabetically.</p><div class="ax-tablewrap"><table class="ax-table sp-table" id="sx-simt"><tbody><tr><td>Loading…</td></tr></tbody></table></div>');
    if (S.g) { const g = GRADES[S.g[0]]; out.push(`<h3>Ofsted</h3><p>Ofsted graded attendance and behaviour <span class="ax-grade"><i style="background:${g[1]}"></i>${g[0]}</span>` + (S.g[1] ? ` at the inspection of ${dmy(S.g[1])}.` : '.') + (S.ph === 'S' ? ` <a href="/explorer/school/${urn}/">Its report card in the Ofsted Explorer</a>.` : '') + '</p>'); }
    const links = []; if (S.tid && S.multi) links.push(`<a href="${AXsearch.ghref('t', S.tid)}">${esc(S.tname || 'Its trust')}</a>`); if (la) links.push(`<a href="${AXsearch.ghref('a', S.la)}">${esc(la)}</a>`);
    if (links.length) out.push(`<h3>Where it sits</h3><div class="sp-links">${links.join('')}</div>`);
    host.innerHTML = out.join('');
    const fill = () => { const t = $('sx-simt'); if (!t || !DIST) return; d3.json('/attendance/data/schools.json').then((j) => { const nm = new Map(j.data.urn.map((u, i) => [u, [j.data.name[i], j.data.town[i]]])), ix = new Map(DIST.urn.map((u, i) => [u, i]));
        const rows = S.nn.map((u) => ({u, n: (nm.get(u) || ['School ' + u, ''])[0], town: (nm.get(u) || ['', ''])[1], a: ix.has(u) ? DIST.abs[ix.get(u)] : null, p: ix.has(u) ? DIST.pa[ix.get(u)] : null})).sort((a, b) => a.n.localeCompare(b.n));
        t.innerHTML = '<thead><tr><th></th><th class="n">Overall absence</th><th class="n">Persistent absence</th></tr></thead><tbody>' + rows.map((r) => `<tr><th scope="row"><a href="${AXsearch.href(r.u)}">${esc(r.n)}</a>${r.town ? ' <small>' + esc(r.town) + '</small>' : ''}</th><td class="n">${pc(r.a)}</td><td class="n">${pc(r.p)}</td></tr>`).join('') + '</tbody>'; }); };
    let done = false; $('sx-more').addEventListener('toggle', () => { if ($('sx-more').open && !done) { done = true; fill(); } });
  }

  Promise.all([d3.json('/attendance/data/bench.json'), null]).then(([b]) => { B = b; return d3.json(`/attendance/data/sch/${Number(urn) % B.shards}.json`); }).then((sh) => {
    S = sh && sh[urn]; if (!S) { $('sx-empty').hidden = false; $('sx-empty').textContent = 'No school with that number is in the DfE’s absence figures. Search above for another.'; return; }
    $('sx-body').hidden = false; first(); trend(); detail();
    const r = B.release; $('sx-source').innerHTML = `<b>Sources.</b> DfE, Pupil absence in schools in England: ${esc(r.autumn_spring.release.toLowerCase())}, published ${dmy(r.autumn_spring.published)}; ${esc(r.full_year.release.toLowerCase())}, published ${dmy(r.full_year.published)}. School details from Get Information about Schools.`;
    d3.json(`/attendance/data/dist_${S.ph}.json`).then((d) => { DIST = d; share(); if ($('sx-more').open) $('sx-more').dispatchEvent(new Event('toggle')); });
    let t = null, w = innerWidth; addEventListener('resize', () => { if (innerWidth === w) return; w = innerWidth; clearTimeout(t); t = setTimeout(trend, 200); });
  }).catch(() => { $('sx-empty').hidden = false; $('sx-empty').textContent = 'The figures could not be loaded. Please try again.'; });
})();
