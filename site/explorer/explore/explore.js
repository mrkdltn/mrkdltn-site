/* Explore a measure (benchmarks item 6, 23 November 2026): the measure-first journey.
   Choose a results measure, see its spread across every secondary school, narrow it by region, disadvantaged
   fifth or name, and open any school. Results only: report card grades are read on each school's own page, with
   their context, and this page offers no way to list schools by grade (CLAUDE.md: no "unfairly graded" lists).
   The table starts in alphabetical order; sorting by a measure is for finding schools, not ranking them. */
(() => {
  const f1 = d3.format('.1f'), fs = d3.format('+.1f'), f2s = d3.format('+.2f'), int = d3.format(',');
  const ok = (v) => !(v === null || v === undefined || v === '' || isNaN(+v));
  const KS4 = 'DfE, Key stage 4 performance 2025/26 (provisional, 28 October 2026)';
  const SIM = 'the open replica of the DfE and Ofsted similar-schools model (technical note, 16 July 2026)';
  const M = {
    a8: {short: 'Attainment 8', lab: 'Attainment 8, 2025/26', fmt: f1, src: KS4},
    em5: {short: 'EM 5+', lab: 'English and maths grade 5+, 2025/26 (%)', fmt: (v) => f1(v) + '%', src: KS4},
    em4: {short: 'EM 4+', lab: 'English and maths grade 4+, 2025/26 (%)', fmt: (v) => f1(v) + '%', src: KS4},
    ss_diff: {short: 'Gap to 50 similar', lab: 'Gap to the 50 similar schools, Attainment 8', fmt: fs, src: KS4 + '; ' + SIM},
    cva_res: {short: 'Gap to model', lab: 'Gap to the contextual model, Attainment 8', fmt: fs, src: KS4 + '; the Explorer’s contextual model'},
    a8_25: {short: 'A8 2024/25', lab: 'Attainment 8, 2024/25 (final)', fmt: f1, src: 'DfE, Key stage 4 performance 2024/25 (final)'},
    p8_24: {short: 'P8 2023/24', lab: 'Progress 8, 2023/24', fmt: f2s, src: 'DfE, Key stage 4 performance 2023/24 (Progress 8, the last year published)'},
    dis_a8: {short: 'Disadv. A8', lab: 'Attainment 8 of disadvantaged pupils, 2025/26', fmt: f1, src: KS4 + '. Blank where fewer than 10 disadvantaged pupils'},
    dis_pct: {short: 'Disadv. %', lab: 'Disadvantaged pupils in the GCSE year group (%)', fmt: (v) => f1(v) + '%', src: KS4},
    pa_index: {short: 'Prior attainment', lab: 'Prior attainment index (key stage 2 profile)', fmt: fs, src: 'DfE, Key stage 4 performance 2023/24 (prior attainment of the GCSE year group)'}
  };
  const $ = (id) => document.getElementById(id);
  let LIMIT = 100, VER = '';
  fetch('/explorer/data/build.json', {cache: 'no-cache'}).then((r) => r.json()).then((b) => { VER = b.version || ''; dash.draw('xsrc'); }).catch(() => {});

  dash.source('ks4', '/explorer/data/ks4.json');
  dash.keep(['m', 'reg', 'dq', 'f', 's', 'd']);
  const P = () => { const p = dash.params(); return {m: M[p.m] ? p.m : 'a8', reg: p.reg || '', dq: p.dq || '', f: p.f || '', s: p.s || 'name', d: p.d === 'asc' || p.d === 'desc' ? p.d : (p.s && p.s !== 'name' && p.s !== 'la' && p.s !== 'region' ? 'desc' : 'asc')}; };

  // disadvantaged fifths across all secondaries with results (as in "Each area beside comparable schools")
  dash.calc('xcuts', {inputs: ['ks4'], fn: (k) => { const v = k.map((r) => r.dis_pct).filter(ok).map(Number).sort(d3.ascending); return [0.2, 0.4, 0.6, 0.8].map((p) => d3.quantileSorted(v, p)); }});
  const fifth = (v, c) => (v <= c[0] ? 1 : v <= c[1] ? 2 : v <= c[2] ? 3 : v <= c[3] ? 4 : 5);
  dash.calc('xall', {inputs: ['ks4'], fn: (k) => { const p = P(); return k.filter((r) => ok(r[p.m])); }});
  dash.calc('xrows', {inputs: ['xall', 'xcuts'], fn: (all, cuts) => { const p = P(); const toks = p.f.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = all.filter((r) => (!p.reg || r.region === p.reg) && (!p.dq || (ok(r.dis_pct) && String(fifth(+r.dis_pct, cuts)) === p.dq)) &&
      toks.every((t) => (r.name + ' ' + r.la + ' ' + (r.mat || '') + ' ' + (r.district || '')).toLowerCase().includes(t)));
    const key = p.s === 'v' ? p.m : p.s, dir = p.d === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => { const x = a[key], y = b[key]; if (['name', 'la', 'region'].includes(key)) return String(x).localeCompare(String(y)) * dir; return ((ok(x) ? +x : -Infinity) - (ok(y) ? +y : -Infinity)) * dir || a.name.localeCompare(b.name); }); }});

  const desc = () => { const p = P(), parts = []; if (p.reg) parts.push('in ' + (p.reg === 'London' || /^Yorkshire/.test(p.reg) ? '' : 'the ') + p.reg); if (p.dq) parts.push('in the ' + ['', 'least', 'second', 'middle', 'fourth', 'most'][+p.dq] + (p.dq === '1' || p.dq === '5' ? ' disadvantaged fifth' : ' fifth for disadvantaged pupils')); if (p.f) parts.push('matching “' + p.f + '”'); return parts.join(' and '); };

  dash.draw('xsum', (el) => { const a = dash.data('xall'), r = dash.data('xrows'); if (a.status !== 'ok' || r.status !== 'ok') return; const p = P(), m = M[p.m];
    const v = r.data.map((x) => +x[p.m]).sort(d3.ascending), all = a.data.map((x) => +x[p.m]).sort(d3.ascending);
    if (!v.length) { el.textContent = 'No secondary schools ' + desc() + ' have a figure for this measure.'; return; }
    const d = desc(); el.replaceChildren(); const b = (t) => { const e = document.createElement('b'); e.textContent = t; return e; };
    el.append(b(int(v.length)), (v.length === 1 ? ' school' : ' schools') + (d ? ' ' + d : ' in England') + ' have a figure. ');
    if (v.length >= 10) el.append('Their median is ', b(m.fmt(d3.quantileSorted(v, 0.5))), ', and the middle half sit between ', b(m.fmt(d3.quantileSorted(v, 0.25))), ' and ', b(m.fmt(d3.quantileSorted(v, 0.75))), '.');
    else el.append('Too few to describe their spread; each is listed below.');
    if (d) el.append(' Across England the median is ' + m.fmt(d3.quantileSorted(all, 0.5)) + '.'); });

  dash.draw('xhist', (el) => { el.replaceChildren(); const a = dash.data('xall'), r = dash.data('xrows'); if (a.status !== 'ok' || r.status !== 'ok') return; const p = P(), m = M[p.m];
    const all = a.data.map((x) => +x[p.m]), sel = r.data.map((x) => +x[p.m]); if (!all.length) return;
    const W = Math.max(300, el.clientWidth || 700), H = 170, ML = 8, MR = 8, MB = 26; const lo = d3.quantile(all.slice().sort(d3.ascending), 0.002), hi = d3.quantile(all.slice().sort(d3.ascending), 0.998);
    const x = d3.scaleLinear().domain([lo, hi]).nice().range([ML, W - MR]); const bins = d3.bin().domain(x.domain()).thresholds(x.ticks(40));
    const bA = bins(all.filter((v) => v >= x.domain()[0] && v <= x.domain()[1])), bS = bins(sel.filter((v) => v >= x.domain()[0] && v <= x.domain()[1]));
    const filtered = sel.length !== all.length; const nA = bA.reduce((t, b) => t + b.length, 0) || 1, nS = bS.reduce((t, b) => t + b.length, 0) || 1;
    // each group as a share of itself, so a region's shape can be compared with England's
    const y = d3.scaleLinear().domain([0, d3.max(bA.map((b) => b.length / nA).concat(filtered ? bS.map((b) => b.length / nS) : [])) || 1]).range([H - MB, 8]);
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'How ' + m.lab + ' spreads across ' + (filtered ? 'England, with the ' + sel.length + ' schools chosen ' + desc() + ' in green' : 'England’s secondary schools'));
    svg.append('g').attr('transform', `translate(0,${H - MB})`).call(d3.axisBottom(x).ticks(Math.max(3, Math.floor(W / 90))).tickFormat((v) => m.fmt(v))).call((g) => g.selectAll('text').style('fill', '#55627A').style('font-size', '11px')).call((g) => g.selectAll('line,path').style('stroke', '#C2C8D2'));
    svg.append('g').selectAll('rect').data(bA).join('rect').attr('x', (b) => x(b.x0) + 0.5).attr('width', (b) => Math.max(0, x(b.x1) - x(b.x0) - 1)).attr('y', (b) => y(b.length / nA)).attr('height', (b) => y(0) - y(b.length / nA)).style('fill', filtered ? '#D8DDE5' : '#C2C8D2');
    if (filtered) svg.append('g').selectAll('rect').data(bS).join('rect').attr('x', (b) => x(b.x0) + 2).attr('width', (b) => Math.max(0, x(b.x1) - x(b.x0) - 4)).attr('y', (b) => y(b.length / nS)).attr('height', (b) => y(0) - y(b.length / nS)).style('fill', '#2F6F66').style('opacity', 0.85);
    const med = d3.quantile(all.slice().sort(d3.ascending), 0.5); svg.append('line').attr('x1', x(med)).attr('x2', x(med)).attr('y1', 4).attr('y2', H - MB).style('stroke', '#0B1A2E').style('stroke-dasharray', '3 3');
    svg.append('text').attr('x', x(med) + 4).attr('y', 14).style('font-size', '11.5px').style('fill', '#0B1A2E').text('England median ' + m.fmt(med)); });

  dash.draw('xnote', (el) => { const p = P(); el.textContent = 'Each bar is the share of schools in a band of ' + M[p.m].lab.replace(/ \(%\)$/, '') + ': grey for every secondary in England' + (desc() ? ', green for the schools chosen, so the two shapes can be compared.' : '.') + ' The dashed line is England’s median school.'; });

  dash.draw('xtable', (tb) => { tb.replaceChildren(); const r = dash.data('xrows'); if (r.status !== 'ok') return; const p = P(), m = M[p.m];
    const vh = $('xm-vh'); if (vh) { vh.textContent = m.short; vh.title = m.lab; }
    document.querySelectorAll('.xm th[data-k]').forEach((th) => th.setAttribute('aria-sort', th.dataset.k === p.s ? (p.d === 'asc' ? 'ascending' : 'descending') : 'none'));
    r.data.slice(0, LIMIT).forEach((x) => { const tr = document.createElement('tr'); const td0 = document.createElement('td'); const a = document.createElement('a'); a.href = '/explorer/school/' + x.urn + '/'; a.textContent = x.name; td0.append(a); tr.append(td0);
      [[m.fmt(+x[p.m]), 'n'], [x.la, ''], [x.region, ''], [ok(x.pupils) ? int(+x.pupils) : '—', 'n']].forEach(([t, c]) => { const td = document.createElement('td'); td.textContent = t; if (c) td.className = c; tr.append(td); }); tb.append(tr); });
    const more = $('xm-more'); if (more) { const left = r.data.length - LIMIT; more.hidden = left <= 0; more.textContent = 'Show ' + Math.min(100, left) + ' more of ' + int(r.data.length); } });

  dash.draw('xsrc', (el) => { const p = P(); el.replaceChildren('Source: ' + M[p.m].src + '. ' + (VER ? 'Data version ' + VER + '. ' : '')); const a = document.createElement('a'); a.href = '/explorer/data/'; a.textContent = 'About this data'; el.append(a); });

  // controls
  const sel = $('xm-m'); Object.entries(M).forEach(([k, v]) => { const o = document.createElement('option'); o.value = k; o.textContent = v.lab; sel.append(o); });
  [['1', 'Least disadvantaged fifth'], ['2', 'Second fifth'], ['3', 'Middle fifth'], ['4', 'Fourth fifth'], ['5', 'Most disadvantaged fifth']].forEach(([k, t]) => { const o = document.createElement('option'); o.value = k; o.textContent = t; $('xm-dq').append(o); });
  dash.onData(() => { const k = dash.data('ks4'); const rs = $('xm-reg'); if (k.status === 'ok' && rs.options.length === 1) [...new Set(k.data.map((r) => r.region).filter(Boolean))].sort().forEach((g) => { const o = document.createElement('option'); o.value = g; o.textContent = g; rs.append(o); });
    const p = P(); sel.value = p.m; rs.value = p.reg; $('xm-dq').value = p.dq; if (document.activeElement !== $('xm-f')) $('xm-f').value = p.f; });
  // Each measure, and each measure in a region, has its own address with a matching share image (build_explore_pages.py):
  // /explorer/explore/<measure>/<region>/. The address bar is kept on that path; the other settings stay after '#'.
  const slug = (t) => t.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  const vpath = (p) => '/explorer/explore/' + (p.m === 'a8' && !p.reg ? '' : p.m + '/' + (p.reg ? slug(p.reg) + '/' : ''));
  const fixPath = () => { const p0 = P(); document.title = M[p0.m].lab.replace(/ \(%\)$/, '') + ': ' + (p0.reg ? 'secondary schools in ' + (p0.reg === 'London' || /^Yorkshire/.test(p0.reg) ? '' : 'the ') + p0.reg + ', against England' : 'every secondary school in England') + ' · Ofsted Explorer';
    const want = vpath(p0), h = new URLSearchParams(location.hash.slice(1)); ['m', 'reg', 'v'].forEach((k) => h.delete(k)); const t = h.toString();
    if (location.pathname !== want || location.hash.slice(1) !== t) history.replaceState(null, '', want + location.search + (t ? '#' + t : '')); };
  const set = (o) => { LIMIT = 100; dash.setParams(o); fixPath(); };
  sel.addEventListener('change', () => set({m: sel.value === 'a8' ? null : sel.value}));
  $('xm-reg').addEventListener('change', (e) => set({reg: e.target.value || null}));
  $('xm-dq').addEventListener('change', (e) => set({dq: e.target.value || null}));
  let tf; $('xm-f').addEventListener('input', (e) => { clearTimeout(tf); tf = setTimeout(() => set({f: e.target.value.trim() || null}), 200); });
  document.querySelectorAll('.xm th[data-k]').forEach((th) => { const go = () => { const p = P(), k = th.dataset.k; const text = ['name', 'la', 'region'].includes(k); set({s: k === 'name' ? null : k, d: p.s === k || (k === 'name' && p.s === 'name') ? (p.d === 'asc' ? 'desc' : 'asc') : (text ? 'asc' : 'desc')}); };
    th.addEventListener('click', go); th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
  $('xm-more').addEventListener('click', () => { LIMIT += 100; dash.draw('xtable'); });
  $('xm-csv').addEventListener('click', () => { const r = dash.data('xrows'); if (r.status !== 'ok') return; const p = P();
    const q = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = ['urn', 'school', 'local_authority', 'region', p.m, 'gcse_cohort', 'source', 'data_version'];
    const body = [head].concat(r.data.map((x) => [x.urn, x.name, x.la, x.region, x[p.m], x.pupils, M[p.m].src, VER])).map((row) => row.map(q).join(',')).join('\n') + '\n';
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], {type: 'text/csv;charset=utf-8'})); a.download = 'ofsted-explorer-' + p.m + (p.reg ? '-' + p.reg.toLowerCase().replace(/[^a-z]+/g, '-') : '') + (VER ? '-' + VER : '') + '.csv'; document.body.append(a); a.click(); a.remove(); });
  if (window.OEshare) { OEshare.button($('xm-share'), {url: () => location.href, title: () => M[P().m].lab + (P().reg ? ', ' + P().reg : '') + ' · Ofsted Explorer'});
    OEshare.check({host: '.xm'}); }
  const xv = document.querySelector('meta[name="oe-xview"]'); let view = {}; try { view = xv ? JSON.parse(xv.content) : {}; } catch (e) { view = {}; }
  dash.start(view);
  fixPath(); window.addEventListener('hashchange', () => setTimeout(fixPath, 0));
})();
