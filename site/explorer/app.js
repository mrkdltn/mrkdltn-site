(function () {
  const GC = {'Exceptional':'#0176E0','Strong standard':'#33903C','Expected standard':'#5CD168','Needs attention':'#FF8341','Urgent improvement':'#CE1E02'};
  const GORDER = ['Urgent improvement','Needs attention','Expected standard','Strong standard','Exceptional'];
  const BANDC = {'Well above':'#0176E0','Above':'#33903C','Close to':'#8A96A8','Below':'#FF8341','Well below':'#CE1E02'};
  const num = (v) => (v === null || v === undefined || v === '' ? NaN : +v);
  const f1 = d3.format('.1f'), fs = d3.format('+.1f');
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // motion(): intro animation, only on the first draw of a newly chosen school.
  // smooth(): transitions the reader asked for (changing a control), never on resize.
  const motion = () => !reduced() && dash.fresh();
  const smooth = () => !reduced() && !dash.resizing();
  const P = () => Object.assign({urn: '', q: '', x: 'dis_pct', area: 'g_ach', phase: 'Secondary', area2: 'g_ach', idsr: ''}, dash.params());
  const OE = window.OE = {GC, GORDER, BANDC, num, f1, fs, P, motion, smooth, active: 0, matches: []};

  // ---------- search ----------
  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  OE.search = (rows, q) => {
    const nq = norm(q); if (!nq) return [];
    const toks = nq.split(' ');
    const pc = nq.replace(/ /g, '');
    const out = [];
    for (const r of rows) {
      const name = norm(r.name), hay = name + ' | ' + norm(r.la) + ' | ' + norm(r.town) + ' | ' + norm(r.district) + ' | ' + norm(r.pcon) + ' | ' + norm(r.region) + ' | ' + norm(r.mat) + ' | ' + norm(r.postcode) + ' | ' + r.urn;
      let score = 0;
      if (r.urn === nq) score = 1000;
      else if (pc.length >= 3 && norm(r.postcode).replace(/ /g, '').startsWith(pc)) score = 600;
      else if (toks.every((t) => hay.includes(t))) {
        score = 100;
        if (name.startsWith(nq)) score += 300;
        else if ((' ' + name).includes(' ' + toks[0])) score += 150;
        if (toks.every((t) => name.includes(t))) score += 80;
        if (norm(r.la).startsWith(toks[0])) score += 40;
        score -= name.length / 20;
      }
      if (score > 0) out.push([score, r]);
    }
    out.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name));
    return out.slice(0, 12).map((x) => x[1]);
  };
  // every searchable school: secondaries with results, plus every other school with a report card
  OE.pool = () => { const k = dash.data('ks4'), o = dash.data('ofsted'); if (k.status !== 'ok') return null;
    const od = o.status === 'ok' ? o.data : null; if (OE._pool && OE._pool.k === k.data && OE._pool.o === od) return OE._pool.rows;
    const have = new Set(k.data.map((r) => r.urn));
    const extra = od ? od.filter((r) => !have.has(r.urn)).map((r) => Object.assign({rc_only: 'yes'}, r)) : [];
    const rows = k.data.concat(extra); OE._pool = {k: k.data, o: od, rows}; return rows; };
  // fifths of the disadvantaged share of the GCSE cohort, across every secondary with results
  OE.disCuts = () => { const k = dash.data('ks4'); if (k.status !== 'ok') return null; if (OE._dc && OE._dc.d === k.data) return OE._dc.c;
    const v = k.data.map((r) => +r.dis_pct).filter((x) => r_ok(x)).sort(d3.ascending); const c = [0.2, 0.4, 0.6, 0.8].map((q) => d3.quantileSorted(v, q)); OE._dc = {d: k.data, c}; return c; };
  OE.disFifth = (x) => { const c = OE.disCuts(); x = +x; return c && r_ok(x) && String(x) !== '' ? 1 + c.filter((t) => x > t).length : null; };
  const r_ok = (x) => x !== null && x !== '' && !isNaN(x) && isFinite(x);
  OE.pickRandom = (rows) => { const pool = rows.filter((r) => r.g_ach && r.a8 !== null && r.a8 !== ''); const src = pool.length ? pool : rows; return src[Math.floor(Math.random() * src.length)]; };

  // ---------- calcs ----------
  dash.calc('national', {inputs: ['ks4'], title: 'National average Attainment 8', description: 'Pupil-weighted mean Attainment 8, mainstream state-funded secondaries, 2025/26 provisional.',
    fn: (ks4) => { let s = 0, n = 0; ks4.forEach((r) => { const a = +r.a8, p = +r.pupils; if (a >= 0 && p > 0) { s += a * p; n += p; } }); return n ? Math.round(s / n * 10) / 10 : null; }});
  dash.calc('school', {inputs: ['ks4', 'ofsted'], title: 'Selected school', description: 'The row for the school chosen in the search: its results row for a secondary, otherwise its report card row.',
    fn: (ks4, ofsted) => { const u = String(dash.params().urn || ''); if (!u) return [];
      const k = ks4.find((r) => r.urn === u); if (k) return [Object.assign({phase: 'Secondary'}, k)];
      const o = ofsted.find((r) => r.urn === u); return o ? [Object.assign({rc_only: 'yes'}, o)] : []; }});
  dash.calc('neigh', {inputs: ['ks4'], title: 'The 50 similar schools (replica)', description: 'Neighbours of the selected school in the open replica, sorted by Attainment 8.',
    fn: (ks4) => { const u = String(dash.params().urn || ''); const me = ks4.find((r) => r.urn === u); if (!me) return []; const ids = new Set(String(me.nn).split(' ')); return ks4.filter((r) => ids.has(r.urn)).sort((a, b) => +b.a8 - +a.a8); }});
  dash.calc('official', {inputs: ['ks4'], title: 'Official IDSR list comparison', description: 'Average 2025/26 Attainment 8 of the URNs pasted from the IDSR.',
    fn: (ks4) => { const txt = String(dash.params().idsr || ''); const ids = [...new Set(txt.match(/\d{6}/g) || [])]; if (!ids.length) return [];
      const by = new Map(ks4.map((r) => [r.urn, r])); const found = ids.map((i) => by.get(i)).filter((r) => r && r.a8 !== null && r.a8 !== '');
      const mean = found.length ? found.reduce((s, r) => s + +r.a8, 0) / found.length : null;
      return [{pasted: ids.length, found: found.length, mean: mean === null ? null : Math.round(mean * 10) / 10}]; }});
  dash.calc('lenses', {inputs: ['ks4', 'national', 'official'], title: 'Four lenses on the selected school', description: 'Published attainment, similar schools (replica and official), contextual model and last Progress 8.',
    fn: (ks4, national, official) => {
      const u = String(dash.params().urn || ''); const r = ks4.find((x) => x.urn === u); if (!r) return [];
      const a8 = +r.a8, rd = (v) => (v === null || isNaN(v) ? null : Math.round(v * 10) / 10);
      const out = [
        {lens: 'Published attainment', comparator_label: 'National average', school: rd(a8), comparator: national, gap: rd(a8 - national), reading: a8 - national >= 0 ? 'Above national' : 'Below national'},
        {lens: 'Similar schools (open replica)', comparator_label: 'Average of 50 similar schools', school: rd(a8), comparator: rd(+r.ss_mean), gap: rd(+r.ss_diff), reading: r.ss_band}
      ];
      const o = official && official[0];
      if (o && o.mean !== null) out.push({lens: 'Similar schools (official IDSR list)', comparator_label: 'Average of ' + o.found + ' pasted schools', school: rd(a8), comparator: o.mean, gap: rd(a8 - o.mean), reading: 'Gap only'});
      out.push({lens: 'Contextual model', comparator_label: 'Expected for this intake', school: rd(a8), comparator: rd(+r.cva_exp), gap: rd(+r.cva_res), reading: Math.abs(+r.cva_res) < 2 ? 'In line with expectation' : (+r.cva_res > 0 ? 'Above expectation' : 'Below expectation')});
      const p8 = r.p8_24 === null || r.p8_24 === '' ? null : +r.p8_24;
      out.push({lens: 'Progress 8, 2023/24', comparator_label: r.pred ? 'National average (predecessor school)' : 'National average (zero)', school: p8, comparator: p8 === null ? null : 0, gap: p8, reading: p8 === null ? 'Not available' : (+r.p8lo_24 > 0 ? 'Significantly above' : (+r.p8hi_24 < 0 ? 'Significantly below' : 'Not significantly different'))});
      return out; }});
  dash.calc('valid', {inputs: ['ks4', 'fig3'], title: 'Replica bands by Achievement grade (2024/25 results)', description: 'Share of inspected secondaries above, close to and below their replica similar schools on 2024/25 results, by Achievement grade.',
    fn: (ks4, fig3) => GORDER.slice().reverse().map((g) => { const rows = ks4.filter((r) => r.g_ach === g && r.ss_band_25); const n = rows.length || 1;
      const c = (b) => Math.round(100 * rows.filter((r) => r.ss_band_25 === b).length / n);
      const ref = fig3.find((x) => x.grade === g);
      return {grade: g, n: rows.length, above: c('Above'), close: c('Close to'), below: c('Below'), ofsted: ref ? ref.above + ' / ' + ref.close + ' / ' + ref.below : ''}; })});
  dash.calc('idaci', {inputs: ['ofsted'], title: 'Grades by IDACI quintile', description: 'Report card grades for the chosen phase and area by IDACI quintile of pupils.',
    fn: (ofsted) => { const p = dash.params(); const ph = p.phase || 'Secondary', ar = p.area2 || 'g_ach';
      return [1, 2, 3, 4, 5].map((q) => { const rows = ofsted.filter((r) => r.phase === ph && String(r.idaci_q) === String(q) && r[ar] && r[ar] !== 'Not applicable'); const o = {quintile: String(q), n: rows.length};
        GORDER.forEach((g) => { o[g] = rows.filter((r) => r[ar] === g).length; }); return o; }); }});

  // each area of the school's report card beside comparable schools
  const AREAS_ALL = [['g_ach','Achievement'],['g_ct','Curriculum and teaching'],['g_inc','Inclusion'],['g_ab','Attendance and behaviour'],['g_pd','Personal development and wellbeing'],['g_lg','Leadership and governance'],['g_ey','Early years'],['g_p16','Post-16 provision']];
  OE.AREAS_ALL = AREAS_ALL;
  dash.calc('areas', {inputs: ['ofsted', 'school', 'neigh', 'ks4'], title: 'Report card areas beside comparable schools', description: 'For each graded area, how schools of the same phase are graded in England, in the same IDACI quintile of pupils and, for secondaries, among the 50 similar schools.',
    fn: (ofsted, school, neigh, ks4) => { const r = school && school[0]; if (!r) return [];
      const ph = r.phase || 'Secondary', q = String(r.idaci_q || '');
      const same = ofsted.filter((x) => x.phase === ph), fifth = q ? same.filter((x) => String(x.idaci_q) === q) : null;
      const sim = r.rc_only ? null : neigh;
      const dq = r.rc_only ? null : OE.disFifth(r.dis_pct), dcut = OE.disCuts();
      const disSet = dq ? ks4.filter((x) => OE.disFifth(x.dis_pct) === dq) : null;
      const dist = (rows, k) => { if (!rows) return null; const g = rows.filter((x) => GC[x[k]]); const o = {n: g.length}; GORDER.forEach((G) => { o[G] = g.filter((x) => x[k] === G).length; }); return o; };
      return AREAS_ALL.filter(([k]) => GC[r[k]]).map(([k, lab]) => ({area: lab, key: k, grade: r[k], phase: ph, quintile: q, england: dist(same, k), fifth: dist(fifth, k), similar: dist(sim, k), disq: dq, discuts: dcut, dis: r.rc_only ? undefined : dist(disSet, k)})); }});

  // ---------- controls (listen; set params, value, hidden, aria only) ----------
  const q = document.getElementById('oe-q'), pop = document.getElementById('oe-pop');
  const open = (on) => { if (pop) pop.hidden = !on; if (q) q.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  OE.choose = (urn) => { if (!urn) return; dash.setParams({urn: urn, q: null}); if (q) { q.value = ''; q.blur(); } open(false); OE.active = 0; };
  let t = null;
  if (q) {
    q.addEventListener('input', () => { clearTimeout(t); OE.active = 0; t = setTimeout(() => dash.setParams({q: q.value || null}), 120); open(!!q.value); });
    q.addEventListener('focus', () => open(!!q.value));
    q.addEventListener('blur', () => setTimeout(() => open(false), 150));
    q.addEventListener('keydown', (e) => {
      const n = OE.matches.length;
      if (e.key === 'ArrowDown' && n) { e.preventDefault(); OE.active = (OE.active + 1) % n; dash.draw('results'); open(true); }
      else if (e.key === 'ArrowUp' && n) { e.preventDefault(); OE.active = (OE.active - 1 + n) % n; dash.draw('results'); }
      else if (e.key === 'Enter') { e.preventDefault(); const m = OE.matches[OE.active]; if (m) OE.choose(m.urn); }
      else if (e.key === 'Escape') { open(false); }
    });
  }
  const rnd = document.getElementById('oe-random');
  if (rnd) rnd.addEventListener('click', () => { const d = dash.data('ks4'); if (d.status === 'ok') { const r = OE.pickRandom(d.data.filter((x) => x.urn !== P().urn)); OE.choose(r.urn); } });
  const idsr = document.getElementById('oe-idsr'); if (idsr) idsr.addEventListener('change', () => dash.setParams({idsr: idsr.value || null}));
  [['oe-x', 'x'], ['oe-area', 'area'], ['oe-phase', 'phase'], ['oe-area2', 'area2']].forEach(([id, k]) => { const el = document.getElementById(id); if (el) el.addEventListener('change', () => dash.setParams({[k]: el.value})); });
  dash.onData(() => {
    const p = P(), d = dash.data('ks4');
    if (!p.urn && d.status === 'ok' && d.data.length) { const r = OE.pickRandom(d.data); window.OE_RANDOM = r.urn; dash.setParams({urn: r.urn}); return; }
    [['oe-x', 'x'], ['oe-area', 'area'], ['oe-phase', 'phase'], ['oe-area2', 'area2']].forEach(([id, k]) => { const el = document.getElementById(id); if (el && el.value !== p[k]) el.value = p[k]; });
    if (idsr && document.activeElement !== idsr && idsr.value !== p.idsr) idsr.value = p.idsr;
  });
})();

