// The national view's two chart forms, shared by /explorer/areas/ and the Discoveries pages (25 November 2026):
//   line5: share below Expected standard across five groups of schools, one or two series (d3, SVG);
//   pairs: one row per area, two bars each (HTML).
// Groups of fewer than 10 schools are never drawn. The points carry a <title> with the exact share and the number of
// schools behind it.
(() => {
  window.OE = window.OE || {};
  const MIN = 10;
  const pc = d3.format('.0f'), cnt = d3.format(',');
  const GRID = '#EEF1F5', AXIS = '#C5CCD8';
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };

  // series: [{name, pts: [{v, n}] x5, colour, main, dash}]; opts: {ymax, aria, xtitle, w, h}
  function line5(box, series, xlabels, opts) {
    const W = opts.w || 300, H = opts.h || 200, m = {t: 20, r: 40, b: opts.xtitle === '' ? 26 : 40, l: 40};
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
      const pts = s.pts.map((p, i) => ({...p, i})).filter((p) => p.v !== null && p.v !== undefined && p.n >= MIN);
      const line = d3.line().x((p) => x(p.i)).y((p) => y(p.v)).defined((p, k, a) => k === 0 || p.i === a[k - 1].i + 1);
      svg.append('path').attr('d', line(pts)).attr('fill', 'none').attr('stroke', s.colour).attr('stroke-width', s.main ? 2.5 : 1.75).attr('stroke-dasharray', s.dash || null);
      pts.forEach((p) => { svg.append('circle').attr('cx', x(p.i)).attr('cy', y(p.v)).attr('r', s.main ? 4 : 3).attr('fill', s.main ? s.colour : '#fff').attr('stroke', s.colour).attr('stroke-width', 1.5)
        .append('title').text(`${s.name}, ${xlabels[p.i].toLowerCase()}: ${pc(p.v)}% below Expected standard (${cnt(p.n)} schools)`); });
      const last = pts[pts.length - 1]; if (last && s.main) svg.append('text').attr('x', x(last.i) + 8).attr('y', y(last.v) + 4).attr('class', 'lab').attr('fill', s.colour).text(pc(last.v) + '%');
      const first = pts[0]; if (first && s.main) svg.append('text').attr('x', x(first.i)).attr('y', y(first.v) - 10).attr('text-anchor', 'middle').attr('class', 'lab').attr('fill', s.colour).text(pc(first.v) + '%');
    });
    return svg;
  }

  // rows: [{label, k, values: [a, b], n: [na, nb]}]; bars: [[colour, name], [colour, name]]
  function pairs(host, rows, bars) {
    rows.forEach((r) => {
      const row = el('div', 'tb-row'); if (r.k) row.dataset.k = r.k; row.append(el('div', 'tb-lab', r.label));
      const box = el('div', 'tb-bars');
      bars.forEach(([c, nm], i) => {
        const line = el('div', 'tb-line'), v = r.values[i], n = r.n[i];
        if (v === null || v === undefined || n < MIN) { line.append(el('span', 'tb-na', 'Too few schools')); box.append(line); return; }
        const bar = el('span', 'tb-bar'); bar.style.width = Math.max(0.5, v) + '%'; bar.style.background = c;
        bar.title = `${r.label}, ${nm.toLowerCase()}: ${pc(v)}% below Expected standard (${cnt(n)} schools)`;
        line.append(bar, el('span', 'tb-v', pc(v) + '%')); line.setAttribute('aria-label', bar.title); box.append(line); });
      row.append(box); host.append(row); });
  }

  // rows: [{label, raw: [est, lo, hi], controlled: [est, lo, hi], n_raw, n, reading, low}]; opts: {threshold, aria}
  // A dot-and-whisker chart in the style of the areas page's "Context, held constant": open verdigris circle for the
  // gap with deprivation alone, filled midnight circle with other context held constant (grey where too few schools
  // below Expected to read), 95% intervals as lines, the materiality threshold as a dashed brass line.
  function whisker(box, rows, opts) {
    const NS = 'http://www.w3.org/2000/svg', VERD = '#2F6F66', INK = '#0B1A2E', SOFT = '#8A96A8', BRASS = '#C9A24B';
    const sv = (t, a, p) => { const e = document.createElementNS(NS, t); Object.entries(a || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (p) p.append(e); return e; };
    const txt = (p, x, y, s, cls, a) => { const t = sv('text', Object.assign({x, y, class: cls}, a || {}), p); t.textContent = s; return t; };
    const pp = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
    const W = Math.max(300, Math.round(box.clientWidth || 300)), narrow = W < 600;
    const L = narrow ? 8 : 250, R = 16, T = 30, B = 46, RH = narrow ? 64 : 48;
    const H = T + rows.length * RH + B;
    const vals = rows.flatMap((r) => [r.raw, r.controlled].filter(Boolean).flatMap((c) => [c[1], c[2]]));
    const lo = Math.min(-10, Math.floor(Math.min(...vals) / 10) * 10), hi = Math.max(30, Math.ceil(Math.max(...vals) / 10) * 10);
    const x = (v) => L + (v - lo) / (hi - lo) * (W - L - R);
    const svg = sv('svg', {viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria}, box);
    for (let t = lo; t <= hi; t += 10) {
      sv('line', {x1: x(t), x2: x(t), y1: T - 6, y2: H - B + 4, stroke: t === 0 ? AXIS : GRID, 'stroke-width': t === 0 ? 1.5 : 1}, svg);
      txt(svg, x(t), H - B + 20, (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t), 'ax', {'text-anchor': 'middle'});
    }
    if (opts.threshold) { sv('line', {x1: x(opts.threshold), x2: x(opts.threshold), y1: T - 6, y2: H - B + 4, stroke: BRASS, 'stroke-width': 1, 'stroke-dasharray': '3 3'}, svg);
      txt(svg, x(opts.threshold) + 4, T - 12, `${opts.threshold}-point threshold`, 'ax'); }
    txt(svg, (L + W - R) / 2, H - 8, 'Percentage points, most vs least deprived fifth', 'ax t', {'text-anchor': 'middle'});
    rows.forEach((r, i) => {
      const top = T + i * RH, y0 = narrow ? top + 46 : top + RH / 2;
      if (narrow) { txt(svg, L, top + 15, r.label, 'rl'); txt(svg, L, top + 30, r.reading, 'ax rd'); }
      else { txt(svg, 0, y0 - 3, r.label, 'rl'); txt(svg, 0, y0 + 14, r.reading, 'ax rd'); }
      if (i) sv('line', {x1: narrow ? L : 0, x2: W - R, y1: top, y2: top, stroke: GRID}, svg);
      const mark = (c, dy, colour, filled, name, n) => { if (!c) return; const g = sv('g', {}, svg);
        sv('line', {x1: x(c[1]), x2: x(c[2]), y1: y0 + dy, y2: y0 + dy, stroke: colour, 'stroke-width': filled ? 2.5 : 1.75, 'stroke-linecap': 'round'}, g);
        sv('circle', {cx: x(c[0]), cy: y0 + dy, r: filled ? 5.5 : 4.5, fill: filled ? colour : '#FFFFFF', stroke: colour, 'stroke-width': 1.75}, g);
        const t = sv('title', {}, g); t.textContent = `${r.label}, ${name}: ${pp(c[0])} points (95% CI ${pp(c[1])} to ${pp(c[2])}), ${cnt(n)} schools`; };
      mark(r.raw, -7, VERD, false, 'deprivation alone', r.n_raw);
      mark(r.controlled, 7, r.low ? SOFT : INK, true, 'other context held constant' + (r.low ? ' (too few schools to read)' : ''), r.n);
    });
    return svg;
  }

  window.OE.areaChart = {line5, pairs, whisker, MIN};
})();
