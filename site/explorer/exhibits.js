/* The school's own figures as exhibits (benchmarks item 2a): the strip among the 50, each report card area beside
   comparable schools, "How alike are they?" and the map. Each gets a table view, PNG / SVG / CSV downloads and a
   source line (exhibit.js). Tables and exports read what each draw left on OE.xd, so they match the chart. */
(() => {
  const OE = window.OE; if (!OE || !OE.exhibit) return;
  const {GC, GORDER, f1} = OE; const NS = 'http://www.w3.org/2000/svg';
  const S = () => { const s = dash.data('school'); return s.status === 'ok' && s.data && s.data[0] ? s.data[0] : null; };
  const N = () => { const n = dash.data('neigh'); return n.status === 'ok' ? n.data : []; };
  const ok = (v) => !(v === null || v === undefined || v === '' || isNaN(+v));
  const pc = d3.format('.0f'), cnt = d3.format(',');
  const DARK = new Set(['Expected standard', 'Needs attention']);
  const SANS = '"Hanken Grotesk",Arial,sans-serif';
  const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (text !== undefined) e.textContent = text; return e; };
  const T = (x, y, s, size, o = {}) => mk('text', {x, y, style: `font-family:${SANS};font-size:${size}px;font-weight:${o.w || 400};fill:${o.fill || '#0B1A2E'}`, 'text-anchor': o.anchor || 'start'}, s);
  const liveSvg = (host) => { const s = host.querySelector('svg'); if (!s) return null; const vb = (s.getAttribute('viewBox') || '').split(/\s+/).map(Number); return {node: s, w: vb[2] || s.clientWidth, h: vb[3] || s.clientHeight, live: true}; };
  const q = (sel) => document.querySelector(sel);
  const P0 = () => dash.params();
  // exports always capture the finished chart: stop any intro animation and redraw without it
  // (d3 applies even a zero-length transition on a later frame, so wait until none is pending)
  const settled = async (sel, name) => { const sm = OE.smooth; OE.smooth = () => false;
    try { d3.selectAll(sel + ' *').interrupt(); dash.draw(name); } finally { OE.smooth = sm; }
    // timerFlush runs transitions whose time has come even where the browser has paused animation frames (a background tab)
    for (let i = 0; i < 80 && [...document.querySelectorAll(sel + ' *')].some((e) => e.__transition); i++) { await new Promise((r) => setTimeout(r, 50)); d3.timerFlush(); }
    return liveSvg(q(sel)); };
  const SRC_KS4 = 'DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)';
  const SRC_OF = 'Ofsted report cards (management information to 31 October 2026, and report cards published since)';
  const SRC_SIM = 'similar schools from the open replica of the DfE and Ofsted similar-schools model (technical note, 16 July 2026)';

  // ---------- 1. the strip: where the school sits among its 50 ----------
  OE.exhibit({name: 'strip-50-similar-schools', host: q('#strip [data-draw="strip"]'),
    title: () => 'Where the school sits among its 50 similar schools: ' + OE.MEAS[OE.meas()].label + ', 2025/26',
    key: () => 'Each dot is one similar school, coloured by its Achievement grade (grey: no report card yet). The diamond is this school, the line the group average, the shaded band the middle half of the 50. Dots are spread vertically only so they do not overlap.',
    source: () => SRC_KS4 + '; ' + SRC_OF + '; ' + SRC_SIM + '.',
    svg: () => settled('#strip [data-draw="strip"]', 'strip'), onChart: () => dash.draw('strip'),
    table: () => { const r = S(), nb = N(); if (!r || !nb.length) return null; const m = OE.meas(), M = OE.MEAS[m];
      const all = nb.concat([r]).filter((x) => ok(x[m])).sort((a, b) => +b[m] - +a[m]);
      const rows = all.map((x, i) => ({self: x === r, cells: [i + 1, x === r ? x.name + ' (this school)' : x.name, x.la, OE.mfmt(x[m], m), x.g_ach || 'No report card yet']}));
      return {caption: M.label + ' of the school and its 50 similar schools', cols: ['Rank', 'School', 'Local authority', M.short + ', 2025/26', 'Achievement grade'], num: [1, 0, 0, 1, 0], rows,
        note: 'Ranked on ' + M.label + ' among the 50 similar schools and this school. The group average is ' + OE.mfmt(m === 'a8' ? r.ss_mean : r[m + '_ss'], m) + '.',
        csvCols: ['rank', 'relation', 'urn', 'school', 'local_authority', m + '_2025_26', 'achievement_grade'],
        csv: all.map((x, i) => [i + 1, x === r ? 'this school' : 'similar school', x.urn, x.name, x.la, x[m], x.g_ach || ''])}; }});

  // ---------- 2. each report card area beside comparable schools ----------
  const grp = (g) => { const d = g.dist; if (!d || d.n < 10) return null; const p = {}; GORDER.forEach((G) => { p[G] = 100 * (d[G] || 0) / d.n; }); return {n: d.n, p, c: d}; };
  OE.exhibit({name: 'report-card-areas', host: q('#areas [data-draw="areas"]'), hideAlso: [q('#areas .oe-arleg')], onChart: () => dash.draw('areas'),
    title: () => { const x = OE.xd.areas; const a = x && x.all.find((v) => v.key === x.sel); return 'How schools like this are graded' + (a ? ': ' + a.area : ''); },
    source: () => { const x = OE.xd.areas, gl = x ? x.all.flatMap((a) => a.groups.map((g) => g.gl)).join(' ') : '';
      return SRC_OF + '; IDACI quintiles from Ofsted' + (/disadvantaged/i.test(gl) ? '; disadvantaged fifths from ' + SRC_KS4 : '') + (/similar/i.test(gl) ? '; ' + SRC_SIM : '') + '. Groups of fewer than 10 schools are not shown.'; },
    table: () => { const x = OE.xd.areas; if (!x || !x.all.length) return null; const rows = [], csv = [];
      x.all.forEach((a) => a.groups.forEach((g) => { const v = grp(g);
        rows.push({self: a.key === x.sel, cells: [a.area, a.grade, g.gl, v ? cnt(v.n) : (g.why || 'Fewer than 10')].concat(GORDER.slice().reverse().map((G) => (v ? pc(v.p[G]) + '%' : ''))).concat([v ? pc(v.p['Needs attention'] + v.p['Urgent improvement']) + '%' : ''])});
        csv.push([a.area, a.grade, g.gl, v ? v.n : ''].concat(GORDER.slice().reverse().map((G) => (v ? v.c[G] || 0 : ''))).concat(GORDER.slice().reverse().map((G) => (v ? v.p[G].toFixed(1) : ''))).concat([v ? '' : (g.why || 'fewer than 10 schools')])); }));
      const GR = GORDER.slice().reverse();
      return {caption: 'Report card grades of comparable schools, for every area of this school\'s report card', cols: ['Area', 'This school', 'Compared with', 'Schools'].concat(GR.map((G) => G), ['Below Expected']), num: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1], rows,
        note: 'Share of schools in each group with each grade. Rows for the area shown on the chart are highlighted. Groups of fewer than 10 schools are not shown.',
        csvCols: ['area', 'this_school_grade', 'compared_with', 'schools'].concat(GR.map((G) => 'n_' + G.toLowerCase().replace(/ /g, '_')), GR.map((G) => 'pct_' + G.toLowerCase().replace(/ /g, '_')), ['note']), csv}; },
    svg: () => { const x = OE.xd.areas; const a = x && x.all.find((v) => v.key === x.sel); if (!a) return null; const W = 960, g = mk('g'); let y = 0;
      // legend
      let lx = 0; GORDER.forEach((G) => { g.append(mk('rect', {x: lx, y: y + 2, width: 12, height: 12, fill: GC[G]})); g.append(T(lx + 18, y + 12, G, 13, {fill: '#55627A'})); lx += 26 + G.length * 7.2; });
      g.append(mk('path', {d: `M${lx} ${y + 3} l12 0 l-6 9 z`, fill: '#0B1A2E'})); g.append(T(lx + 18, y + 12, "This school's grade", 13, {fill: '#55627A'})); y += 40;
      g.append(T(0, y + 6, a.area, 18, {w: 600})); const cw = a.grade.length * 7.4 + 20; g.append(mk('rect', {x: W - cw, y: y - 12, width: cw, height: 24, rx: 12, fill: GC[a.grade]})); g.append(T(W - cw / 2, y + 4, a.grade, 13, {w: 600, fill: DARK.has(a.grade) ? '#0B1A2E' : '#FFFFFF', anchor: 'middle'})); y += 30;
      a.groups.forEach((gr) => { const v = grp(gr); g.append(T(0, y + 14, gr.gl, 14, {w: 500})); if (v) g.append(T(W, y + 14, cnt(v.n) + ' schools', 13, {fill: '#55627A', anchor: 'end'})); y += 30;
        if (!v) { g.append(mk('rect', {x: 0, y, width: W, height: 32, fill: '#EEF0F3'})); g.append(T(0, y + 54, gr.why || ('Only ' + (gr.dist ? gr.dist.n : 0) + ' schools: too few to show'), 13, {fill: '#55627A'})); y += 76; return; }
        let acc = 0, mx = null; GORDER.forEach((G) => { const w = v.p[G] / 100 * W; if (!w) return; g.append(mk('rect', {x: acc, y, width: w, height: 32, fill: GC[G]}));
          if (v.p[G] >= 6) g.append(T(acc + w / 2, y + 21, pc(v.p[G]) + '%', 14, {w: 500, fill: DARK.has(G) ? '#0B1A2E' : '#FFFFFF', anchor: 'middle'}));
          if (G === a.grade) { g.append(mk('rect', {x: acc + 1, y: y + 1, width: Math.max(0, w - 2), height: 30, fill: 'none', stroke: '#0B1A2E', 'stroke-width': 2})); mx = acc + w / 2; } acc += w; });
        if (mx !== null) g.append(mk('path', {d: `M${mx - 7} ${y - 11} l14 0 l-7 9 z`, fill: '#0B1A2E'}));
        g.append(T(0, y + 54, pc(v.p['Needs attention'] + v.p['Urgent improvement']) + '% below Expected standard', 13, {fill: '#33405A'})); y += 76; });
      const s = mk('svg'); s.append(g); return {node: s, w: W, h: y}; }});

  // ---------- 3. How alike are they? ----------
  OE.exhibit({name: 'how-alike', host: q('#strip [data-draw="profile"]'), hideAlso: [q('#strip .oe-plegend')],
    title: () => 'How alike are the 50 similar schools? Each factor in the model',
    source: () => 'DfE, Key stage 4 performance 2025/26 and 2023/24; DfE, Schools, pupils and their characteristics and Special educational needs in England, January 2026; weights from the DfE and Ofsted similar schools technical note (16 July 2026); ' + SRC_SIM + '.',
    table: () => { const p = OE.xd.profile; if (!p || !p.length) return null;
      const rows = p.map((x) => ({self: false, cells: [x.lab, x.w, x.fmt(x.me), x.fmt(x.min), x.fmt(x.mean), x.fmt(x.max), x.fmt(x.nat), x.me < x.min || x.me > x.max ? 'Outside' : 'Inside']}));
      return {caption: 'Each factor in the similar-schools model: this school, the range and average of its 50 similar schools, and England', cols: ['Factor', 'Weight', 'This school', 'Lowest of the 50', 'Average of the 50', 'Highest of the 50', 'England average', 'Range of the 50'], num: [0, 1, 1, 1, 1, 1, 1, 0], rows,
        csvCols: ['factor', 'weight', 'this_school', 'min_of_50', 'mean_of_50', 'max_of_50', 'england_mean', 'outside_range'], csv: p.map((x) => [x.lab, x.w, x.me, x.min, +x.mean.toFixed(3), x.max, +x.nat.toFixed(3), x.me < x.min || x.me > x.max ? 'yes' : 'no'])}; },
    svg: () => { const p = OE.xd.profile; if (!p || !p.length) return null; const W = 960, L = 250, TW = 470, VX = [800, 880, 960], g = mk('g'); let y = 0;
      const lg = [['me', 'This school'], ['gm', 'Average of the 50'], ['nm', 'England average']]; let lx = 0;
      lg.forEach(([k, t]) => { if (k === 'me') g.append(mk('path', {d: `M${lx + 7} ${y + 1} l7 7 l-7 7 l-7 -7 z`, fill: '#0B1A2E', stroke: '#FFFFFF', 'stroke-width': 1.5})); else g.append(mk('rect', {x: lx + 5, y: y, width: k === 'gm' ? 3 : 2, height: 16, fill: k === 'gm' ? '#2F6F66' : '#55627A'})); g.append(T(lx + 20, y + 13, t, 13, {fill: '#55627A'})); lx += 40 + t.length * 7; });
      g.append(mk('rect', {x: lx + 4, y: y + 3, width: 26, height: 10, fill: 'rgba(47,111,102,.24)'})); g.append(T(lx + 36, y + 13, 'Range of the 50', 13, {fill: '#55627A'}));
      [['School', '#0B1A2E'], ['The 50', '#2F6F66'], ['England', '#55627A']].forEach(([t, c], i) => g.append(T(VX[i], y + 38, t, 13, {w: 600, fill: c, anchor: 'end'}))); y += 50;
      p.forEach((x) => { const out = x.me < x.min || x.me > x.max; const X = (v) => L + TW * (v - x.lo) / ((x.hi - x.lo) || 1);
        g.append(mk('line', {x1: 0, x2: W, y1: y, y2: y, stroke: '#D8DDE5'}));
        g.append(T(0, y + 24, x.lab, 14, {w: 500})); g.append(T(0, y + 41, 'weight ' + x.w + (out ? ' · outside the range of the 50' : ''), 12, {fill: out ? '#A3402B' : '#55627A', w: out ? 600 : 400}));
        const ty = y + 18; g.append(mk('rect', {x: L, y: ty, width: TW, height: 14, fill: '#EEF0F3'})); g.append(mk('rect', {x: X(x.min), y: ty, width: Math.max(1, X(x.max) - X(x.min)), height: 14, fill: 'rgba(47,111,102,.24)'}));
        g.append(mk('rect', {x: X(x.nat) - 1, y: ty - 4, width: 2, height: 22, fill: '#55627A'})); g.append(mk('rect', {x: X(x.mean) - 1.5, y: ty - 4, width: 3, height: 22, fill: '#2F6F66'}));
        g.append(mk('path', {d: `M${X(x.me)} ${ty - 2} l9 9 l-9 9 l-9 -9 z`, fill: '#0B1A2E', stroke: '#FFFFFF', 'stroke-width': 2}));
        [[x.fmt(x.me), out ? '#A3402B' : '#0B1A2E', 600], [x.fmt(x.mean), '#0B1A2E', 400], [x.fmt(x.nat), '#55627A', 400]].forEach(([t, c, w], i) => g.append(T(VX[i], y + 30, t, 14, {fill: c, w, anchor: 'end'})));
        y += 56; });
      const s = mk('svg'); s.append(g); return {node: s, w: W, h: y}; }});

  // ---------- 4. the map ----------
  OE.exhibit({name: 'map-50-similar-schools', host: q('#map .oe-mapwrap'),
    title: () => 'Where the 50 similar schools are',
    key: () => 'The dark diamond is this school; coloured dots are its 50 similar schools, by Achievement grade (blue-grey: no report card yet), joined to it by lines. Small grey dots are every other secondary.',
    source: () => 'School locations from DfE, Get Information about Schools; distances are straight-line miles between school postcodes; ' + SRC_SIM + '. Coastline for orientation only.',
    svg: () => settled('#map [data-draw="map"]', 'map'),
    table: () => { const d = OE.xd.map; if (!d || !d.length) return null; const mi = d3.format('.0f');
      return {caption: 'The 50 similar schools by distance from this school', cols: ['Similar school', 'Local authority', 'Region', 'Miles away', 'Attainment 8', 'Achievement grade'], num: [0, 0, 0, 1, 1, 0],
        rows: d.map(([x, m]) => ({self: false, cells: [x.name, x.la, x.region, mi(m), f1(+x.a8), x.g_ach || 'No report card yet']})),
        note: 'Nearest first. Straight-line distance between school postcodes. The table of 50 above sorts by any column.',
        csvCols: ['urn', 'school', 'local_authority', 'region', 'miles', 'a8', 'achievement_grade', 'lat', 'lng'], csv: d.map(([x, m]) => [x.urn, x.name, x.la, x.region, +m.toFixed(1), x.a8, x.g_ach || '', x.lat, x.lng])}; },
    onChart: () => dash.draw('map')});

  // ================= 2b: the national picture and the method figures =================
  const optText = (id) => { const e = document.getElementById(id); return e && e.selectedIndex >= 0 ? e.options[e.selectedIndex].text : ''; };
  const XSRC = {dis_pct: SRC_KS4, pa_index: 'DfE, Key stage 4 performance 2023/24 (prior attainment)', ss_mean: SRC_SIM, cva_exp: 'the Explorer’s contextual model', sensup_pct: 'DfE, Special educational needs in England, January 2026', eal_school: 'DfE, Schools, pupils and their characteristics, January 2026'};
  const live = (sel) => getComputedStyle(document.querySelector(sel) || document.body);
  const GR = GORDER.slice().reverse(); const gkey = (G) => G.toLowerCase().replace(/ /g, '_');

  // ---------- 5. every secondary: results against context ----------
  OE.exhibit({name: 'national-scatter', host: q('#national [data-draw="scatter"]'), hideAlso: [q('#national .oe-legend')],
    title: () => 'Every secondary school: Attainment 8 against ' + optText('oe-x'),
    key: () => 'Each dot is a school, coloured by its report card grade for ' + optText('oe-area') + ' (grey: no report card yet). The diamond is this school; its 50 similar schools are ringed.',
    source: () => [...new Set([SRC_KS4, XSRC[P0().x] || SRC_KS4, SRC_OF])].join('; ') + '.',
    svg: () => settled('#national [data-draw="scatter"]', 'scatter'), onChart: () => dash.draw('scatter'),
    table: () => { const k = dash.data('ks4'); if (k.status !== 'ok') return null; const p = P0(), r = S(), nb = N(), ids = new Set(nb.map((x) => x.urn)); const xl = optText('oe-x'), al = optText('oe-area');
      const all = k.data.filter((x) => ok(x[p.x]) && ok(x.a8)); const fx = (v) => (+v).toFixed(1);
      const shown = (r ? [r] : []).concat(nb).filter((x) => ok(x[p.x]) && ok(x.a8));
      return {caption: 'This school and its 50 similar schools on the national chart', cols: ['School', 'Local authority', xl, 'Attainment 8', al], num: [0, 0, 1, 1, 0],
        rows: shown.map((x) => ({self: !!r && x.urn === r.urn, cells: [r && x.urn === r.urn ? x.name + ' (this school)' : x.name, x.la, fx(x[p.x]), fx(x.a8), x[p.area] || 'No report card yet']})),
        note: 'The table shows this school and its 50 similar schools. The CSV has all ' + all.length.toLocaleString('en-GB') + ' schools on the chart.',
        csvCols: ['urn', 'school', 'local_authority', 'relation', p.x, 'a8', p.area], csv: all.map((x) => [x.urn, x.name, x.la, r && x.urn === r.urn ? 'this school' : ids.has(x.urn) ? 'similar school' : '', x[p.x], x.a8, x[p.area] || ''])}; }});

  // ---------- 6. report card grades by pupils' deprivation ----------
  OE.exhibit({name: 'grades-by-deprivation', noSchool: true, host: q('#allphases [data-draw="idaci"]'),
    title: () => 'Report card grades by pupils’ deprivation: ' + optText('oe-area2') + ', ' + optText('oe-phase').toLowerCase() + ' schools',
    key: () => 'Each bar is one IDACI fifth, from the least deprived (top) to the most deprived. The number in brackets is schools with a grade in this area.',
    source: () => SRC_OF + '; IDACI quintiles from Ofsted, based on pupils’ home postcodes.',
    svg: () => settled('#allphases [data-draw="idaci"]', 'idaci'), onChart: () => dash.draw('idaci'),
    table: () => { const d = dash.data('idaci'); if (d.status !== 'ok' || !d.data) return null; const L = (v) => (String(v) === '1' ? '1 (least deprived)' : String(v) === '5' ? '5 (most deprived)' : String(v));
      return {caption: 'Report card grades by IDACI quintile', cols: ['IDACI fifth', 'Schools'].concat(GR), num: [0, 1, 1, 1, 1, 1, 1],
        rows: d.data.map((r) => ({cells: [L(r.quintile), cnt(r.n)].concat(GR.map((G) => (r.n ? pc(100 * r[G] / r.n) + '%' : '')))})),
        note: 'Share of schools in each fifth with each grade.',
        csvCols: ['idaci_quintile', 'schools'].concat(GR.map((G) => 'n_' + gkey(G))), csv: d.data.map((r) => [r.quintile, r.n].concat(GR.map((G) => r[G])))}; }});

  // ---------- 7. does the replica behave like Ofsted's model? (already a table: CSV and source only) ----------
  OE.exhibit({name: 'replica-check', noSchool: true, host: q('#validate .oe-tw'), noTable: true, kinds: ['CSV'],
    title: () => 'Does the replica behave like Ofsted’s model?',
    source: () => 'Ofsted’s published split of secondaries’ Achievement grades against their similar schools (2024/25 results); the replica: DfE, Key stage 4 performance 2024/25 (final) and ' + SRC_SIM + '.',
    table: () => { const v = dash.data('valid'); if (v.status !== 'ok') return null;
      return {cols: [], rows: [], csvCols: ['achievement_grade', 'schools', 'above_pct', 'close_to_pct', 'below_pct', 'ofsted_published_above_close_below'], csv: v.data.map((r) => [r.grade, r.n, r.above, r.close, r.below, r.ofsted])}; }});

  // ---------- 8. method: what each factor counts for ----------
  OE.exhibit({name: 'model-weights', noSchool: true, host: q('[data-draw="mweights"]'),
    title: () => 'What each factor counts for in the similar-schools model',
    source: () => 'DfE and Ofsted, Similar schools model for attainment: technical note (16 July 2026). POLAR4 is not public, so the replica shares its weight among the others in proportion.',
    table: () => { const w = OE.xd.mweights; if (!w) return null; const p1 = (v) => (v === null ? '—' : Math.round(100 * v) + '%');
      return {caption: 'Weights of the factors in the official model and the replica', cols: ['Factor', 'What it measures', 'Official weight', 'Replica weight'], num: [0, 0, 1, 1], rows: w.map((x) => ({cells: [x.lab, x.sub, p1(x.official), p1(x.replica)]})),
        csvCols: ['factor', 'measure', 'official_weight', 'replica_weight'], csv: w.map((x) => [x.lab, x.sub, x.official, x.replica === null ? '' : +x.replica.toFixed(4)])}; },
    svg: () => { const w = OE.xd.mweights; if (!w) return null; const W = 900, L = 330, BW = 400, g = mk('g'); let y = 0;
      g.append(T(L + BW + 70, y + 12, 'Official', 12, {w: 600, fill: '#55627A', anchor: 'end'})); g.append(T(W, y + 12, 'Replica', 12, {w: 600, fill: '#55627A', anchor: 'end'})); y += 22;
      w.forEach((x) => { const out = x.replica === null; g.append(mk('line', {x1: 0, x2: W, y1: y, y2: y, stroke: '#EEF0F3'}));
        g.append(T(0, y + 20, x.lab, 14, {w: 500, fill: out ? '#55627A' : '#0B1A2E'})); g.append(T(0, y + 37, x.sub, 12, {fill: '#55627A'}));
        g.append(mk('rect', {x: L, y: y + 15, width: BW, height: 14, fill: '#F3F4F6'})); g.append(mk('rect', {x: L, y: y + 15, width: BW * x.official / 0.46, height: 14, fill: out ? '#E3E6EB' : '#0B1A2E', stroke: out ? '#A8B0BD' : 'none'}));
        g.append(T(L + BW + 70, y + 27, Math.round(100 * x.official) + '%', 14, {fill: out ? '#55627A' : '#0B1A2E', anchor: 'end'})); g.append(T(W, y + 27, out ? '—' : Math.round(100 * x.replica) + '%', 14, {w: 600, anchor: 'end'})); y += 46; });
      const s = mk('svg'); s.append(g); return {node: s, w: W, h: y}; }});

  // ---------- 9. method: how this school's 50 are chosen ----------
  OE.exhibit({name: 'how-the-50-are-chosen', host: q('[data-draw="msel"]'),
    title: () => 'How this school’s 50 similar schools are chosen',
    key: () => 'Each secondary is placed by its weighted distance from this school on the model’s factors. The 50 nearest (gold) form the group; the next 100 (grey) just missed out. The dashed line marks the cut.',
    source: () => SRC_SIM + '; factors from DfE, Key stage 4 performance 2025/26 and 2023/24, and January 2026 census and SEN statistics.',
    table: () => { const d = OE.xd.msel; if (!d) return null; const f2 = (v) => v.toFixed(2);
      return {caption: 'The 150 secondaries nearest this school by weighted distance', cols: ['#', 'School', 'Local authority', 'Region', 'Distance', 'In the 50'], num: [1, 0, 0, 0, 1, 0],
        rows: d.near.map((x, i) => ({self: x.in, cells: [i + 1, x.name, x.la, x.region, f2(x.d), x.in ? 'Yes' : 'No']})), note: 'Distance is in the model’s weighted, standardised units, not miles. Rows in the 50 are highlighted.',
        csvCols: ['position', 'urn', 'school', 'local_authority', 'region', 'weighted_distance', 'in_the_50'], csv: d.near.map((x, i) => [i + 1, x.urn, x.name, x.la, x.region, +x.d.toFixed(4), x.in ? 'yes' : 'no'])}; },
    svg: () => { const d = OE.xd.msel; if (!d) return null; const W = 900, rows = Math.max(...d.row) + 1, TH = 16 + 10 * (rows + 1), g = mk('g'); const X = (v) => 10 + (W - 20) * v / d.max; const grey = live('.oe-sel .t i.o').backgroundColor || '#C2C8D2';
      g.append(mk('circle', {cx: 6, cy: 7, r: 4.5, fill: '#C9A24B'})); g.append(T(16, 11, 'The 50 similar schools', 13, {fill: '#55627A'})); g.append(mk('circle', {cx: 196, cy: 7, r: 4.5, fill: grey})); g.append(T(206, 11, 'The next 100', 13, {fill: '#55627A'}));
      const y0 = 30; g.append(mk('line', {x1: 0, x2: W, y1: y0 + TH, y2: y0 + TH, stroke: '#C2C8D2'}));
      d.near.forEach((x, i) => g.append(mk('circle', {cx: X(x.d), cy: y0 + TH - 6 - 10 * d.row[i] - 4.5, r: 4.5, fill: x.in ? '#C9A24B' : grey})));
      g.append(mk('line', {x1: X(d.cut), x2: X(d.cut), y1: y0 - 4, y2: y0 + TH, stroke: '#0B1A2E', 'stroke-width': 1.5, 'stroke-dasharray': '4 3'}));
      g.append(mk('path', {d: `M${X(0)} ${y0 + TH - 18} l8 8 l-8 8 l-8 -8 z`, fill: '#0B1A2E', stroke: '#FFFFFF', 'stroke-width': 2}));
      g.append(T(0, y0 + TH + 18, 'This school', 13, {fill: '#55627A'})); g.append(T(X(d.cut), y0 + TH + 18, '50th nearest', 13, {w: 600, anchor: 'middle'})); g.append(T(W, y0 + TH + 18, 'Further away in intake →', 13, {fill: '#55627A', anchor: 'end'}));
      const s = mk('svg'); s.append(g); return {node: s, w: W, h: y0 + TH + 26}; }});

  // ---------- 10. method: the contextual model, factor by factor ----------
  OE.exhibit({name: 'expected-result-built-up', host: q('[data-draw="mwf"]'),
    title: () => { const d = OE.xd.mwf; return 'How this school’s expected result is built' + (d ? ': ' + d.label : ''); },
    key: () => 'Starting from a school at the England average on every factor, each factor raises (green) or lowers (gold) the expectation. The diamond is the school’s actual result.',
    source: () => 'The Explorer’s contextual model (coefficients in model.csv on Get the data), fitted to ' + SRC_KS4 + ' and the same public factors as the similar-schools model.',
    table: () => { const d = OE.xd.mwf; if (!d) return null;
      const rows = [{cells: ['A school at the England average on every factor', '', '', '', d.fmtV(d.base)]}].concat(d.steps.map((x) => ({cells: [x.lab, x.school, x.england, d.fmtD(x.v), d.fmtV(x.to)]})), [{self: true, cells: ['Expected for this intake', '', '', '', d.fmtV(d.expd)]}, {self: true, cells: ['This school’s result', '', '', d.fmtD(d.act - d.expd) + ' against expectation', d.fmtV(d.act)]}]);
      return {caption: 'The expected result built up factor by factor', cols: ['Step', 'This school', 'England average', 'Change', 'Running expectation'], num: [0, 1, 1, 1, 1], rows,
        csvCols: ['step', 'this_school', 'england_average', 'change', 'running_expectation'], csv: [['England-average school', '', '', '', +d.base.toFixed(3)]].concat(d.steps.map((x) => [x.lab, x.school, x.england, +x.v.toFixed(3), +x.to.toFixed(3)]), [['expected', '', '', '', +d.expd.toFixed(3)], ['actual', '', '', +(d.act - d.expd).toFixed(3), d.act]])}; },
    svg: () => { const d = OE.xd.mwf; if (!d) return null; const W = 900, L = 300, TW = 500, g = mk('g'); let y = 0; const X = (v) => L + TW * (v - d.lo) / ((d.hi - d.lo) || 1);
      const row = (lab, sub, draw, val, strong) => { g.append(mk('line', {x1: 0, x2: W, y1: y, y2: y, stroke: strong ? '#0B1A2E' : '#EEF0F3'})); g.append(T(0, y + (sub ? 19 : 25), lab, 14, {w: strong ? 600 : 500})); if (sub) g.append(T(0, y + 36, sub, 12, {fill: '#55627A'})); draw(y + 15); g.append(T(W, y + 27, val, 14, {w: strong ? 600 : 400, anchor: 'end'})); y += 46; };
      const tick = (v) => (yy) => g.append(mk('rect', {x: X(v) - 1.5, y: yy - 3, width: 3, height: 20, fill: '#0B1A2E'}));
      row('A school at the England average on every factor', null, tick(d.base), d.fmtV(d.base));
      d.steps.forEach((x) => row(x.lab, 'this school ' + x.school + '; England ' + x.england, (yy) => g.append(mk('rect', {x: X(Math.min(x.from, x.to)), y: yy, width: Math.max(2, Math.abs(X(x.to) - X(x.from))), height: 14, fill: x.v >= 0 ? '#2F6F66' : '#C9A24B'})), d.fmtD(x.v)));
      row('Expected for this intake', null, tick(d.expd), d.fmtV(d.expd), true);
      row('This school’s result', null, (yy) => g.append(mk('path', {d: `M${X(d.act)} ${yy - 2} l9 9 l-9 9 l-9 -9 z`, fill: '#0B1A2E', stroke: '#FFFFFF', 'stroke-width': 2})), d.fmtV(d.act), true);
      const s = mk('svg'); s.append(g); return {node: s, w: W, h: y}; }});
})();
