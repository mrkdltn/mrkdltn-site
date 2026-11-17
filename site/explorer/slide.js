// Presentation slides: 1920×1080 PNG (16:9, PowerPoint's default widescreen shape), drawn in the browser.
// Two kinds: the whole school at a glance, and the area open in "Areas in context".
// Published facts and the Explorer's own readings only, with sources and the school's link on every slide.
(() => {
  const OE = window.OE || {};
  const W = 1920, H = 1080, M = 96;
  const C = {ground: '#0B1A2E', panel: '#13263F', ink: '#F5F1E8', muted: '#A8B5C8', line: '#2B3C55', brass: '#C9A24B', track: '#1E3150'};
  const G = ['Urgent improvement', 'Needs attention', 'Expected standard', 'Strong standard', 'Exceptional'];
  const GC = {'Urgent improvement': '#CE1E02', 'Needs attention': '#FF8341', 'Expected standard': '#5CD168', 'Strong standard': '#33903C', 'Exceptional': '#0176E0'};
  const DARK = new Set(['Expected standard', 'Needs attention']);
  const SERIF = '"Libre Caslon Display", Georgia, serif', SANS = '"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
  const AREAS = [['g_ach', 'Achievement'], ['g_ct', 'Curriculum and teaching'], ['g_inc', 'Inclusion'], ['g_ab', 'Attendance and behaviour'], ['g_pd', 'Personal development and wellbeing'], ['g_lg', 'Leadership and governance'], ['g_ey', 'Early years'], ['g_p16', 'Post-16 provision']];
  const PHL = {'Primary': 'primary schools', 'Secondary': 'secondary schools', 'Special': 'special schools', 'Alternative provision': 'alternative provision schools', 'Nursery': 'nursery schools'};
  const today = () => new Date().toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'});
  const longDate = (iso) => (iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'}) : '');
  const f1 = (v) => (+v).toFixed(1), sg = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d === undefined ? 1 : d);
  const pc = (v) => Math.round(v) + '%';

  let build = null;
  fetch('/explorer/data/build.json', {cache: 'no-cache'}).then((r) => (r.ok ? r.json() : null)).then((b) => { build = b; }).catch(() => {});

  const fontsReady = () => (document.fonts ? Promise.all([`400 64px ${SERIF}`, `400 24px ${SANS}`, `600 24px ${SANS}`, `700 24px ${SANS}`].map((f) => document.fonts.load(f).catch(() => null))) : Promise.resolve());
  const font = (x, size, weight, fam) => { x.font = `${weight || 400} ${size}px ${fam || SANS}`; };
  const text = (x, t, px, py, o) => { o = o || {}; font(x, o.size || 24, o.w, o.fam); x.fillStyle = o.fill || C.ink; x.textBaseline = 'top'; x.textAlign = o.align || 'left'; x.fillText(t, px, py); };
  const tw = (x, t, size, w, fam) => { font(x, size, w, fam); return x.measureText(t).width; };
  const wrap = (x, t, size, w, fam, max) => { const words = String(t).split(/\s+/); const out = []; let cur = ''; words.forEach((wd) => { const tr = cur ? cur + ' ' + wd : wd; if (tw(x, tr, size, w, fam) <= max || !cur) cur = tr; else { out.push(cur); cur = wd; } }); if (cur) out.push(cur); return out; };
  const rect = (x, a, b, w, h, fill) => { x.fillStyle = fill; x.fillRect(a, b, w, h); };

  function frame(x, r, label) {
    rect(x, 0, 0, W, H, C.ground);
    text(x, 'OFSTED EXPLORER  ·  ' + label, M, 60, {size: 22, w: 650, fill: C.brass});
    text(x, 'mrkdltn.com/explorer', W - M, 60, {size: 22, fill: C.muted, align: 'right'});
    let size = 72; let lines = wrap(x, r.name, size, 400, SERIF, W - 2 * M);
    while (lines.length > 1 && size > 48) { size -= 4; lines = wrap(x, r.name, size, 400, SERIF, W - 2 * M); }
    text(x, lines[0] + (lines.length > 1 ? '…' : ''), M, 100, {size, fam: SERIF});
    const meta = [r.la, r.region, r.rc_only ? r.phase : 'Secondary', 'URN ' + r.urn, r.insp_date ? 'inspected ' + longDate(r.insp_date) : 'no report card yet'].filter(Boolean).join('  ·  ');
    text(x, meta, M, 100 + size + 14, {size: 26, fill: C.muted});
    return 100 + size + 14 + 26;
  }

  function footer(x, r, extra) {
    x.fillStyle = C.line; x.fillRect(M, 958, W - 2 * M, 1);
    const lp = build && build.latest_published ? `published to ${longDate(build.latest_published)}` : 'updated daily';
    const src = `Sources: Ofsted report cards (management information and reports.ofsted.gov.uk, ${lp})` + (r.rc_only ? '; DfE Get Information about Schools.' : '; DfE key stage 4 performance 2025/26 provisional; DfE school census, January 2026.');
    text(x, src, M, 974, {size: 18, fill: C.muted});
    if (extra) text(x, extra, M, 1001, {size: 18, fill: C.muted});
    text(x, 'A reading of the data, not a judgement on the school.', M, 1030, {size: 18, w: 600});
    text(x, `mrkdltn.com/explorer/school/${r.urn}  ·  made ${today()}`, W - M, 1030, {size: 18, w: 600, align: 'right'});
  }

  function chip(x, g, px, py, size) {
    const t = g; const w = tw(x, t, size, 700) + size * 1.4, h = size * 1.75;
    rect(x, px, py, w, h, GC[g] || '#8A96A8'); text(x, t, px + size * 0.7, py + size * 0.36, {size, w: 700, fill: DARK.has(g) ? C.ground : '#FFFFFF'});
    return w;
  }

  // stacked distribution bar with the school's grade outlined and marked
  function distBar(x, dist, grade, px, py, w, h) {
    rect(x, px, py, w, h, C.track); let acc = 0, mk = null;
    G.forEach((g) => { const c = dist[g] || 0; if (!c) return; const sw = w * c / dist.n; rect(x, px + acc, py, sw, h, GC[g]);
      if (g === grade) { x.strokeStyle = C.ink; x.lineWidth = 3; x.strokeRect(px + acc + 1.5, py + 1.5, sw - 3, h - 3); mk = px + acc + sw / 2; }
      const p = pc(100 * c / dist.n), size = Math.max(14, Math.round(h * 0.46));
      if (tw(x, p, size, 650) + 14 < sw) text(x, p, px + acc + sw / 2, py + (h - size) / 2 - 1, {size, w: 650, align: 'center', fill: DARK.has(g) ? C.ground : '#FFFFFF'});
      acc += sw; });
    if (mk !== null) { const m = Math.min(13, Math.max(8, h * 0.28)); x.fillStyle = C.ink; x.beginPath(); x.moveTo(mk - m, py - m * 1.5); x.lineTo(mk + m, py - m * 1.5); x.lineTo(mk, py - 4); x.closePath(); x.fill(); }
  }

  function key(x, px, py) {
    G.forEach((g) => { rect(x, px, py + 3, 18, 18, GC[g]); text(x, g, px + 28, py, {size: 21}); px += 28 + tw(x, g, 21) + 34; });
    x.fillStyle = C.ink; x.beginPath(); x.moveTo(px, py + 5); x.lineTo(px + 18, py + 5); x.lineTo(px + 9, py + 19); x.closePath(); x.fill();
    text(x, 'This school’s grade', px + 28, py, {size: 21});
  }

  // ---------- the area open in "Areas in context" ----------
  function drawArea(x, r, a) {
    const top = frame(x, r, 'AREA IN CONTEXT') + 44;
    text(x, a.area, M, top, {size: 54, fam: SERIF});
    chip(x, a.grade, M + tw(x, a.area, 54, 400, SERIF) + 30, top + 10, 28);
    const ph = PHL[a.phase] || 'schools';
    text(x, `How comparable ${ph} are graded for ${a.area.toLowerCase()}. The marker shows this school’s grade.`, M, top + 82, {size: 24, fill: C.muted});
    key(x, M, top + 128);
    const q = a.quintile, QL = q === '1' ? 'least deprived' : q === '5' ? 'most deprived' : q + ' of 5';
    const groups = [[(ph.charAt(0).toUpperCase() + ph.slice(1)) + ' in England', a.england], [q ? 'Same IDACI fifth: ' + QL : 'Same IDACI fifth', a.fifth]];
    if (a.dis !== undefined) { const c = a.discuts || [], dq = a.disq; const lab = !dq ? 'Same disadvantaged fifth' : 'Same disadvantaged fifth: ' + (dq === 1 ? `fewest (under ${Math.round(c[0])}%)` : dq === 5 ? `most (over ${Math.round(c[3])}%)` : `${dq} of 5 (${Math.round(c[dq - 2])}–${Math.round(c[dq - 1])}%)`); groups.push([lab, a.dis]); }
    if (a.similar) groups.push(['Its 50 similar schools with a report card', a.similar]);
    const y0 = top + 190, avail = 944 - y0, step = Math.min(132, avail / groups.length), bw = W - 2 * M - 250, bh = Math.max(30, Math.min(46, step - 80));
    text(x, 'Below Expected', M + bw + 40, y0 - 2, {size: 20, w: 600, fill: C.muted});
    groups.forEach(([lab, dist], i) => {
      const y = y0 + i * step;
      text(x, lab, M, y, {size: 26, w: 600});
      if (!dist || dist.n < 10) { text(x, dist && dist.n ? `Only ${dist.n} schools: too few to show` : 'Not available for this school', M, y + 50, {size: 22, fill: C.muted}); return; }
      text(x, dist.n.toLocaleString('en-GB') + ' schools', M + bw, y + 3, {size: 23, fill: C.muted, align: 'right'});
      distBar(x, dist, a.grade, M, y + 54, bw, bh);
      text(x, pc(100 * ((dist['Needs attention'] || 0) + (dist['Urgent improvement'] || 0)) / dist.n), M + bw + 40, y + 54 + (bh - 38) / 2, {size: 38, w: 700});
    });
    footer(x, r, 'IDACI fifth: Ofsted’s quintile of pupils’ area deprivation.' + (a.dis !== undefined ? ' Disadvantaged fifth: share of the GCSE year group, fifths across all secondaries. Similar schools: open replica, not the official IDSR list.' : ''));
  }

  // ---------- the whole school at a glance ----------
  function drawSchool(x, r) {
    const top = frame(x, r, 'SCHOOL AT A GLANCE') + 40;
    const y0 = Math.max(top, 290), cardH = 932 - y0;
    // report card
    const lw = 840; rect(x, M, y0, lw, cardH, C.panel);
    text(x, 'Ofsted report card', M + 36, y0 + 30, {size: 40, fam: SERIF});
    const tiles = AREAS.filter(([k]) => GC[r[k]]).map(([k, l]) => [l, r[k]]);
    if (r.g_sg === 'Met' || r.g_sg === 'Not met') tiles.push(['Safeguarding', r.g_sg]);
    if (!tiles.length) text(x, 'Not yet inspected under the report card framework.', M + 36, y0 + 100, {size: 26, fill: C.muted});
    const rows = Math.ceil(tiles.length / 2), tH = Math.min(86, (cardH - 120 - (rows - 1) * 12) / Math.max(rows, 1)), tW = (lw - 72 - 14) / 2;
    tiles.forEach(([l, g], i) => { const tx = M + 36 + (i % 2) * (tW + 14), ty = y0 + 100 + Math.floor(i / 2) * (tH + 12);
      const bg = GC[g] || (g === 'Not met' ? '#CE1E02' : '#2B3C55'); rect(x, tx, ty, tW, tH, bg); const fg = DARK.has(g) ? C.ground : '#FFFFFF';
      text(x, l, tx + 18, ty + tH * 0.16, {size: 20, fill: fg}); text(x, g, tx + 18, ty + tH * 0.5, {size: 27, w: 700, fill: fg}); });
    const rx = M + lw + 40, rw = W - M - rx;
    if (!r.rc_only) {
      const lenses = (dash.data('lenses').data || []).filter((l) => !/official/i.test(l.lens));
      const h1 = 404; rect(x, rx, y0, rw, h1, C.panel);
      const mm = OE.meas ? OE.meas() : 'a8', MM = (OE.MEAS || {})[mm] || {label: 'Attainment 8', unit: '', scale: 15}, u = MM.unit;
      text(x, mm === 'a8' ? 'GCSE results, read four ways' : 'GCSE results, read three ways', rx + 36, y0 + 30, {size: 40, fam: SERIF});
      text(x, `${MM.label}, 2025/26 provisional: ${f1(r[mm])}${u}`, rx + 36, y0 + 84, {size: 22, fill: C.muted});
      lenses.slice(0, 4).forEach((l, i) => { const ly = y0 + 134 + i * 66, p8 = /Progress 8/.test(l.lens);
        const name = l.lens.replace(' (open replica)', '').replace('Published attainment', 'National average').replace('Similar schools', '50 similar schools');
        text(x, name, rx + 36, ly, {size: 23, w: 600});
        const sub = l.comparator === null || l.comparator === undefined ? 'Not available' : (p8 ? `Score ${sg(l.gap, 2)}` : `Comparator ${f1(l.comparator)}${u}  ·  gap ${sg(l.gap)}${u ? ' pts' : ''}`);
        text(x, sub, rx + 36, ly + 31, {size: 20, fill: C.muted});
        const bx = rx + 400, bw = 180, mid = bx + bw / 2; rect(x, bx, ly + 12, bw, 20, C.track);
        if (l.gap !== null && l.gap !== undefined) { const g = p8 ? l.gap * 10 : l.gap, w = Math.min(bw / 2, Math.abs(g) / (l.scale || 15) * bw / 2); rect(x, g < 0 ? mid - w : mid, ly + 12, w, 20, g < 0 ? '#FF8341' : '#33903C'); }
        rect(x, mid - 1, ly + 6, 2, 32, C.ink);
        let rd = String(l.reading || '').replace(' with expectation', '').replace(' expectation', '').replace('Not significantly different', 'Not significant');
        const room = rx + rw - 30 - (bx + bw + 22); let fs2 = 20; while (fs2 > 15 && tw(x, rd, fs2, 600) > room) fs2--;
        text(x, rd, bx + bw + 22, ly + 10 + (20 - fs2) / 2, {size: fs2, w: 600}); });
      const y1 = y0 + h1 + 24; rect(x, rx, y1, rw, 932 - y1, C.panel);
      text(x, 'Intake', rx + 36, y1 + 26, {size: 34, fam: SERIF});
      const dq = OE.disFifth ? OE.disFifth(r.dis_pct) : null;
      const items = [['Disadvantaged (GCSE year group)', f1(r.dis_pct) + '%', dq ? `fifth ${dq} of 5` : ''], ['IDACI quintile of pupils', r.idaci_q ? String(r.idaci_q).split('.')[0] : '—', r.idaci_q == 5 ? 'most deprived fifth' : r.idaci_q == 1 ? 'least deprived fifth' : ''],
        ['Prior attainment index', sg(+r.pa_index), 'national middle about 0'], ['GCSE cohort', String(Math.round(r.pupils)), 'pupils']];
      items.forEach(([l, v, n], i) => { const cx = rx + 36 + (i % 2) * ((rw - 72) / 2), cy = y1 + 82 + Math.floor(i / 2) * 64;
        text(x, l, cx, cy, {size: 19, fill: C.muted}); text(x, v, cx, cy + 24, {size: 26, w: 700}); if (n) text(x, n, cx + tw(x, v, 26, 700) + 12, cy + 31, {size: 18, fill: C.muted}); });
      footer(x, r, 'Similar schools are an open replica of the DfE and Ofsted model, not the official IDSR list' + (mm === 'a8' ? '' : ', built for Attainment 8') + '. Contextual model: one regression on the same public factors.');
    } else {
      // other phases: each area beside same-phase schools in England
      rect(x, rx, y0, rw, cardH, C.panel);
      const ph = PHL[r.phase] || 'schools';
      text(x, `Beside ${ph} in England`, rx + 36, y0 + 30, {size: 40, fam: SERIF});
      text(x, 'Share graded below Expected standard in each area', rx + 36, y0 + 84, {size: 22, fill: C.muted});
      const areas = (dash.data('areas').data || []);
      const stepA = Math.min(84, (cardH - 140) / Math.max(areas.length, 1)), hA = Math.max(16, Math.min(28, stepA - 52)), lab = stepA < 74 ? 19 : 21;
      areas.slice(0, 8).forEach((a, i) => { const ay = y0 + 124 + i * stepA, by = ay + lab + 18;
        text(x, a.area, rx + 36, ay, {size: lab, w: 600});
        if (a.england && a.england.n >= 10) { distBar(x, a.england, a.grade, rx + 36, by, rw - 200, hA);
          text(x, pc(100 * ((a.england['Needs attention'] || 0) + (a.england['Urgent improvement'] || 0)) / a.england.n), rx + rw - 36, by + (hA - 24) / 2, {size: 24, w: 700, align: 'right'}); } });
      footer(x, r, 'Bars: how ' + ph + ' in England are graded in each area; the outlined segment is this school’s grade.');
    }
  }

  async function make(kind) {
    const s = dash.data('school'); const r = s && s.data && s.data[0]; if (!r) return;
    await fontsReady();
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    let name;
    if (kind === 'area') { const a = (dash.data('areas').data || []).find((z) => z.key === OE.areaSel) || (dash.data('areas').data || [])[0]; if (!a) return; drawArea(x, r, a); name = a.area; }
    else { drawSchool(x, r); name = 'at a glance'; }
    const slug = (t) => String(t).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const file = `${slug(r.name)}-${slug(name)}-${r.urn}.png`;
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    const f = new File([blob], file, {type: 'image/png'});
    const touch = matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.canShare && navigator.canShare({files: [f]})) { try { await navigator.share({files: [f], title: r.name}); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  OE.slide = make;

  const wire = (id, kind) => { const b = document.getElementById(id); if (!b) return; b.addEventListener('click', async () => { const t = b.textContent; b.disabled = true; b.textContent = 'Making slide…'; try { await make(kind); } finally { b.disabled = false; b.textContent = t; } }); };
  wire('oe-slide', 'school'); wire('oe-aslide', 'area');
})();