(function () {
  const {GC, GORDER, BANDC, num, f1, fs, P, motion} = window.OE; const OE = window.OE;
  const AREAS = [['g_ach','Achievement'],['g_ct','Curriculum and teaching'],['g_inc','Inclusion'],['g_ab','Attendance and behaviour'],['g_pd','Personal development and wellbeing'],['g_lg','Leadership and governance'],['g_ey','Early years'],['g_p16','Post-16 provision'],['g_sg','Safeguarding']];
  const GTIP = {'Exceptional': 'Highest of the five grades.', 'Strong standard': 'Second highest of the five grades.', 'Expected standard': 'The middle grade: the standard Ofsted expects.', 'Needs attention': 'Second lowest of the five grades.', 'Urgent improvement': 'Lowest of the five grades.', 'Met': 'Safeguarding is graded Met or Not met.', 'Not met': 'Safeguarding is graded Met or Not met.'};
  const dash_ = (el) => { el.textContent = '—'; };
  const mark = (el, src, field) => { el.setAttribute('data-source', src); el.setAttribute('data-field', field); el.setAttribute('data-row', '0'); };
  const S = () => { const s = dash.data('school'); return s.status === 'ok' && s.data && s.data[0] ? s.data[0] : null; };
  const countUp = (el, v, fmt) => { if (!motion() || isNaN(v)) { el.textContent = isNaN(v) ? '—' : fmt(v); return; }
    setTimeout(() => { if (!el.textContent) el.textContent = fmt(v); }, 1200); // safety net if animation frames are paused
    d3.select(el).interrupt().transition().duration(700).ease(d3.easeCubicOut).tween('text', () => { const i = d3.interpolateNumber(0, v); return (t) => { el.textContent = fmt(i(t)); }; }); };

  // search results
  dash.draw('results', (ul) => {
    const pool = OE.pool(); const d = {status: pool ? 'ok' : 'loading', data: pool}; const p = P(); ul.replaceChildren();
    if (d.status !== 'ok') { const li = document.createElement('div'); li.className = 'empty'; li.textContent = 'Loading schools…'; ul.append(li); return; }
    const m = OE.search(d.data, p.q); OE.matches = m; if (OE.active >= m.length) OE.active = 0;
    if (!m.length) { const li = document.createElement('div'); li.className = 'empty'; li.textContent = p.q ? 'No school matches "' + p.q + '". Try a town, a local authority, a postcode or a URN.' : 'Start typing to search.'; ul.append(li); return; }
    const toks = String(p.q).toLowerCase().split(/\s+/).filter(Boolean);
    const hl = (parent, text) => { const low = text.toLowerCase(); let i = 0; while (i < text.length) { let hit = null; for (const tk of toks) { if (low.startsWith(tk, i)) { hit = tk; break; } } if (hit) { const mk = document.createElement('mark'); mk.textContent = text.slice(i, i + hit.length); parent.append(mk); i += hit.length; } else { parent.append(text[i]); i++; } } };
    m.forEach((r, i) => { const li = document.createElement('li'); li.setAttribute('role', 'option'); li.setAttribute('aria-selected', i === OE.active ? 'true' : 'false');
      const n = document.createElement('span'); n.className = 'n'; hl(n, r.name);
      const a = document.createElement('span'); a.className = 'a'; a.textContent = r.rc_only ? r.phase : 'A8 ' + (isNaN(num(r.a8)) ? '—' : f1(+r.a8));
      const place = r.rc_only ? (r.town && r.town !== r.la && r.town !== 'London' ? r.town + ', ' + r.la : r.la) : (r.district && r.district !== r.la ? r.district + ', ' + r.la : r.la);
      const mt = document.createElement('span'); mt.className = 'm'; mt.textContent = [place, r.postcode, r.g_ach ? 'Achievement: ' + r.g_ach : 'No report card yet'].filter(Boolean).join(' · ');
      li.append(n, a, mt); li.addEventListener('pointerdown', (e) => { e.preventDefault(); OE.choose(r.urn); }); ul.append(li); });
  });

  dash.draw('sname', (el) => { const r = S(); if (!r) return dash_(el); el.textContent = r.name; mark(el, 'school', 'name'); document.documentElement.classList.toggle('oe-rconly', !!r.rc_only);
    // secondary-results sections only make sense for secondaries; other phases keep the phase-specific deprivation chart
    const nonsec = (r.phase || 'Secondary') !== 'Secondary'; document.documentElement.classList.toggle('oe-nonsec', nonsec);
    const ms = document.getElementById('oe-more-s'); if (ms) ms.textContent = nonsec ? 'How ' + (PHL[r.phase] || 'schools') + ' across England are graded in each area, by pupils\' deprivation' : 'Your official similar-schools list, every secondary on one chart, report card grades by deprivation, and how the replica checks out';
    if (OE._phaseFor !== r.urn) { OE._phaseFor = r.urn; const ph = r.phase || 'Secondary'; if (P().phase !== ph) setTimeout(() => dash.setParams({phase: ph}), 0); } if (/^\/explorer\/school\//.test(location.pathname)) document.title = r.name + ' · Ofsted Explorer'; });
  dash.draw('smeta', (el) => { const r = S(); if (!r) return dash_(el);
    if (r.rc_only) { el.textContent = [r.phase, r.town && r.town !== r.la && r.town !== 'London' ? r.town : '', r.la, r.region, r.postcode, r.mat ? r.mat : '', 'URN ' + r.urn, r.insp_date ? 'Inspected ' + d3.utcFormat('%-d %B %Y')(new Date(r.insp_date)) : ''].filter(Boolean).join(' · '); return; }
    el.textContent = ['Secondary', r.la, r.region, r.postcode, r.mat ? r.mat : 'Not in a multi-academy trust', r.type, r.selective, 'URN ' + r.urn, r.insp_date ? 'Inspected ' + d3.utcFormat('%-d %B %Y')(new Date(r.insp_date)) : 'No report card inspection yet'].filter(Boolean).join(' · '); });

  dash.draw('kpis', (el) => { const r = S(); el.replaceChildren(); if (!r || r.rc_only) return;
    const nat = dash.data('national').data;
    const tiles = [
      ['Attainment 8, 2025/26', +r.a8, f1, 'a8', isNaN(num(r.a8_25)) ? '' : '2024/25: ' + f1(+r.a8_25), 'Provisional 2025/26 result. The smaller figure is last year\'s final result for comparison.'],
      ['Gap to national', +r.nat_diff, fs, 'nat_diff', nat ? 'National average ' + f1(nat) : '', 'School minus the national average. Mostly reflects intake.'],
      ['Gap to similar schools', +r.ss_diff, fs, 'ss_diff', r.ss_band ? r.ss_band + ' (replica)' : '', 'School minus the average of its 50 similar schools in the open replica.'],
      ['Gap to contextual model', +r.cva_res, fs, 'cva_res', 'Expected ' + f1(+r.cva_exp), 'School minus what schools with this intake typically achieve, from one national regression.']
    ];
    tiles.forEach(([lab, v, fmt, field, sm, tip]) => { const d = document.createElement('div'); d.className = 'oe-kpi rise'; d.setAttribute('data-tip', tip); d.tabIndex = 0;
      const s = document.createElement('span'); s.textContent = lab; const b = document.createElement('b'); mark(b, 'school', field);
      if (field !== 'a8' && !isNaN(v)) b.style.color = v >= 0 ? '#33903C' : '#E0662E';
      const small = document.createElement('small'); small.textContent = sm; d.append(s, b, small); el.append(d); countUp(b, v, fmt); }); });

  dash.draw('sgrades', (el) => { const r = S(); el.replaceChildren(); if (!r) return;
    AREAS.forEach(([k, lab]) => { const v = r[k]; if (!v || v === 'Not applicable') return; const d = document.createElement('div'); d.className = 'oe-g rise' + (v === 'Expected standard' || v === 'Met' ? ' dark' : '');
      d.style.background = GC[v] || (v === 'Met' ? '#E6EBF2' : (v === 'Not met' ? '#CE1E02' : '#E6EBF2')); d.setAttribute('data-tip', lab + ': ' + v + '. ' + (GTIP[v] || '')); d.tabIndex = 0;
      const s = document.createElement('span'); s.textContent = lab; const b = document.createElement('b'); b.textContent = v; mark(b, 'school', k); d.append(s, b); el.append(d); });
    if (!el.children.length) { const p = document.createElement('p'); p.className = 'oe-note'; p.textContent = 'This school has not yet had a report card inspection under the renewed framework.'; el.append(p); } });

  dash.draw('sctx', (el) => { const r = S(); el.replaceChildren(); if (!r || r.rc_only) return;
    const items = [
      ['pa_index', 'Prior attainment index', fs, 'Weight 0.46. Share of the 2023/24 GCSE cohort with high KS2 results minus the share with low results' + (r.pred ? ', from the predecessor school' : '') + '. National middle is around zero.'],
      ['dis_pct', 'Disadvantaged (cohort) %', f1, 'Weight 0.14. Disadvantaged share of the 2025/26 GCSE cohort, the closest public stand-in for whole-school FSM6.'],
      ['sensup_pct', 'SEN support %', f1, 'Weight 0.09. Whole school, January 2026 census.'],
      ['nonmob_pct', 'Non-mobile (cohort) %', f1, 'Weight 0.06. Share of the GCSE cohort who joined at a normal time: a stand-in for pupil stability.'],
      ['_disq', 'Disadvantaged fifth', (v) => v + ' of 5', 'Where the disadvantaged share of the GCSE year group places the school among all secondaries with results: 1 is the lowest fifth, 5 the highest.'],
      ['idaci_q', 'IDACI quintile of pupils', (v) => String(v), 'Weight 0.06. Ofsted\'s deprivation quintile based on pupils\' home postcodes: 1 least deprived, 5 most.'],
      ['ehc_pct', 'EHC plan %', f1, 'Weight 0.04. Whole school, January 2026.'],
      ['eal_school', 'EAL %', f1, 'Weight 0.03. Pupils whose first language is not English, January 2026.'],
      ['nor', 'Pupils on roll', (v) => d3.format(',')(v), 'Weight 0.02. January 2026 census.'],
      ['pupils', 'GCSE cohort', (v) => d3.format(',')(v), 'Pupils in the 2025/26 GCSE results. Not a model factor, but small cohorts make results less stable.']
    ];
    items.forEach(([k, lab, fmt, tip]) => { const v = k === '_disq' ? (OE.disFifth(r.dis_pct) || NaN) : num(r[k]); const d = document.createElement('div'); d.className = 'oe-k rise'; d.setAttribute('data-tip', tip); d.tabIndex = 0;
      const s = document.createElement('span'); s.textContent = lab + (k === 'pa_index' && r.pa_imputed === 'yes' ? ' (estimated)' : ''); const b = document.createElement('b'); b.textContent = isNaN(v) ? '—' : fmt(v); mark(b, 'school', k); d.append(s, b); el.append(d); }); });

  const LTIP = {
    'Published attainment': 'Compares the school with the national average. It makes no allowance for intake, so it mainly reflects who the school serves.',
    'Similar schools (open replica)': 'Compares the school with the 50 schools most like it on prior attainment, disadvantage, SEND, mobility, deprivation, EAL and size, using the DfE and Ofsted method on public data.',
    'Similar schools (official IDSR list)': 'Uses the URNs you pasted. Ofsted bands this gap with its own significance test, which is not published.',
    'Contextual model': 'What schools with this intake achieve on average across England, from one regression on the same factors, including both the disadvantaged share and IDACI. Within 2 points reads as in line.',
    'Progress 8, 2023/24': 'Pupil-level progress from KS2 to GCSE, last published for 2023/24. Where the school changed URN, this is the predecessor school\'s figure.'
  };
  dash.draw('lenses', (tb) => { const d = dash.data('lenses'); tb.replaceChildren(); if (d.status !== 'ok' || !d.data) return;
    const animate = motion();
    d.data.forEach((r) => { const tr = document.createElement('tr'); tr.setAttribute('data-key', encodeURIComponent(r.lens));
      const isP8 = /Progress 8/.test(r.lens); const fmt = (v) => (v === null || v === undefined ? '—' : (isP8 ? d3.format('+.2f')(v) : f1(v)));
      const td0 = document.createElement('td'); td0.className = 'tip-cell'; const sp0 = document.createElement('span'); sp0.textContent = r.lens + ' '; const ic = document.createElement('span'); ic.className = 'i'; ic.textContent = 'i'; ic.tabIndex = 0; ic.setAttribute('data-tip', LTIP[r.lens] || ''); td0.append(sp0, ic); tr.append(td0);
      const LBL = ['Compared with', 'School', 'Comparator', 'Gap'];
      [r.comparator_label, fmt(r.school), fmt(r.comparator), r.gap === null ? '—' : (isP8 ? d3.format('+.2f')(r.gap) : fs(r.gap))].forEach((t, i) => { const td = document.createElement('td'); td.textContent = t; td.setAttribute('data-label', LBL[i]); if (i >= 1) td.className = 'n'; tr.append(td); });
      const tdb = document.createElement('td'); const bar = document.createElement('div'); bar.className = 'oe-gapbar'; const fill = document.createElement('i'); const mid = document.createElement('u'); bar.append(fill, mid); tdb.append(bar); tr.append(tdb);
      const g = r.gap === null ? 0 : (isP8 ? r.gap * 10 : r.gap); const w = Math.min(50, Math.abs(g) / 15 * 50);
      fill.style.background = g >= 0 ? '#33903C' : '#FF8341';
      const fin = () => { fill.style.left = (g >= 0 ? 50 : 50 - w) + '%'; fill.style.width = w + '%'; };
      if (animate) { fill.style.left = '50%'; fill.style.width = '0%'; } else fin();
      const td = document.createElement('td'); const sp = document.createElement('span'); sp.className = 'oe-band'; sp.textContent = r.reading;
      sp.style.background = BANDC[r.reading] || (/above/i.test(r.reading) ? '#33903C' : /below/i.test(r.reading) ? '#FF8341' : '#8A96A8'); td.append(sp); tr.append(td); tb.append(tr);
      if (animate) requestAnimationFrame(() => requestAnimationFrame(fin)); }); });

  dash.draw('strip', {mount: (el) => { el.replaceChildren(); const tip = document.createElement('div'); tip.className = 'oe-tip'; tip.hidden = true; el.append(tip); return {tip}; },
    update: (el, m) => { const r = S(), n = dash.data('neigh'); el.querySelectorAll('svg').forEach((s) => s.remove()); if (!r || n.status !== 'ok' || !n.data.length) return;
      const W = el.clientWidth || 600, H = 120, M = {l: 16, r: 16, b: 26}; const vals = n.data.map((x) => +x.a8).concat([+r.a8]);
      const x = d3.scaleLinear().domain(d3.extent(vals)).nice().range([M.l, W - M.r]); const mean = +r.ss_mean;
      const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Attainment 8 of the 50 similar schools with the selected school marked');
      svg.append('g').attr('class', 'ax').attr('transform', `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(Math.max(3, Math.floor(W / 90))));
      svg.append('line').attr('x1', x(mean)).attr('x2', x(mean)).attr('y1', 30).attr('y2', 86).style('stroke', 'var(--color-fg)').style('stroke-width', 2);
      svg.append('text').attr('x', x(mean)).attr('y', 22).attr('text-anchor', 'middle').style('font-size', '11px').style('fill', 'var(--color-fg-muted)').text('Group average ' + f1(mean));
      const dots = svg.selectAll('circle.n').data(n.data).join('circle').attr('class', 'n').attr('cy', (d, i) => 58 + ((i % 7) - 3) * 4).attr('r', 5.5).style('fill', (d) => GC[d.g_ach] || '#D6DCE6').style('stroke', 'var(--color-bg)').style('cursor', 'pointer')
        .on('pointerenter', (e, d) => { m.tip.hidden = false; m.tip.textContent = d.name + ' (' + d.la + '): A8 ' + f1(+d.a8) + (d.g_ach ? ' · Achievement ' + d.g_ach : ' · no report card yet') + '. Click to open.'; m.tip.style.left = Math.max(0, Math.min(W - 260, x(+d.a8) - 40)) + 'px'; m.tip.style.top = '-6px'; })
        .on('pointerleave', () => { m.tip.hidden = true; }).on('click', (e, d) => OE.choose(d.urn));
      const animate = motion();
      if (animate) dots.attr('cx', x(mean)).style('opacity', 0).transition().duration(650).delay((d, i) => i * 10).ease(d3.easeCubicOut).attr('cx', (d) => x(+d.a8)).style('opacity', 1);
      else dots.attr('cx', (d) => x(+d.a8));
      const sx = x(+r.a8); const dia = svg.append('path').attr('d', d3.symbol(d3.symbolDiamond, 170)()).style('fill', '#0B1A2E').style('stroke', 'var(--color-bg)').style('stroke-width', 2);
      if (animate) dia.attr('transform', `translate(${x(mean)},58) scale(0.2)`).transition().delay(500).duration(600).ease(d3.easeBackOut).attr('transform', `translate(${sx},58) scale(1)`); else dia.attr('transform', `translate(${sx},58)`);
      svg.append('text').attr('x', sx).attr('y', 100 - 4).attr('text-anchor', sx > W - 80 ? 'end' : (sx < 80 ? 'start' : 'middle')).style('font-size', '11px').style('font-weight', 600).style('fill', '#0B1A2E').style('paint-order', 'stroke').style('stroke', 'var(--color-bg)').style('stroke-width', 4).text('This school ' + f1(+r.a8));
    }});

  dash.draw('offnote', (el) => { const o = dash.data('official'); const r = S();
    if (o.status !== 'ok' || !o.data || !o.data.length) { el.textContent = 'No list pasted. Once you paste one, the four lenses table adds an official row.'; return; }
    const x = o.data[0]; el.replaceChildren();
    const b1 = document.createElement('b'); b1.textContent = x.found; mark(b1, 'official', 'found');
    const b2 = document.createElement('b'); b2.textContent = x.mean === null ? '—' : f1(x.mean); mark(b2, 'official', 'mean');
    el.append('Matched ', b1, ' of ' + x.pasted + ' URNs to 2025/26 results. Their average Attainment 8 is ', b2, r ? '; the replica group averages ' + f1(+r.ss_mean) + '.' : '.'); });

  dash.draw('neigh', (tb) => { const n = dash.data('neigh'); tb.replaceChildren(); if (n.status !== 'ok') return;
    const ok = (v, f) => (v === null || v === '' || isNaN(+v) ? '—' : f(+v));
    n.data.forEach((r) => { const tr = document.createElement('tr'); tr.setAttribute('data-key', r.urn); tr.style.cursor = 'pointer'; tr.tabIndex = 0;
      [r.name, r.la, ok(r.a8, f1), ok(r.dis_pct, f1), ok(r.pa_index, fs), ok(r.ss_diff, fs)].forEach((t, i) => { const td = document.createElement('td'); td.textContent = t; if (i >= 2) td.className = 'n'; tr.append(td); });
      const td = document.createElement('td'); if (r.g_ach) { const sp = document.createElement('span'); sp.className = 'oe-band'; sp.textContent = r.g_ach; sp.style.background = GC[r.g_ach]; if (r.g_ach === 'Expected standard') sp.style.color = '#0B1A2E'; td.append(sp); } else td.textContent = '—'; tr.append(td);
      tr.addEventListener('click', () => OE.choose(r.urn)); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') OE.choose(r.urn); }); tb.append(tr); }); });

  dash.draw('scatter', {mount: (el) => { el.replaceChildren(); const tip = document.createElement('div'); tip.className = 'oe-tip'; tip.hidden = true; el.append(tip);
      const svg = d3.select(el).append('svg').attr('width', '100%').attr('role', 'img').attr('aria-label', 'Scatter of Attainment 8 against the chosen context measure for every secondary school');
      const gy = svg.append('g').attr('class', 'ax grid'), gx = svg.append('g').attr('class', 'ax'), diag = svg.append('line').style('stroke', 'var(--cds-chart-reference)').style('stroke-dasharray', '4 4');
      const dots = svg.append('g'), lab = svg.append('text').style('font-size', '11px').style('fill', 'var(--cds-text-secondary)'), ya = svg.append('text').style('font-size', '11px').style('fill', 'var(--cds-text-secondary)').text('A8');
      const me = svg.append('path').attr('d', d3.symbol(d3.symbolDiamond, 170)()).style('fill', '#0B1A2E').style('stroke', '#fff').style('stroke-width', 2), mel = svg.append('text').style('font-size', '12px').style('font-weight', 600).style('fill', '#0B1A2E').style('paint-order', 'stroke').style('stroke', 'var(--color-bg)').style('stroke-width', 4).style('pointer-events', 'none');
      return {tip, svg, gy, gx, diag, dots, lab, ya, me, mel, first: true}; },
    update: (el, m) => { const d = dash.data('ks4'); if (d.status !== 'ok') return;
      const p = P(), xv = p.x, ar = p.area; const rows = d.data.filter((r) => !isNaN(num(r[xv])) && !isNaN(num(r.a8)));
      const me = rows.find((r) => r.urn === p.urn); const nb = new Set(me ? String(me.nn).split(' ') : []);
      const W = el.clientWidth || 700, H = Math.max(320, Math.min(520, W * 0.62)), M = {l: 40, r: 12, t: 14, b: 40};
      const x = d3.scaleLinear().domain(d3.extent(rows, (r) => +r[xv])).nice().range([M.l, W - M.r]);
      const y = d3.scaleLinear().domain(d3.extent(rows, (r) => +r.a8)).nice().range([H - M.b, M.t]);
      const T = OE.smooth() && !m.first ? 700 : 0; const intro = m.first && motion(); m.first = false;
      m.svg.attr('viewBox', `0 0 ${W} ${H}`);
      m.gy.attr('transform', `translate(${M.l},0)`).transition().duration(T).call(d3.axisLeft(y).ticks(6).tickSize(-(W - M.l - M.r))).call((g) => g.select('.domain').remove());
      m.gx.attr('transform', `translate(0,${H - M.b})`).transition().duration(T).call(d3.axisBottom(x).ticks(Math.max(3, Math.floor(W / 100))));
      const sameScale = xv === 'ss_mean' || xv === 'cva_exp';
      if (sameScale) { const lo = Math.max(x.domain()[0], y.domain()[0]), hi = Math.min(x.domain()[1], y.domain()[1]); m.diag.attr('x1', x(lo)).attr('y1', y(lo)).attr('x2', x(hi)).attr('y2', y(hi)).style('opacity', 1); } else m.diag.style('opacity', 0);
      m.lab.attr('x', M.l).attr('y', H - 6).text((document.querySelector('#oe-x option[value="' + xv + '"]') || {}).textContent || xv);
      m.ya.attr('x', 4).attr('y', M.t + 4);
      const ord = rows.slice().sort((a, b) => (a[ar] ? 1 : 0) - (b[ar] ? 1 : 0) || (nb.has(a.urn) ? 1 : 0) - (nb.has(b.urn) ? 1 : 0));
      const sel = m.dots.selectAll('circle').data(ord, (r) => r.urn);
      sel.exit().remove();
      const ent = sel.enter().append('circle').attr('cx', (r) => x(+r[xv])).attr('cy', (r) => y(+r.a8)).attr('r', intro ? 0 : 2.7).style('cursor', 'pointer')
        .on('pointerenter', (e, r) => { const pp = P(); m.tip.hidden = false; m.tip.textContent = r.name + ' (' + r.la + '): A8 ' + f1(+r.a8) + ' · ' + f1(+r[pp.x]) + (r[pp.area] ? ' · ' + r[pp.area] : ' · no report card yet') + '. Click to open.'; const [px, py] = d3.pointer(e, el); m.tip.style.left = Math.max(0, Math.min(px + 10, el.clientWidth - 260)) + 'px'; m.tip.style.top = Math.max(0, py - 44) + 'px'; })
        .on('pointerleave', () => { m.tip.hidden = true; }).on('click', (e, r) => OE.choose(r.urn));
      const all = ent.merge(sel).order();
      all.style('fill', (r) => GC[r[ar]] || '#D6DCE6').style('opacity', (r) => (r[ar] ? 0.85 : 0.5)).style('stroke', (r) => (nb.has(r.urn) ? 'var(--color-fg)' : 'none')).style('stroke-width', 1.2);
      all.interrupt().transition().duration(T || (intro ? 600 : 0)).delay((r, i) => (intro ? Math.min(i, 3000) * 0.15 : 0)).attr('cx', (r) => x(+r[xv])).attr('cy', (r) => y(+r.a8)).attr('r', (r) => (nb.has(r.urn) ? 4.2 : 2.7));
      if (me) { const mx = x(+me[xv]), my = y(+me.a8); m.me.style('opacity', 1).raise().transition().duration(T).attr('transform', `translate(${mx},${my})`);
        m.mel.raise().attr('text-anchor', mx > W - 170 ? 'end' : 'start').transition().duration(T).attr('x', mx + (mx > W - 170 ? -10 : 10)).attr('y', my - 9); m.mel.text(me.name); }
      else { m.me.style('opacity', 0); m.mel.text(''); }
    }});

  dash.draw('valid', (tb) => { const v = dash.data('valid'); tb.replaceChildren(); if (v.status !== 'ok') return;
    v.data.forEach((r) => { const tr = document.createElement('tr'); tr.setAttribute('data-key', encodeURIComponent(r.grade)); [r.grade, r.n, r.above, r.close, r.below, r.ofsted].forEach((t, i) => { const td = document.createElement('td'); td.textContent = t; if (i >= 1 && i <= 4) td.className = 'n'; tr.append(td); }); tb.append(tr); }); });

  dash.draw('idaci', {mount: (el) => { el.replaceChildren(); const tip = document.createElement('div'); tip.className = 'oe-tip'; tip.hidden = true; el.append(tip); return {tip}; },
    update: (el, m) => { const d = dash.data('idaci'); el.querySelectorAll('svg').forEach((s) => s.remove()); const ps = document.getElementById('oe-phase'); if (ps && ps.value !== P().phase) ps.value = P().phase; if (d.status !== 'ok' || !d.data) return;
      const G = ['Urgent improvement','Needs attention','Expected standard','Strong standard','Exceptional'];
      const W = el.clientWidth || 600, rowH = 36, M = {l: 96, r: 12, t: 6, b: 24}, H = M.t + M.b + rowH * 5;
      const x = d3.scaleLinear().domain([0, 100]).range([M.l, W - M.r]);
      // grows once on first view; after that only when the reader changes phase or area
      const key = (dash.params().phase || '') + '|' + (dash.params().area2 || ''); const animate = OE.smooth() && (m.key === undefined ? motion() : m.key !== key); m.key = key;
      const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Share of each report card grade by IDACI quintile');
      svg.append('g').attr('class', 'ax').attr('transform', `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(5).tickFormat((v) => v + '%'));
      d.data.forEach((r, i) => { const yy = M.t + i * rowH; let acc = 0; const n = r.n || 1;
        svg.append('text').attr('x', M.l - 8).attr('y', yy + rowH / 2 + 4).attr('text-anchor', 'end').style('font-size', '12px').style('fill', 'var(--color-fg)').text((i === 0 ? 'Least ' : i === 4 ? 'Most ' : 'Q' + r.quintile + ' ') + '(' + r.n + ')');
        G.forEach((g) => { const w = 100 * r[g] / n; if (!w) return; const x0 = acc; acc += w;
          const rect = svg.append('rect').attr('y', yy + 4).attr('height', rowH - 8).style('fill', GC[g]).style('cursor', 'help')
            .on('pointerenter', () => { m.tip.hidden = false; m.tip.textContent = (i === 0 ? 'Least deprived fifth' : i === 4 ? 'Most deprived fifth' : 'Quintile ' + r.quintile) + ': ' + g + ', ' + r[g] + ' of ' + r.n + ' schools (' + Math.round(w) + '%)'; m.tip.style.left = Math.max(0, Math.min(x(x0), W - 260)) + 'px'; m.tip.style.top = Math.max(0, yy - 34) + 'px'; })
            .on('pointerleave', () => { m.tip.hidden = true; });
          if (animate) rect.attr('x', M.l).attr('width', 0).transition().duration(700).delay(i * 60).ease(d3.easeCubicOut).attr('x', x(x0)).attr('width', Math.max(0, x(acc) - x(x0) - 1));
          else rect.attr('x', x(x0)).attr('width', Math.max(0, x(acc) - x(x0) - 1));
          if (w >= 7) svg.append('text').attr('x', x(x0) + 4).attr('y', yy + rowH / 2 + 4).style('font-size', '11px').style('pointer-events', 'none').style('fill', g === 'Expected standard' ? '#0B1A2E' : '#fff').text(Math.round(w) + '%'); }); });
    }});

  // each area beside comparable schools
  const PHL = {'Primary': 'primary schools', 'Secondary': 'secondary schools', 'Special': 'special schools', 'Alternative provision': 'alternative provision schools', 'Nursery': 'nursery schools'};
  OE.PHL = PHL;
  dash.draw('areasub', (el) => { const r = S(); if (!r) { el.textContent = ''; return; } const ph = PHL[r.phase] || 'schools';
    el.textContent = 'Each bar shows how ' + ph + ' are graded in that area, from Urgent improvement on the left to Exceptional on the right. The marker shows this school\'s grade. IDACI fifths are Ofsted\'s quintiles of area deprivation, based on pupils\' home postcodes' + (r.rc_only ? '' : '. Disadvantaged fifths split all secondaries with results by the disadvantaged share of their GCSE year group. The 50 similar schools are those in the open replica that have a report card') + '. Groups of fewer than 10 schools are not shown.'; });
  const DARK_TEXT = new Set(['Expected standard', 'Needs attention']);
  dash.draw('areas', (box) => { const d = dash.data('areas'); box.replaceChildren(); if (d.status !== 'ok' || !d.data) return;
    const has = d.data.length > 0; const sec = document.getElementById('areas'); if (sec) sec.hidden = !has;
    document.documentElement.classList.toggle('oe-noareas', !has); if (!has) return;
    const pc = d3.format('.0f'), cnt = d3.format(',');
    const PH = (ph) => (PHL[ph] ? PHL[ph][0].toUpperCase() + PHL[ph].slice(1) : 'Schools');
    const QL = (q) => 'Same IDACI fifth: ' + (q === '1' ? 'least deprived' : q === '5' ? 'most deprived' : q + ' of 5');
    const p0 = d3.format('.0f');
    const DL = (q, c) => 'Same disadvantaged fifth: ' + (q === 1 ? 'least (under ' + p0(c[0]) + '%)' : q === 5 ? 'most (over ' + p0(c[3]) + '%)' : q + ' of 5 (' + p0(c[q - 2]) + '–' + p0(c[q - 1]) + '%)');
    d.data.forEach((a) => {
      const row = document.createElement('div'); row.className = 'oe-ar rise';
      const h = document.createElement('div'); h.className = 'h';
      const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = a.area;
      const chip = document.createElement('span'); chip.className = 'oe-band'; chip.textContent = a.grade; chip.style.background = GC[a.grade]; if (DARK_TEXT.has(a.grade)) chip.style.color = '#0B1A2E';
      h.append(lab, chip); row.append(h);
      const gs = document.createElement('div'); gs.className = 'gs';
      const groups = [[PH(a.phase) + ' in England', a.england, '']];
      groups.push([a.quintile ? QL(a.quintile) : 'Same IDACI fifth', a.fifth, a.quintile ? '' : 'Not yet published for this school']);
      if (a.dis !== undefined) groups.push([a.disq ? DL(a.disq, a.discuts) : 'Same disadvantaged fifth', a.dis, a.disq ? '' : 'No disadvantaged figure published']);
      if (a.similar) groups.push(['Its 50 similar schools', a.similar, '']);
      groups.forEach(([gl, dist, why]) => {
        const g = document.createElement('div'); g.className = 'g';
        const top = document.createElement('div'); top.className = 'gt';
        const t = document.createElement('span'); t.className = 'gl'; t.textContent = gl;
        const nn = document.createElement('span'); nn.className = 'gc'; top.append(t, nn); g.append(top);
        const foot = document.createElement('p'); foot.className = 'gn';
        if (!dist || dist.n < 10) { const e = document.createElement('div'); e.className = 'bar empty'; g.append(e);
          foot.textContent = why || (dist ? (dist.n ? 'Only ' + dist.n + (dist.n === 1 ? ' school' : ' schools') + ': too few to show' : 'No schools with this area graded') : ''); g.append(foot); gs.append(g); return; }
        nn.textContent = cnt(dist.n) + ' schools';
        const wrap = document.createElement('div'); wrap.className = 'barw';
        const bar = document.createElement('div'); bar.className = 'bar'; bar.setAttribute('role', 'img');
        const parts = []; let acc = 0, mk = null;
        GORDER.forEach((G) => { const v = dist[G]; if (!v) return; const w = 100 * v / dist.n;
          const seg = document.createElement('i'); seg.style.width = w + '%'; seg.style.background = GC[G]; seg.style.color = DARK_TEXT.has(G) ? '#0B1A2E' : '#fff';
          if (w >= 9) seg.textContent = pc(w) + '%';
          if (G === a.grade) { seg.classList.add('own'); mk = acc + w / 2; }
          seg.setAttribute('data-tip', gl + ': ' + G + ', ' + cnt(v) + ' of ' + cnt(dist.n) + ' schools (' + pc(w) + '%)');
          bar.append(seg); parts.push(G + ' ' + pc(w) + '%'); acc += w; });
        bar.setAttribute('aria-label', gl + ', ' + cnt(dist.n) + ' schools: ' + parts.join(', ') + '. This school: ' + a.grade + '.');
        wrap.append(bar);
        if (mk !== null) { const m = document.createElement('b'); m.className = 'mk'; m.style.left = mk + '%'; m.setAttribute('aria-hidden', 'true'); wrap.append(m); }
        const below = 100 * ((dist['Needs attention'] || 0) + (dist['Urgent improvement'] || 0)) / dist.n;
        const bb = document.createElement('b'); bb.textContent = pc(below) + '%'; foot.append(bb, ' below Expected standard');
        g.append(wrap, foot); gs.append(g); });
      row.append(gs); box.append(row); });
  });
})();
