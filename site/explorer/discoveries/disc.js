// Discoveries (/explorer/discoveries/): draws each discovery's chart with the national view's own chart code
// (areas/chart.js), from the frozen figures written into the page; adds the chart/table switch and PNG, SVG and CSV
// downloads (OE.exhibit) on a discovery's page; and filters the list by theme, keeping the choice in the address.
(() => {
  const OE = window.OE || {}, AC = OE.areaChart;
  const INK = '#0B1A2E', MUTED = '#8A96A8';
  const pc = (v) => (v === null || v === undefined ? '' : (Math.round(v * 10) / 10).toFixed(1));

  const draw = (box) => {
    let spec; try { spec = JSON.parse(box.dataset.chart); } catch (e) { console.error(e); return null; }
    if (!AC) return spec;
    box.replaceChildren();
    if (spec.form === 'whisker') {
      AC.whisker(box, spec.rows, {threshold: spec.threshold, aria: spec.title});
      if (spec.small) { const s = box.querySelector('svg'); if (s) { s.setAttribute('aria-hidden', 'true'); s.removeAttribute('role'); s.querySelectorAll('title').forEach((t) => t.remove()); } }
    } else if (spec.form === 'pairs') {
      AC.pairs(box, spec.rows.map((r) => ({label: r.label, k: r.k, values: r.values, n: r.n})), spec.legend);
    } else {
      const series = spec.series.map((s) => ({name: s.name, main: !!s.main, colour: s.main ? INK : MUTED, dash: s.main ? null : '4 3',
        pts: s.values.map((v, i) => ({v, n: s.n[i]}))}));
      series.sort((a, b) => a.main - b.main); // the main line drawn last, on top, as on the areas page
      AC.line5(box, series, spec.x, {ymax: spec.ymax, aria: spec.title, xtitle: spec.small ? '' : spec.xtitle});
      if (spec.small) { const s = box.querySelector('svg'); if (s) { s.setAttribute('aria-hidden', 'true'); s.removeAttribute('role'); s.querySelectorAll('title').forEach((t) => t.remove()); } }
    }
    return spec;
  };

  const sgn = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
  const tableOf = (spec) => {
    if (spec.form === 'whisker') {
      const c = (v) => `${sgn(v[0])} (${sgn(v[1])} to ${sgn(v[2])})`;
      return {caption: spec.title, cols: ['Area', 'Deprivation alone, points (95% CI)', 'Schools', 'Context held constant, points (95% CI)', 'Schools', 'Reading'],
        num: [false, true, true, true, true, false],
        rows: spec.rows.map((r) => ({cells: [r.label, c(r.raw), r.n_raw, c(r.controlled), r.n, r.reading]})),
        csvCols: ['area', 'raw_pp', 'raw_lo', 'raw_hi', 'schools_raw', 'controlled_pp', 'controlled_lo', 'controlled_hi', 'schools_controlled', 'reading'],
        csv: spec.rows.map((r) => [r.label, ...r.raw, r.n_raw, ...r.controlled, r.n, r.reading])};
    }
    if (spec.form === 'pairs') {
      const names = (spec.legend || []).map((l) => l[1]);
      return {caption: spec.title, cols: ['Area'].concat(names.flatMap((n) => [n + ': % below Expected standard', 'Schools'])), num: [false, true, true, true, true],
        rows: spec.rows.map((r) => ({cells: [r.label].concat(r.values.flatMap((v, i) => [pc(v), r.n[i]]))}))};
    }
    return {caption: spec.title, cols: ['Group'].concat(spec.series.flatMap((s) => [s.name + ': % below Expected standard', 'Schools'])),
      num: [false].concat(spec.series.flatMap(() => [true, true])),
      rows: spec.x.map((x, i) => ({cells: [x].concat(spec.series.flatMap((s) => [pc(s.values[i]), s.n[i]]))}))};
  };

  // a discovery's page: one chart, with its table and downloads
  const main = document.getElementById('dc-chart');
  if (main) {
    const spec = draw(main);
    if (spec && OE.exhibit) {
      OE.exhibit({host: main, name: 'discovery-' + spec.id, noSchool: true, title: () => spec.title, source: () => spec.source,
        version: () => spec.version, kinds: spec.form === 'pairs' ? ['CSV'] : ['PNG', 'SVG', 'CSV'], table: () => tableOf(spec),
        svg: () => { const s = main.querySelector('svg'); if (!s) return null; const vb = s.viewBox.baseVal; return {node: s, w: vb.width, h: vb.height, live: true}; }});
    }
  }

  // the list: small charts and the theme filter
  document.querySelectorAll('.dc-mini[data-chart]').forEach(draw);
  const filt = document.querySelector('.dc-filter');
  if (filt) {
    const items = [...document.querySelectorAll('.dc-item')], count = document.getElementById('dc-count');
    const view = () => { const o = {}; if (location.hash.includes('=')) new URLSearchParams(location.hash.slice(1)).forEach((v, k) => { o[k] = v; }); return o; };
    const apply = (theme, write) => {
      const btns = [...filt.querySelectorAll('button')];
      if (!btns.some((b) => b.dataset.theme === theme)) theme = '';
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === theme)));
      let n = 0; items.forEach((li) => { li.hidden = !!theme && li.dataset.theme !== theme; n += !li.hidden; });
      const lab = theme ? filt.querySelector(`button[data-theme="${theme}"]`).textContent.toLowerCase() : '';
      if (count) count.textContent = n ? `${n} discover${n === 1 ? 'y' : 'ies'}${lab ? ' on ' + lab : ''}, newest first.` : `No discoveries on ${lab} yet.`;
      if (write) history.replaceState(null, '', location.pathname + location.search + (theme ? '#theme=' + theme : ''));
    };
    filt.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => apply(b.dataset.theme, true)));
    apply(view().theme || '', false);
    window.addEventListener('hashchange', () => apply(view().theme || '', false));
  }
})();
