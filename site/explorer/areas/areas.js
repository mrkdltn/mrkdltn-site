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
  const INK = '#0B1A2E', MUTED = '#8A96A8';

  const expand = (j) => { const rows = new Array(j.n); for (let i = 0; i < j.n; i++) { const o = {}; j.cols.forEach((c) => { const v = j.data[c][i]; o[c] = v === null || v === undefined ? '' : (j.codes[c] ? j.codes[c][v] : String(v)); }); rows[i] = o; } return rows; };
  const graded = (r, k) => r[k] in GC;
  const share = (rows, k) => { const g = rows.filter((r) => graded(r, k)); return {n: g.length, v: g.length ? 100 * g.filter((r) => BELOW.has(r[k])).length / g.length : null}; };
  const fifths = (rows, k) => { const v = rows.map((r) => +r[k]).filter((x) => r_ok(x)).sort(d3.ascending); return [0.2, 0.4, 0.6, 0.8].map((q) => d3.quantileSorted(v, q)); };
  const r_ok = (x) => x !== null && !isNaN(x) && isFinite(x);
  const fifthOf = (cuts, x) => (r_ok(x) ? 1 + cuts.filter((c) => x > c).length : null);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const rich = (e, s) => { s.split(/(\*\*[^*]+\*\*)/).forEach((p) => { if (/^\*\*/.test(p)) e.append(el('b', '', p.slice(2, -2))); else if (p) e.append(p); }); return e; };

  // the two chart forms live in chart.js, shared with the Discoveries pages
  const chart = (box, series, xlabels, opts) => OE.areaChart.line5(box, series, xlabels, opts);

  function render(rows, build) {
    const insp = rows.filter((r) => r.g_ach in GC);
    const matched = insp.filter((r) => MATCHED.has(r.ss_band_25));
    const byQ = (set, k) => d3.range(1, 6).map((q) => share(set.filter((r) => String(r.idaci_q).split('.')[0] === String(q)), k));
    const Q = ['Least', '2', '3', '4', 'Most'];

    // counts line
    const asof = document.getElementById('ar-asof');
    if (asof) asof.textContent = `${cnt(insp.length)} secondary schools with a report card and published results` + (build && build.built ? `, data checked ${new Date(build.built).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})}` : '') + '.';

    // A: same results, different grades, grouped by IDACI quintile (default) or disadvantaged fifth
    const disCuts = fifths(rows, 'dis_pct');
    const groupOf = (mode, r) => (mode === 'dis' ? fifthOf(disCuts, +r.dis_pct) : +String(r.idaci_q).split('.')[0] || null);
    const byG = (mode, set, k) => d3.range(1, 6).map((q) => share(set.filter((r) => groupOf(mode, r) === q), k));
    const top = (vals) => Math.max(40, Math.ceil(d3.max(vals.filter((p) => p.n >= MIN && p.v !== null), (p) => p.v) / 10) * 10);
    const p0 = d3.format('.0f');
    const MODES = {
      idaci: {x: 'IDACI fifth of pupils (area deprivation)', most: 'most deprived fifth', least: 'least deprived fifth', aria: 'IDACI fifth'},
      dis: {x: 'Fifth by disadvantaged share of GCSE year group', most: `fifth with the most disadvantaged pupils (over ${p0(disCuts[3])}%)`, least: `fifth with the fewest (under ${p0(disCuts[0])}%)`, aria: 'disadvantaged fifth'}};
    const ga = document.getElementById('ar-a'), lead = document.getElementById('ar-a-lead');
    const drawA = (mode) => {
      const M = MODES[mode]; ga.replaceChildren(); if (lead) lead.replaceChildren();
      const am = byG(mode, matched, 'g_ach');
      if (lead && am[0].n >= MIN && am[4].n >= MIN) rich(lead, `Among the **${cnt(matched.filter((r) => graded(r, 'g_ach')).length)}** inspected secondaries whose 2024/25 results were close to or above their similar schools, **${pc(am[4].v)}%** of those in the ${M.most} were graded below Expected standard for achievement, against **${pc(am[0].v)}%** in the ${M.least}.`);
      const yA = top(AREAS.flatMap(([k]) => byG(mode, insp, k).concat(byG(mode, matched, k))));
      const Q = mode === 'dis' ? ['Fewest', '2', '3', '4', 'Most'] : ['Least', '2', '3', '4', 'Most'];
      AREAS.forEach(([k, lab]) => {
        const all = byG(mode, insp, k), mm = byG(mode, matched, k);
        const card = el('figure', 'ar-fig'); card.dataset.k = k; card.append(el('figcaption', '', lab));
        const box = el('div', 'ar-ch'); card.append(box);
        chart(box, [{name: 'All inspected secondaries', pts: all, colour: MUTED, dash: '4 3'}, {name: 'Results close to or above similar schools', pts: mm, colour: INK, main: true}], Q,
          {aria: `${lab}: share below Expected standard by ${M.aria}`, xtitle: M.x, ymax: yA});
        const ok2 = mm[4].n >= MIN && mm[0].n >= MIN;
        card.append(el('p', 'ar-note', ok2 ? `Matched results: ${pc(mm[0].v)}% to ${pc(mm[4].v)}%, ${Q[0].toLowerCase()} to ${Q[4].toLowerCase()} (${cnt(mm[0].n)} and ${cnt(mm[4].n)} schools).` : 'Too few schools at one end to compare.'));
        ga.append(card); });
    };
    let modeNow = null;
    const setMode = (mode) => { if (!MODES[mode]) mode = 'idaci'; document.querySelectorAll('#ar-mode button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.mode === mode)));
      if (mode !== modeNow) { modeNow = mode; drawA(mode); } };
    setMode(view().by);
    document.querySelectorAll('#ar-mode button').forEach((b) => b.addEventListener('click', () => { keepView({by: b.dataset.mode === 'idaci' ? null : b.dataset.mode}); apply(false); /* redraws, keeping any focused area */ }));

    // B: grades travel together
    const gb = document.getElementById('ar-b');
    const achLow = insp.filter((r) => BELOW.has(r.g_ach)), achOk = insp.filter((r) => graded(r, 'g_ach') && !BELOW.has(r.g_ach));
    const blead = document.getElementById('ar-b-lead');
    const others = AREAS.filter(([k]) => k !== 'g_ach');
    const alone = achLow.filter((r) => !others.some(([k]) => BELOW.has(r[k]))).length;
    const okMax = d3.max(others, ([k]) => { const s = share(achOk, k); return s.n >= MIN ? s.v : 0; });
    if (blead && achLow.length >= MIN) rich(blead, `Of the **${cnt(achLow.length)}** secondaries graded below Expected standard for achievement, **${pc(100 * alone / achLow.length)}%** have no other area below Expected standard. Where achievement is Expected standard or better, no other area is below Expected standard in more than **${pc(okMax)}%** of schools.`);
    OE.areaChart.pairs(gb, others.map(([k, lab]) => { const a = share(achLow, k), b = share(achOk, k); return {label: lab, k, values: [a.v, b.v], n: [a.n, b.n]}; }),
      [['#FF8341', 'Achievement below Expected standard'], ['#5CD168', 'Achievement Expected standard or better']]);

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
      const card = el('figure', 'ar-fig'); card.dataset.k = k; card.append(el('figcaption', '', `${lab}, by ${ft.charAt(0).toLowerCase() + ft.slice(1)}`));
      const box = el('div', 'ar-ch'); card.append(box);
      chart(box, [{name: 'Inspected secondaries', pts, colour: INK, main: true}], xl, {aria: `${lab}: share below Expected standard by fifths of ${ft}`, xtitle: 'Fifths of all secondaries', ymax: yC});
      card.append(el('p', 'ar-note', `${cnt(d3.sum(pts, (p) => p.n))} inspected secondaries; fifths drawn across all ${cnt(rows.length)} secondaries with results.`));
      gc.append(card); });

    // a deep link (a Discovery's "Explore this") names the view in the hash: sec (section), by (grouping for the first
    // section: idaci or dis), focus (an area, g_ach, g_ab...). The view is applied after drawing, and again on hashchange.
    // sections in the "Going deeper" fold (#held, #inspected, #settling) are context.js's: it opens the fold, reads
    // sec and phase, and scrolls; this reader leaves them, and their keys, alone
    const apply = (scroll) => { const v = view(); setMode(v.by);
      if (v.sec && document.getElementById(v.sec) && document.getElementById(v.sec).closest('#deeper')) return;
      document.querySelectorAll('.ar-focus').forEach((e) => { e.classList.remove('ar-focus'); e.removeAttribute('aria-current'); });
      const sec = v.sec && document.getElementById(v.sec);
      const f = v.focus && (sec || document).querySelector(`[data-k="${CSS.escape(v.focus)}"]`);
      if (f) { f.classList.add('ar-focus'); f.setAttribute('aria-current', 'true'); }
      if (scroll && sec) requestAnimationFrame(() => (f && window.innerWidth < 700 ? f : sec).scrollIntoView({block: 'start'})); };
    apply(true);
    window.addEventListener('hashchange', () => { if (location.hash.includes('=')) apply(true); });
  }

  // view state in the address, as in the Explorer (dash.js): only a hash with '=' is a view; '#results' stays an anchor
  const view = () => { if (!location.hash.includes('=')) return {}; const o = {}; new URLSearchParams(location.hash.slice(1)).forEach((v, k) => { o[k] = v; }); return o; };
  const keepView = (p) => { const o = Object.assign(view(), p); Object.keys(o).forEach((k) => { if (o[k] === null || o[k] === undefined || o[k] === '') delete o[k]; });
    const s = new URLSearchParams(o).toString(); history.replaceState(null, '', location.pathname + location.search + (s ? '#' + s : '')); };

  Promise.all([d3.json('/explorer/data/ks4.json').then(expand), d3.json('/explorer/data/build.json').catch(() => null)])
    .then(([rows, build]) => { document.documentElement.classList.add('ar-ready'); render(rows, build); })
    .catch((e) => { const m = document.getElementById('ar-asof'); if (m) m.textContent = 'The data could not be loaded. Please refresh the page.'; console.error(e); });
})();
