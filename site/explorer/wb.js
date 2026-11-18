/* Disadvantaged pupils and the community the school serves (18 November 2026).
   Schools are grouped by the share of their pupils who are White British (school census, January 2026).
   Disadvantaged pupils' Attainment 8 is averaged over all disadvantaged pupils in each group (pupil-weighted).
   Descriptive only: ethnicity is never used in matching or in any expected score. The analysis behind it,
   with its pre-registered plan, found the same pattern in 2024/25 and 2025/26 after allowing for disadvantaged
   share, area deprivation, prior attainment, region and selection. */
(function () {
  const OE = window.OE, {f1} = OE;
  const ok = (v) => !(v === null || v === undefined || v === '' || isNaN(+v));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const rich = (parent, text) => { String(text).split('**').forEach((t, i) => { if (!t) return; parent.append(i % 2 ? el('b', '', t) : t); }); return parent; };
  const S = () => { const s = dash.data('school'); return s.status === 'ok' && s.data && s.data[0] ? s.data[0] : null; };
  const B = () => { const b = dash.data('wbBands'); return b.status === 'ok' ? b.data[0] : null; };
  const VERD = '#2F6F66', OTHER = '#C9CFD8', INK = '#0B1A2E';

  const EDGES = [0, 20, 50, 80, 90];
  const LABS = ['Under 20%', '20–49%', '50–79%', '80–89%', '90% or more'];
  const band = (x) => { if (!ok(x)) return -1; x = +x; let i = 0; EDGES.forEach((e, k) => { if (x >= e) i = k; }); return i; };
  const nDis = (r) => (ok(r.pupils) && ok(r.dis_pct) ? +r.pupils * +r.dis_pct / 100 : NaN);
  const wavg = (rows, k, w) => { let s = 0, n = 0; rows.forEach((r) => { const v = r[k], ww = w(r); if (ok(v) && ww > 0) { s += +v * ww; n += ww; } }); return n ? s / n : NaN; };

  dash.calc('wbBands', {inputs: ['ks4'], title: 'Disadvantaged results by White British share',
    description: 'Pupil-weighted Attainment 8 of disadvantaged and other pupils, by the share of pupils who are White British.',
    fn: (ks4) => {
      const rows = ks4.filter((r) => ok(r.wb_pct) && ok(r.dis_a8) && nDis(r) > 0);
      const bands = LABS.map((lab, i) => { const g = rows.filter((r) => band(r.wb_pct) === i);
        return {lab, n: g.length, dis: wavg(g, 'dis_a8', nDis), oth: wavg(g, 'nondis_a8', (r) => +r.pupils - nDis(r))}; });
      const cells = {}; rows.forEach((r) => { const k = band(r.wb_pct) + ':' + OE.disFifth(r.dis_pct); (cells[k] = cells[k] || []).push(r); });
      const cell = {}; Object.entries(cells).forEach(([k, g]) => { cell[k] = {n: g.length, dis: wavg(g, 'dis_a8', nDis)}; });
      const wb = rows.map((r) => +r.wb_pct).sort(d3.ascending);
      return [{bands, cell, nat: wavg(rows, 'dis_a8', nDis), median: d3.quantileSorted(wb, 0.5), n: rows.length}]; }});

  dash.draw('wbsub', (box) => { const b = B(); box.replaceChildren(); if (!b) return;
    rich(box, 'Across England’s secondaries, disadvantaged pupils average **' + f1(b.bands[0].dis) + '** Attainment 8 in schools where fewer than one pupil in five is White British, and **' + f1(b.bands[4].dis) + '** where nine in ten or more are. The gap is not explained by area deprivation, prior attainment or region, and it was the same in 2024/25. Results are 2025/26, provisional.'); });

  dash.draw('wb', (box) => {
    const r = S(), b = B(); box.replaceChildren();
    const sec = document.getElementById('community');
    if (!r || r.rc_only) { if (sec) sec.hidden = true; return; } if (sec) sec.hidden = false;
    if (!b) return;
    const i = band(r.wb_pct), q = OE.disFifth(r.dis_pct), nd = nDis(r);
    const showOwn = ok(r.dis_a8) && nd >= 10;
    const c = i >= 0 && q ? b.cell[i + ':' + q] : null, useCell = c && c.n >= 10;
    const grp = useCell ? c.dis : i >= 0 ? b.bands[i].dis : NaN, gn = useCell ? c.n : i >= 0 ? b.bands[i].n : 0;

    const tiles = el('div', 'oe-wbtiles');
    const tile = (lab, val, sub) => { const t = el('div', 'oe-wbt'); t.append(el('span', 'l', lab)); t.append(el('b', '', val)); if (sub) rich(t.appendChild(el('small')), sub); tiles.append(t); };
    tile('White British pupils', ok(r.wb_pct) ? f1(+r.wb_pct) + '%' : '—', 'Whole school, January 2026 census. Median secondary ' + f1(b.median) + '%.');
    tile('Disadvantaged pupils, Attainment 8', showOwn ? f1(+r.dis_a8) : '—', showOwn ? 'About ' + Math.round(nd) + ' pupils in the 2025/26 GCSE year group.' : 'Not reported: fewer than 10 disadvantaged pupils, or no published figure.');
    if (ok(grp)) { const d = showOwn ? +r.dis_a8 - grp : NaN;
      tile('Schools serving similar communities', f1(grp), (useCell ? gn + ' schools with a similar White British share (' + LABS[i].toLowerCase() + ') and the same disadvantaged fifth.' : gn + ' schools with a similar White British share (' + LABS[i].toLowerCase() + ').') + (ok(d) ? ' This school: **' + (Math.abs(d) < 0.05 ? 'level' : f1(Math.abs(d)) + ' points ' + (d > 0 ? 'above' : 'below')) + '**.' : '')); }
    tile('All disadvantaged pupils in England', f1(b.nat), 'Pupil-weighted, every secondary with a published figure.');

    // chart: two bars per band, this school's band marked and its disadvantaged figure as a diamond
    const fig = el('div', 'oe-wbchart');
    const W = Math.max(300, Math.min(640, (box.clientWidth || 640) - 0)), H = 250, m = {t: 18, r: 8, b: 44, l: 34};
    const x = d3.scaleBand().domain(d3.range(5)).range([m.l, W - m.r]).paddingInner(0.28).paddingOuter(0.1);
    const x2 = d3.scaleBand().domain([0, 1]).range([0, x.bandwidth()]).padding(0.08);
    const y = d3.scaleLinear().domain([0, 60]).range([H - m.b, m.t]);
    const svg = d3.select(fig).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('role', 'img')
      .attr('aria-label', 'Average Attainment 8 of disadvantaged and other pupils, by the share of pupils who are White British. ' + b.bands.map((d) => d.lab + ': disadvantaged ' + f1(d.dis) + ', other ' + f1(d.oth)).join('; ') + '.');
    svg.append('g').selectAll('line').data([0, 20, 40, 60]).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y).attr('y2', y).attr('stroke', '#EEF0F3');
    svg.append('g').selectAll('text').data([0, 20, 40, 60]).join('text').attr('x', m.l - 6).attr('y', (v) => y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', '#55627A').text((v) => v);
    if (i >= 0) svg.append('rect').attr('x', x(i) - 6).attr('width', x.bandwidth() + 12).attr('y', m.t - 10).attr('height', H - m.b - m.t + 10).attr('fill', 'rgba(201,162,75,.12)');
    const g = svg.append('g').selectAll('g').data(b.bands).join('g').attr('transform', (d, k) => `translate(${x(k)},0)`);
    [['oth', OTHER], ['dis', VERD]].forEach(([k, col], j) => {
      g.append('rect').attr('x', x2(j)).attr('width', x2.bandwidth()).attr('y', (d) => y(d[k])).attr('height', (d) => y(0) - y(d[k])).attr('fill', col);
      g.append('text').attr('x', x2(j) + x2.bandwidth() / 2).attr('y', (d) => y(d[k]) - 4).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', j ? VERD : '#55627A').attr('font-weight', j ? 600 : 400).text((d) => f1(d[k])); });
    g.append('text').attr('x', x.bandwidth() / 2).attr('y', H - m.b + 16).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', (d, k) => (k === i ? INK : '#55627A')).attr('font-weight', (d, k) => (k === i ? 600 : 400)).text((d) => d.lab);
    svg.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', '#55627A').text('Share of pupils who are White British');
    if (i >= 0 && showOwn) { const cx = x(i) + x2(1) + x2.bandwidth() / 2, cy = y(+r.dis_a8);
      svg.append('rect').attr('x', cx - 6).attr('y', cy - 6).attr('width', 12).attr('height', 12).attr('transform', `rotate(45 ${cx} ${cy})`).attr('fill', INK).attr('stroke', '#fff').attr('stroke-width', 2); }
    const leg = el('div', 'oe-plegend'); leg.innerHTML = '<span><i style="display:inline-block;width:12px;height:12px;background:' + VERD + '"></i>Disadvantaged pupils</span><span><i style="display:inline-block;width:12px;height:12px;background:' + OTHER + '"></i>Other pupils</span>' + (showOwn ? '<span><i class="me"></i>This school’s disadvantaged pupils</span>' : '') + (i >= 0 ? '<span><i style="display:inline-block;width:12px;height:12px;background:rgba(201,162,75,.35)"></i>This school’s band</span>' : '');
    fig.append(leg);
    box.append(tiles, fig);
  });

  dash.draw('wbnote', (box) => { const r = S(); box.replaceChildren(); if (!r || r.rc_only || !ok(r.wb_pct)) return;
    const w = +r.wb_pct;
    let t = w >= 80 ? 'Here at least four pupils in five are White British, so the school’s disadvantaged pupils are very largely White British too, and their figure is a fair guide to how that group is doing. The fairer comparison is with schools serving similar communities: against all disadvantaged pupils nationally, schools like this look further behind than they are, and against nothing the gap disappears from view.'
      : w >= 50 ? 'Most pupils here are White British, but not all, so the disadvantaged figure mixes pupils from different backgrounds. Read it as a guide to the school’s disadvantaged pupils as a whole.'
        : 'Fewer than half of pupils here are White British, so the disadvantaged figure covers pupils from many backgrounds and says little about disadvantaged White British pupils in particular. The DfE does not publish that figure for individual schools.';
    t += ' None of this lowers the bar: it shows where the gap is widest. Ethnicity is not used to choose similar schools or to set any expected score.';
    rich(box, t); });
})();
