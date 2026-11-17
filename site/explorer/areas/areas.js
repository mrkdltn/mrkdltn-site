// Report card areas in context: national view for secondary schools.
// Computed in the browser from the Explorer's own daily data, so it moves with every new report card.
(() => {
  const GC = {'Exceptional': '#0176E0', 'Strong standard': '#33903C', 'Expected standard': '#5CD168', 'Needs attention': '#FF8341', 'Urgent improvement': '#CE1E02'};
  const BELOW = new Set(['Needs attention', 'Urgent improvement']);
  const AREAS = [['g_ach', 'Achievement'], ['g_ct', 'Curriculum and teaching'], ['g_ab', 'Attendance and behaviour'], ['g_inc', 'Inclusion'],
    ['g_lg', 'Leadership and governance'], ['g_pd', 'Personal development and wellbeing'], ['g_p16', 'Post-16 provision']];
  const MATCHED = new Set(['Close to', 'Above', 'Well above']);
  const MIN = 10;
  const pc = d3.format('.0f'), cnt = d3.format(',');
  const INK = '#0B1A2E', MUTED = '#8A96A8', GRID = '#EEF1F5', AXIS = '#C5CCD8';

  const expand = (j) => { const rows = new Array(j.n); for (let i = 0; i < j.n; i++) { const o = {}; j.cols.forEach((c) => { const v = j.data[c][i]; o[c] = v === null || v === undefined ? '' : (j.codes[c] ? j.codes[c][v] : String(v)); }); rows[i] = o; } return rows; };
  const graded = (r, k) => r[k] in GC;
  const share = (rows, k) => { const g = rows.filter((r) => graded(r, k)); return {n: g.length, v: g.length ? 100 * g.filter((r) => BELOW.has(r[k])).length / g.length : null}; };
  const fifths = (rows, k) => { const v = rows.map((r) => +r[k]).filter((x) => r_ok(x)).sort(d3.ascending); return [0.2, 0.4, 0.6, 0.8].map((q) => d3.quantileSorted(v, q)); };
  const r_ok = (x) => x !== null && !isNaN(x) && isFinite(x);
  const fifthOf = (cuts, x) => (r_ok(x) ? 1 + cuts.filter((c) => x > c).length : null);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const rich = (e, s) => { s.split(/(\*\*[^*]+\*\*)/).forEach((p) => { if (/^\*\*/.test(p)) e.append(el('b', '', p.slice(2, -2))); else if (p) e.append(p); }); return e; };

  // small chart: share below Expected standard across five groups, one or two series
  function chart(box, series, xlabels, opts) {
    const W = 300, H = 200, m = {t: 20, r: 40, b: 40, l: 40};
    const ymax = opts.ymax || 50;
    const x = d3.scalePoint().domain(d3.range(5)).range([m.l, W - m.r]).padding(0.25);
    const y = d3.scaleLinear().domain([0, ymax]).range([H - m.b, m.t]);
    const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', opts.aria);
    [0, ymax / 2, ymax].forEach((t) => { svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID);
      svg.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').attr('class', 'ax').text(t + '%'); });
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', AXIS);
    xlabels.forEach((t, i) => svg.append('text').attr('x', x(i)).attr('y', H - m.b + 18).attr('text-anchor', 'middle').attr('class', 'ax').text(t));
    if (opts.xtitle) svg.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 4).attr('text-anchor', 'middle').attr('class', 'ax t').text(opts.xtitle);
    series.forEach((s) => {
      const pts = s.pts.map((p, i) => ({...p, i})).filter((p) => p.v !== null && p.n >= MIN);
      const line = d3.line().x((p) => x(p.i)).y((p) => y(p.v)).defined((p, k, a) => k === 0 || p.i === a[k - 1].i + 1);
      svg.append('path').attr('d', line(pts)).attr('fill', 'none').attr('stroke', s.colour).attr('stroke-width', s.main ? 2.5 : 1.75).attr('stroke-dasharray', s.dash || null);
      pts.forEach((p) => { svg.append('circle').attr('cx', x(p.i)).attr('cy', y(p.v)).attr('r', s.main ? 4 : 3).attr('fill', s.main ? s.colour : '#fff').attr('stroke', s.colour).attr('stroke-width', 1.5)
        .append('title').text(`${s.name}, ${xlabels[p.i].toLowerCase()}: ${pc(p.v)}% below Expected standard (${cnt(p.n)} schools)`); });
      const last = pts[pts.length - 1]; if (last && s.main) svg.append('text').attr('x', x(last.i) + 8).attr('y', y(last.v) + 4).attr('class', 'lab').attr('fill', s.colour).text(pc(last.v) + '%');
      const first = pts[0]; if (first && s.main) svg.append('text').attr('x', x(first.i)).attr('y', y(first.v) - 10).attr('text-anchor', 'middle').attr('class', 'lab').attr('fill', s.colour).text(pc(first.v) + '%');
    });
    return svg;
  }

  function render(rows, build) {
    const insp = rows.filter((r) => r.g_ach in GC);
    const matched = insp.filter((r) => MATCHED.has(r.ss_band_25));
    const byQ = (set, k) => d3.range(1, 6).map((q) => share(set.filter((r) => String(r.idaci_q).split('.')[0] === String(q)), k));
    const Q = ['Least', '2', '3', '4', 'Most'];

    // counts line
    const asof = document.getElementById('ar-asof');
    if (asof) asof.textContent = `${cnt(insp.length)} secondary schools with a report card and published results` + (build && build.built ? `, data checked ${new Date(build.built).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})}` : '') + '.';

    // A: same results, different grades
    const ach = {all: byQ(insp, 'g_ach'), m: byQ(matched, 'g_ach')};
    const lead = document.getElementById('ar-a-lead');
    if (lead && ach.m[0].n >= MIN && ach.m[4].n >= MIN) rich(lead, `Among the **${cnt(matched.filter((r) => graded(r, 'g_ach')).length)}** inspected secondaries whose 2024/25 results were close to or above their similar schools, **${pc(ach.m[4].v)}%** of those in the most deprived fifth were graded below Expected standard for achievement, against **${pc(ach.m[0].v)}%** in the least deprived fifth.`);
    const ga = document.getElementById('ar-a');
    const top = (vals) => Math.max(40, Math.ceil(d3.max(vals.filter((p) => p.n >= MIN && p.v !== null), (p) => p.v) / 10) * 10);
    const yA = top(AREAS.flatMap(([k]) => byQ(insp, k).concat(byQ(matched, k))));
    AREAS.forEach(([k, lab]) => {
      const all = byQ(insp, k), mm = byQ(matched, k);
      const card = el('figure', 'ar-fig'); card.append(el('figcaption', '', lab));
      const box = el('div', 'ar-ch'); card.append(box);
      chart(box, [{name: 'All inspected secondaries', pts: all, colour: MUTED, dash: '4 3'}, {name: 'Results close to or above similar schools', pts: mm, colour: INK, main: true}], Q,
        {aria: `${lab}: share below Expected standard by deprivation fifth`, xtitle: 'Deprivation fifth of pupils', ymax: yA});
      const gap = mm[4].n >= MIN && mm[0].n >= MIN ? mm[4].v - mm[0].v : null;
      card.append(el('p', 'ar-note', gap === null ? 'Too few schools at one end to compare.' : `Matched results: ${pc(mm[0].v)}% to ${pc(mm[4].v)}%, least to most deprived (${cnt(mm[0].n)} and ${cnt(mm[4].n)} schools).`));
      ga.append(card); });

    // B: grades travel together
    const gb = document.getElementById('ar-b');
    const achLow = insp.filter((r) => BELOW.has(r.g_ach)), achOk = insp.filter((r) => graded(r, 'g_ach') && !BELOW.has(r.g_ach));
    const blead = document.getElementById('ar-b-lead');
    const others = AREAS.filter(([k]) => k !== 'g_ach');
    const alone = achLow.filter((r) => !others.some(([k]) => BELOW.has(r[k]))).length;
    const okMax = d3.max(others, ([k]) => { const s = share(achOk, k); return s.n >= MIN ? s.v : 0; });
    if (blead && achLow.length >= MIN) rich(blead, `Of the **${cnt(achLow.length)}** secondaries graded below Expected standard for achievement, **${pc(100 * alone / achLow.length)}%** have no other area below Expected standard. Where achievement is Expected standard or better, no other area is below Expected standard in more than **${pc(okMax)}%** of schools.`);
    const W = 640, rowH = 46, H = others.length * rowH + 40, lx = 230;
    const svg = d3.select(gb).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Share of secondaries below Expected standard in each area, by achievement grade');
    const xs = d3.scaleLinear().domain([0, 100]).range([lx, W - 50]);
    [0, 25, 50, 75, 100].forEach((t) => { svg.append('line').attr('x1', xs(t)).attr('x2', xs(t)).attr('y1', 22).attr('y2', H - 8).attr('stroke', GRID); svg.append('text').attr('x', xs(t)).attr('y', 14).attr('text-anchor', 'middle').attr('class', 'ax').text(t + '%'); });
    others.forEach(([k, lab], i) => {
      const y0 = 28 + i * rowH; const a = share(achLow, k), b = share(achOk, k);
      svg.append('text').attr('x', lx - 12).attr('y', y0 + 17).attr('text-anchor', 'end').attr('class', 'rl').text(lab);
      [[a, '#FF8341', 0, 'Achievement below Expected standard'], [b, '#5CD168', 18, 'Achievement Expected standard or better']].forEach(([s, c, dy, nm]) => {
        if (s.n < MIN) return;
        svg.append('rect').attr('x', xs(0)).attr('y', y0 + dy).attr('width', Math.max(1, xs(s.v) - xs(0))).attr('height', 14).attr('fill', c).append('title').text(`${lab}, ${nm.toLowerCase()}: ${pc(s.v)}% below Expected standard (${cnt(s.n)} schools)`);
        svg.append('text').attr('x', xs(s.v) + 6).attr('y', y0 + dy + 11).attr('class', 'lab').text(pc(s.v) + '%'); });
    });

    // C: other context
    const gc = document.getElementById('ar-c');
    const ctx = [
      ['g_ab', 'Attendance and behaviour', 'nonmob_pct', 'Pupils who joined at the usual time (non-mobile %)', ['Least stable', '2', '3', '4', 'Most stable']],
      ['g_ct', 'Curriculum and teaching', 'pa_index', 'Prior attainment of the cohort', ['Lowest', '2', '3', '4', 'Highest']],
      ['g_inc', 'Inclusion', 'ehc_pct', 'Pupils with an EHC plan (%)', ['Fewest', '2', '3', '4', 'Most']]];
    const ctxPts = ctx.map(([k, , f]) => { const cuts = fifths(rows, f); return d3.range(1, 6).map((q) => share(insp.filter((r) => fifthOf(cuts, +r[f]) === q), k)); });
    const yC = top(ctxPts.flat());
    ctx.forEach(([k, lab, f, ft, xl], ci) => {
      const pts = ctxPts[ci];
      const card = el('figure', 'ar-fig'); card.append(el('figcaption', '', `${lab}, by ${ft.charAt(0).toLowerCase() + ft.slice(1)}`));
      const box = el('div', 'ar-ch'); card.append(box);
      chart(box, [{name: 'Inspected secondaries', pts, colour: INK, main: true}], xl, {aria: `${lab}: share below Expected standard by fifths of ${ft}`, xtitle: 'Fifths of all secondaries', ymax: yC});
      card.append(el('p', 'ar-note', `${cnt(d3.sum(pts, (p) => p.n))} inspected secondaries; fifths drawn across all ${cnt(rows.length)} secondaries with results.`));
      gc.append(card); });
  }

  Promise.all([d3.json('/explorer/data/ks4.json').then(expand), d3.json('/explorer/data/build.json').catch(() => null)])
    .then(([rows, build]) => { document.documentElement.classList.add('ar-ready'); render(rows, build); })
    .catch((e) => { const m = document.getElementById('ar-asof'); if (m) m.textContent = 'The data could not be loaded. Please refresh the page.'; console.error(e); });
})();
