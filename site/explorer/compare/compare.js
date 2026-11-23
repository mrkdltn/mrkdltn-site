/* Compare schools (benchmarks item 8, 23 November 2026): two or three secondary schools side by side.
   Each result is read against that school's own comparators, with the same rules and likely ranges as its own page
   (app.js: OE.rng, OE.PSD, OE.ctxThr, the lenses), so the readings here always match the school pages.
   The page sets figures beside each other; it draws no conclusion about which school is better, and adds no
   commentary on any school's grades (CLAUDE.md). The schools chosen live in the address: #u=URN,URN,URN. */
(() => {
  const f1 = d3.format('.1f'), fs = d3.format('+.1f'), f2s = d3.format('+.2f'), int = d3.format(',');
  const ok = (v) => !(v === null || v === undefined || v === '' || isNaN(+v));
  const $ = (id) => document.getElementById(id);
  const PSD = 14.2, MAX = 3;  // pupil-level spread of Attainment 8 (as OE.PSD)
  const GC = {'Exceptional': '#0176E0', 'Strong standard': '#33903C', 'Expected standard': '#5CD168', 'Needs attention': '#FF8341', 'Urgent improvement': '#CE1E02'};
  const RC = {'Well above': '#1E544D', 'Above': '#2F6F66', 'Close to': '#55627A', 'Below': '#A3402B', 'Well below': '#7A2617'};
  const tone = (t) => (/^well above/i.test(t) ? RC['Well above'] : /^above/i.test(t) ? RC.Above : /^well below/i.test(t) ? RC['Well below'] : /^below/i.test(t) ? RC.Below : RC['Close to']);
  const AREAS = [['g_ach', 'Achievement'], ['g_ct', 'Curriculum and teaching'], ['g_ab', 'Attendance and behaviour'], ['g_pd', 'Personal development and wellbeing'],
    ['g_inc', 'Inclusion'], ['g_lg', 'Leadership and governance'], ['g_p16', 'Post-16 provision'], ['g_ey', 'Early years']];
  const PHONE = window.matchMedia('(max-width: 640px)');
  let ROWS = null, BY = null, NAT = {}, MED = 180, VER = '';

  const expand = (j) => { const rows = new Array(j.n); for (let i = 0; i < j.n; i++) { const o = {}; for (const c of j.cols) { const v = j.data[c][i]; o[c] = v === null || v === undefined ? '' : (j.codes[c] ? j.codes[c][v] : String(v)); } rows[i] = o; } return rows; };
  // only schools in the data count (a closed school or a primary in an old link is dropped), so three valid ones are the limit
  const urns = () => { const u = new URLSearchParams(location.hash.slice(1)).get('u') || ''; return [...new Set(u.split(/[ ,]+/).filter((x) => /^\d+$/.test(x) && (!BY || BY.has(x))))].slice(0, MAX); };
  const setUrns = (list) => { const h = new URLSearchParams(location.hash.slice(1)); h.delete('v'); if (list.length) h.set('u', list.join(',')); else h.delete('u');
    const t = h.toString().replace(/%2C/g, ','); history.replaceState(null, '', location.pathname + (t ? '#' + t : '')); render(); };

  // ---------- readings (the rules each school's own page uses) ----------
  const rng = (g, h) => (ok(g) && ok(h) ? 'likely ' + fz(+(g - h).toFixed(1)) + ' to ' + fz(+(g + h).toFixed(1)) : '');
  const fz = (v) => (v === 0 ? '0.0' : fs(v));
  const natRead = (g, h) => (Math.abs(g) <= h ? 'Close to national' : g > 0 ? 'Above national' : 'Below national');
  const ssRead = (g, se, sd) => (Math.abs(g) < 1.96 * se ? 'Close to' : g > 0 ? (g > sd ? 'Well above' : 'Above') : (-g > sd ? 'Well below' : 'Below'));
  const p8Band = (s, lo, hi) => (!ok(lo) || !ok(hi) ? '' : lo > 0 ? (s >= 0.5 ? 'Well above average' : 'Above average') : hi < 0 ? (s < -0.5 ? 'Well below average' : 'Below average') : 'Average');  // DfE's bands, as OE.p8Band
  const ctxThr = (r, base) => (+r.pupils > 0 ? base * Math.sqrt(MED / +r.pupils) : base);

  // each row: label, note, and cell(r) giving {v, rg, rd} (value, likely range, reading) or null for a blank
  const gapCell = (g, h, rd) => (ok(g) ? {v: fs(+(+g).toFixed(1)), rg: rng(+g, h), rd} : null);
  const SPEC = [
    {sec: 'School'},
    {lab: 'GCSE year group, 2025/26', cell: (r) => (ok(r.pupils) ? {v: int(Math.round(+r.pupils)) + ' pupils'} : null)},
    {lab: 'Local authority', cell: (r) => (r.la ? {v: r.la, plain: true} : null)},
    {lab: 'Trust', cell: (r) => ({v: r.mat || 'Not in a trust', plain: true})},
    {sec: 'Report card'},
    {lab: 'Inspected', cell: (r) => (r.insp_date ? {v: d3.utcFormat('%-d %B %Y')(new Date(r.insp_date)), plain: true} : {v: 'Not yet inspected under the report card framework', plain: true, na: true})},
    ...AREAS.map(([k, lab]) => ({lab, key: k, cell: (r) => (GC[r[k]] ? {grade: r[k]} : r.insp_date ? null : {v: 'None yet', plain: true, na: true})})),
    {lab: 'Safeguarding', key: 'g_sg', cell: (r) => (r.g_sg === 'Met' || r.g_sg === 'Not met' ? {v: 'Standards ' + r.g_sg.toLowerCase(), plain: true} : r.insp_date ? null : {v: 'None yet', plain: true, na: true})},
    {sec: 'Attainment 8, 2025/26'},
    {lab: 'Attainment 8', note: 'Provisional', cell: (r) => (ok(r.a8) ? {v: f1(+r.a8)} : null)},
    {lab: 'Gap to England', note: () => 'National average ' + f1(NAT.a8), cell: (r) => { const h = 1.96 * PSD / Math.sqrt(Math.max(+r.pupils, 1)); return ok(r.nat_diff) ? gapCell(+r.nat_diff, h, natRead(+r.nat_diff, h)) : null; }},
    {lab: 'Gap to 50 similar schools', note: 'Open replica', cell: (r) => (ok(r.ss_diff) ? gapCell(+r.ss_diff, 1.96 * Math.sqrt(PSD * PSD / Math.max(+r.pupils, 1) + (+r.ss_sd || 0) ** 2 / 50), r.ss_band ? r.ss_band + ' similar schools' : '') : null)},
    {lab: 'Gap to contextual model', note: 'Expected for the intake', cell: (r) => { if (!ok(r.cva_res)) return null; const t = ctxThr(r, 2), g = +r.cva_res;
      return Object.assign(gapCell(g, t, Math.abs(g) < t ? 'In line with expectation' : g > 0 ? 'Above expectation' : 'Below expectation'), {sub: 'expected ' + f1(+r.cva_exp)}); }},
    {sec: 'English and maths, 2025/26'},
    {lab: 'Grade 5 or above', cell: (r) => (ok(r.em5) ? {v: f1(+r.em5) + '%'} : null)},
    {lab: 'Grade 5+: gap to England', note: () => 'National ' + f1(NAT.em5) + '%', cell: (r) => { if (!ok(r.em5)) return null; const g = +r.em5 - NAT.em5, pp = Math.min(99, Math.max(1, +r.em5)), h = 1.96 * Math.sqrt(pp * (100 - pp) / Math.max(+r.pupils, 1)); return gapCell(g, h, natRead(g, h)); }},
    {lab: 'Grade 5+: gap to 50 similar', note: 'Open replica', cell: (r) => { if (!ok(r.em5) || !ok(r.em5_ss)) return null; const g = +r.em5 - +r.em5_ss, sd = +r.em5_ssd || 0, pp = Math.min(99, Math.max(1, +r.em5)), se = Math.sqrt(pp * (100 - pp) / Math.max(+r.pupils, 1) + sd * sd / 50);
      return gapCell(g, 1.96 * se, ssRead(g, se, sd) + ' similar schools'); }},
    {lab: 'Grade 4 or above', cell: (r) => (ok(r.em4) ? {v: f1(+r.em4) + '%'} : null)},
    {sec: 'Earlier years'},
    {lab: 'Attainment 8, 2024/25', note: 'Final', cell: (r) => (ok(r.a8_25) ? Object.assign({v: f1(+r.a8_25)}, ok(r.ss_diff_25) ? {rg: fs(+r.ss_diff_25) + ' to its similar schools', rd: r.ss_band_25 ? r.ss_band_25 + ' similar schools' : ''} : {}) : null)},
    {lab: 'Progress 8, 2023/24', note: 'The last year published', cell: (r) => (ok(r.p8_24) ? {v: f2s(+r.p8_24), rg: ok(r.p8lo_24) ? 'likely ' + f2s(+r.p8lo_24) + ' to ' + f2s(+r.p8hi_24) : '', rd: p8Band(+r.p8_24, r.p8lo_24, r.p8hi_24)} : null)},
    {sec: 'Intake'},
    {lab: 'Disadvantaged pupils', note: () => 'GCSE year group; England ' + f1(NAT.dis_pct) + '%', cell: (r) => (ok(r.dis_pct) ? {v: f1(+r.dis_pct) + '%'} : null)},
    {lab: 'Prior attainment index', note: 'Key stage 2 profile; around 0 is the national middle', cell: (r) => (ok(r.pa_index) ? {v: fs(+r.pa_index) + (r.pa_imputed === 'yes' ? ' (estimated)' : '')} : null)},
    {lab: 'Area deprivation fifth', note: 'IDACI; 1 is least deprived', cell: (r) => (ok(r.idaci_q) ? {v: Math.round(+r.idaci_q) + ' of 5'} : null)},
    {lab: 'SEN support', cell: (r) => (ok(r.sensup_pct) ? {v: f1(+r.sensup_pct) + '%'} : null)},
    {lab: 'English as an additional language', cell: (r) => (ok(r.eal_school) ? {v: f1(+r.eal_school) + '%'} : null)}
  ];

  // ---------- table ----------
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const render = () => { const out = $('cm-out'), st = $('cm-status'); if (!ROWS) return; out.replaceChildren();
    const list = urns().map((u) => BY.get(u)).filter(Boolean); $('cm-act').hidden = !list.length; suggest(list);
    if (!list.length) { st.hidden = false; st.textContent = 'Add two or three secondary schools above to set them side by side.'; return; }
    st.hidden = list.length > 1; st.textContent = list.length === 1 ? 'Add one or two more schools to compare with ' + list[0].name + '.' : '';
    const n = list.length, ph = PHONE.matches, t = el('table'), cap = el('caption', '', 'Comparison of ' + list.map((r) => r.name).join(', ')); cap.className = 'vh'; cap.style.cssText = 'position:absolute;left:-9999px'; t.append(cap);
    const hr = el('tr'); if (!ph) hr.append(el('th', 'lab', ''));
    list.forEach((r) => { const th = el('th'); th.scope = 'col'; const a = el('a', '', r.name); a.href = '/explorer/school/' + r.urn + '/'; th.append(a, el('span', 'sub', [r.la, r.region].filter(Boolean).join(' · ')));
      const b = el('button', '', 'Remove'); b.type = 'button'; b.setAttribute('aria-label', 'Remove ' + r.name); b.addEventListener('click', () => setUrns(urns().filter((u) => u !== r.urn))); th.append(b); hr.append(th); });
    const th = el('thead'); th.append(hr); t.append(th); const tb = el('tbody');
    SPEC.forEach((s) => { if (s.sec) { const tr = el('tr', 'sec'), h = el('th', '', s.sec); h.colSpan = ph ? n : n + 1; h.scope = 'colgroup'; tr.append(h); tb.append(tr); return; }
      const cells = list.map((r) => s.cell(r)); if (s.key && cells.every((c) => !c || c.na)) return;  // an area none of these schools is graded on
      const note = typeof s.note === 'function' ? s.note() : s.note;
      // on phones the label sits on its own line above the values, so all the width goes to the schools
      if (ph) { const rl = el('tr', 'rl'), rlc = el('th', '', s.lab + (note ? ' (' + note + ')' : '')); rlc.colSpan = n; rlc.scope = 'colgroup'; rl.append(rlc); tb.append(rl); }
      const tr = el('tr'); if (!ph) { const h = el('th', '', s.lab); h.scope = 'row'; if (note) h.append(el('small', '', note)); tr.append(h); }
      cells.forEach((c) => { const td = el('td'); if (!c) td.append(el('span', 'na', 'Not available'));
        else if (c.grade) { const ch = el('span', 'chip'); ch.style.background = GC[c.grade]; ch.setAttribute('aria-hidden', 'true'); td.append(ch, c.grade); }
        else { td.append(el('span', c.na ? 'na' : c.plain ? '' : 'v', c.v)); if (c.sub) td.append(el('span', 'rg', c.sub)); if (c.rg) td.append(el('span', 'rg', c.rg)); if (c.rd) { const d = el('span', 'rd', c.rd); d.style.color = tone(c.rd); td.append(d); } }
        tr.append(td); });
      tb.append(tr); });
    t.append(tb); out.append(t); };

  // ---------- adding schools ----------
  const add = (urn) => { const l = urns(); if (l.includes(urn) || l.length >= MAX) return; setUrns(l.concat(urn)); const q = $('cm-q'); q.value = ''; closeRes(); };
  const res = $('cm-res'), q = $('cm-q'); let hits = [], sel = -1;
  const closeRes = () => { res.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); sel = -1; };
  const showRes = () => { res.replaceChildren(); hits.forEach((r, i) => { const li = el('li'); li.id = 'cm-o' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === sel)); li.append(r.name, el('small', '', [r.la, r.postcode].filter(Boolean).join(' · ')));
      li.addEventListener('mousedown', (e) => { e.preventDefault(); add(r.urn); }); res.append(li); });
    res.hidden = !hits.length; q.setAttribute('aria-expanded', String(!!hits.length)); if (sel >= 0) q.setAttribute('aria-activedescendant', 'cm-o' + sel); else q.removeAttribute('aria-activedescendant'); };
  q.addEventListener('input', () => { if (!ROWS) return; const toks = q.value.toLowerCase().split(/\s+/).filter(Boolean); sel = -1; if (!toks.length) { hits = []; closeRes(); return; } const have = urns();
    hits = ROWS.filter((r) => !have.includes(r.urn) && toks.every((t) => (r.name + ' ' + r.la + ' ' + (r.district || '') + ' ' + (r.postcode || '') + ' ' + (r.mat || '')).toLowerCase().includes(t))).slice(0, 8); showRes(); });
  q.addEventListener('keydown', (e) => { if (res.hidden) return; if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(hits.length - 1, sel + 1); showRes(); } else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); showRes(); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = hits[Math.max(0, sel)]; if (r) add(r.urn); } else if (e.key === 'Escape') closeRes(); });
  q.addEventListener('blur', () => setTimeout(closeRes, 150));

  // quick picks: the first school's nearest similar schools (the same open replica as its page)
  const shards = new Map();
  const suggest = (list) => { const box = $('cm-sugg'); box.replaceChildren(); q.disabled = list.length >= MAX; q.placeholder = list.length >= MAX ? 'Three schools chosen: remove one to add another' : 'Add a secondary school by name, town or local authority';
    if (!list.length || list.length >= MAX) { box.hidden = true; return; } const first = list[0], k = (+first.urn) % 32;
    if (!shards.has(k)) shards.set(k, d3.json('/explorer/data/nn/' + k + '.json').catch(() => { shards.delete(k); return {}; }));
    shards.get(k).then((m) => { if (urns()[0] !== first.urn) return; const have = urns(); const pick = (m[first.urn] || []).map(String).filter((u) => !have.includes(u) && BY.has(u)).slice(0, 4); box.replaceChildren(); if (!pick.length) { box.hidden = true; return; }
      box.append('Or add one of ' + first.name + '’s most similar schools:'); pick.forEach((u) => { const b = el('button', '', BY.get(u).name); b.type = 'button'; b.addEventListener('click', () => add(u)); box.append(b); }); box.hidden = false; }); };

  // ---------- CSV and sharing ----------
  $('cm-csv').addEventListener('click', () => { const list = urns().map((u) => BY.get(u)).filter(Boolean); if (!list.length) return;
    const qc = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = [['measure', 'note'].concat(list.map((r) => r.name + ' (' + r.urn + ')'))];
    SPEC.forEach((s) => { if (s.sec) return; const cells = list.map((r) => s.cell(r)); if (s.key && cells.every((c) => !c || c.na)) return; const note = typeof s.note === 'function' ? s.note() : (s.note || '');
      rows.push([s.lab, note].concat(cells.map((c) => (!c ? '' : c.grade ? c.grade : [c.v, c.sub, c.rg, c.rd].filter(Boolean).join('; '))))); });
    rows.push(['source', 'DfE KS4 2025/26 provisional (28 October 2026), 2024/25 final, 2023/24; Ofsted report cards; DfE/Ofsted similar-schools model, open replica; mrkdltn.com/explorer']);
    if (VER) rows.push(['data_version', VER]);
    const a = el('a'); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(qc).join(',')).join('\n') + '\n'], {type: 'text/csv;charset=utf-8'})); a.download = 'ofsted-explorer-compare-' + list.map((r) => r.urn).join('-') + (VER ? '-' + VER : '') + '.csv'; document.body.append(a); a.click(); a.remove(); });
  if (window.OEshare) { OEshare.button($('cm-share'), {url: () => location.href, title: () => 'Compare: ' + urns().map((u) => (BY && BY.get(u) ? BY.get(u).name : u)).join(', ') + ' · Ofsted Explorer'}); OEshare.check({host: '.cm'}); }
  window.addEventListener('hashchange', render);
  PHONE.addEventListener('change', render);

  // ---------- data ----------
  fetch('/explorer/data/build.json', {cache: 'no-cache'}).then((r) => r.json()).then((b) => { VER = b.version || ''; $('cm-ver').textContent = VER ? 'Data version ' + VER + '.' : ''; }).catch(() => {});
  d3.json('/explorer/data/ks4.json').then((j) => { ROWS = expand(j).filter((r) => ok(r.a8)).sort((a, b) => a.name.localeCompare(b.name)); BY = new Map(ROWS.map((r) => [r.urn, r]));
    const wm = (k) => { let s = 0, n = 0; ROWS.forEach((r) => { if (ok(r[k]) && +r.pupils > 0) { s += +r[k] * +r.pupils; n += +r.pupils; } }); return n ? s / n : NaN; };
    NAT = {a8: wm('a8'), em5: wm('em5'), dis_pct: wm('dis_pct')};
    const p = ROWS.map((r) => +r.pupils).filter((x) => x > 0).sort((a, b) => a - b); MED = p.length ? p[Math.floor(p.length / 2)] : 180;
    const raw = new URLSearchParams(location.hash.slice(1)).get('u'); if (raw && raw.split(/[ ,]+/).filter(Boolean).join(',') !== urns().join(',')) setUrns(urns()); else render(); }).catch(() => { $('cm-status').textContent = 'The school data could not be loaded. Please try again later.'; });
})();
