/* Attendance Explorer: enforcement. Penalty notices and the other legal measures against parents, from the DfE's yearly
   "Parental responsibility measures" statistics, set beside unauthorised holiday absence and the absence of pupil groups.
   On a local authority or county page it draws that place against England (#gx-enf); on Patterns it draws every local
   authority at once (#px-enf). Enforcement is not absence, so nothing here is green or rust: the place is midnight,
   England and every other authority slate. A count of 1 to 9 arrives as -1 and is written "fewer than 10". */
(function () {
  const $ = (id) => document.getElementById(id), area = $('gx-enf'), all = $('px-enf'); if (!area && !all) return;
  const INK = '#0B1A2E', SLATE = '#55627A', SOFT = '#A8B5C8', GRID = '#E3E6EC', BRASS = '#C9A24B';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const num = (v) => (v == null ? '–' : v < 0 ? 'fewer than 10' : v === 0 ? 'None' : v.toLocaleString('en-GB'));
  const isLA = (c) => /^E0|^E10/.test(c);
  // how many local authorities recorded none, fewer than 10, 10 or more, or gave no figure, for one measure
  const spread = (c, y) => { const o = {none: 0, few: 0, more: 0, na: 0, n: 0}; Object.keys(D.areas).filter(isLA).forEach((k) => { const r = D.areas[k].y[y]; if (!r) return; const v = r[C[c]]; o.n++; o[v == null ? 'na' : v === 0 ? 'none' : v < 0 ? 'few' : 'more']++; }); return o; };
  const ay = (y) => y + '/' + String((+y + 1) % 100).padStart(2, '0');
  const width = (el) => Math.max(280, Math.floor(el.getBoundingClientRect().width));
  const svg = (el, w, h, label) => d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', label);
  const add = (host, tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; host.appendChild(e); return e; };
  const tip = $('ax-tip');
  const showTip = (ev, html) => { if (!tip) return; tip.innerHTML = html; tip.hidden = false; const r = tip.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(ev.clientX + 12, innerWidth - r.width - 8)) + 'px'; tip.style.top = (ev.clientY + 16 + r.height > innerHeight ? Math.max(8, ev.clientY - r.height - 12) : ev.clientY + 16) + 'px'; };
  const hideTip = () => { if (tip) tip.hidden = true; };
  let D = null, C = {};
  const col = (rec, y, name) => { const v = rec && rec.y[y]; return v ? v[C[name]] : null; };
  const per = (rec, y, name, base) => { const v = col(rec, y, name), e = col(rec, y, 'enrol'); return v == null || v < 0 || !e ? null : base * v / e; };
  const SRC = () => `Source: DfE, Parental responsibility measures, ${ay(D.latest)}, published ${new Date(D.published + 'T12:00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})}; unauthorised holiday absence from the DfE's school-level absence statistics.`;

  // ---------------------------------------------------------------- the flag
  // A local authority is flagged where two published facts hold together: few penalty notices for unauthorised absence other
  // than holiday (none, fewer than 10, or in the lowest quarter of authorities for its size), and, for at least one pupil
  // group, persistent absence and severe absence both in the highest quarter of authorities. Authorities under 2,000 pupils
  // are left out. It is a statement of two facts side by side and claims no cause.
  const FG = [['fsm', 'pupils eligible for free school meals'], ['sen', 'pupils with SEN support'], ['ehcp', 'pupils with an education, health and care plan']];
  let FLAGS = null;
  function flags(rows) {
    const L = String(D.latest), big = rows.filter((r) => D.areas[r.id] && D.areas[r.id].y[L] && col(D.areas[r.id], L, 'enrol') >= 2000 && r.pg && r.pg.A);
    const cnt = (r) => col(D.areas[r.id], L, 'other'), rt = (r) => (cnt(r) == null ? null : cnt(r) < 0 ? 0 : per(D.areas[r.id], L, 'other', 1000)), val = (r, g, m) => { const x = r.pg.A[g]; return x && x[1] && x[1][m] != null ? x[1][m] : null; };
    const lowCut = d3.quantile(big.map(rt).filter((v) => v != null).sort(d3.ascending), 0.25), cut = {};
    FG.forEach(([g]) => { cut[g] = [1, 2].map((m) => d3.quantile(big.map((r) => val(r, g, m)).filter((v) => v != null).sort(d3.ascending), 0.75)); });
    const out = {list: [], by: {}, lowCut, cut, n: big.length, low: 0};
    big.forEach((r) => { const c = cnt(r); if (c == null || !(c <= 0 || rt(r) <= lowCut)) return; out.low++;
      const gs = FG.filter(([g]) => { const pa = val(r, g, 1), sa = val(r, g, 2); return pa != null && sa != null && pa >= cut[g][0] && sa >= cut[g][1]; }).map(([g, n]) => ({g, n, pa: val(r, g, 1) / 100, sa: val(r, g, 2) / 100}));
      if (gs.length) { const f = {r, c, rate: c > 0 ? rt(r) : null, gs, cm: col(D.areas[r.id], L, 'cm')}; out.list.push(f); out.by[r.id] = f; } });
    out.list.sort((a, b) => a.r.name.localeCompare(b.r.name)); return out;
  }
  const lowWords = (f, L) => (f.c === 0 ? 'recorded <b>no</b> penalty notices' : f.c < 0 ? 'issued <b>fewer than 10</b> penalty notices' : `issued <b>${num(f.c)}</b> penalty notices (${f.rate.toFixed(1)} for every 1,000 pupils, in the lowest quarter of local authorities)`) + ` for unauthorised absence other than holiday in ${ay(L)}`;
  const joinAnd = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

  // ---------------------------------------------------------------- one place against England
  function lines(host, title, unit, series, years, fmt) {
    const box = add(host, 'div', 'en-mini'); add(box, 'h3', null, title);
    const el = add(box, 'div', 'ax-chart'), W = width(el), H = 210, m = {l: 40, r: 12, t: 10, b: 26}, s = svg(el, W, H, title);
    const vals = series.flatMap((x) => years.map((y) => x.get(y))).filter((v) => v != null), x = d3.scalePoint(years, [m.l, W - m.r]), y = d3.scaleLinear([0, d3.max(vals) || 1], [H - m.b, m.t]).nice(4);
    y.ticks(4).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID); s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text(t + unit); });
    years.forEach((yr, i) => { if (i % (W < 420 ? 3 : 2) === (years.length - 1) % (W < 420 ? 3 : 2)) s.append('text').attr('x', x(yr)).attr('y', H - 8).attr('text-anchor', 'middle').text(ay(yr).slice(2)); });
    series.forEach((se) => { const pts = years.map((yr) => ({yr, v: se.get(yr)}));
      s.append('path').attr('d', d3.line().defined((d) => d.v != null).x((d) => x(d.yr)).y((d) => y(d.v))(pts)).attr('fill', 'none').attr('stroke', se.c).attr('stroke-width', se.w);
      s.append('g').selectAll('circle').data(pts.filter((d) => d.v != null)).join('circle').attr('cx', (d) => x(d.yr)).attr('cy', (d) => y(d.v)).attr('r', se.w + 1).attr('fill', se.c)
        .on('pointerenter pointermove', (ev, d) => showTip(ev, `<b>${esc(se.n)}</b>, ${ay(d.yr)}<br>${fmt(d.v)}`)).on('pointerleave', hideTip); });
  }
  function fate(host, rows, y) {
    const PARTS = [['Paid within 21 days', (r) => col(r, y, 'paid21'), '#33405A'], ['Paid within 22 to 28 days', (r) => { const a = col(r, y, 'paid'), b = col(r, y, 'paid21'); return a == null || b == null || a < 0 || b < 0 ? null : a - b; }, '#7C8799'],
      ['Withdrawn', (r) => col(r, y, 'withdrawn'), '#C5CCD8'], ['Prosecuted for non-payment', (r) => col(r, y, 'pros'), INK], ['Unresolved at the end of the year', (r) => col(r, y, 'unresolved'), '#fff']];
    const el = add(host, 'div', 'ax-chart'), W = width(el), narrow = W < 560, lab = narrow ? 0 : 150, rh = narrow ? 54 : 40, H = rows.length * rh + 6, s = svg(el, W, H, 'What became of the penalty notices issued in ' + ay(y));
    // shares are of all notices issued. A part that is fewer than 10, or was not supplied, is not given a figure: such parts
    // share what is left of the bar and are labelled, so the other shares stay true.
    rows.forEach((r, k) => { const raw = PARTS.map((p) => { const v = p[1](r.rec); return v == null || v < 0 ? null : v; }), known = d3.sum(raw), issued = col(r.rec, y, 'issued'), tot = issued > 0 ? Math.max(issued, known) : known; if (!tot) return;
      const gaps = raw.filter((v) => v == null).length, each = gaps ? Math.max(0, tot - known) / gaps : 0; let acc = 0; const y0 = k * rh + (narrow ? 22 : 6), x = d3.scaleLinear([0, tot], [lab, W - 2]);
      s.append('text').attr('x', narrow ? 0 : lab - 10).attr('y', narrow ? y0 - 7 : y0 + 19).attr('text-anchor', narrow ? 'start' : 'end').attr('class', 'strong').text(r.n);
      raw.forEach((v0, i) => { const v = v0 == null ? each : v0, share = 100 * v / tot, words = v0 == null ? 'fewer than 10 notices, or no figure supplied' : share.toFixed(0) + '% of notices';
        s.append('rect').attr('x', x(acc)).attr('y', y0).attr('width', Math.max(0, x(acc + v) - x(acc))).attr('height', 28).attr('fill', PARTS[i][2]).attr('stroke', SLATE).attr('stroke-width', 0.75)
          .on('pointerenter pointermove', (ev) => showTip(ev, `<b>${esc(r.n)}</b><br>${PARTS[i][0]}: ${words}`)).on('pointerleave', hideTip);
        if (v0 != null && x(acc + v) - x(acc) > 34) s.append('text').attr('x', (x(acc) + x(acc + v)) / 2).attr('y', y0 + 18).attr('text-anchor', 'middle').attr('pointer-events', 'none').style('fill', i === 2 || i === 4 ? INK : '#fff').text(share.toFixed(0) + '%');
        acc += v; }); });
    const k = add(host, 'div', 'ax-key'); PARTS.forEach((p) => add(k, 'span', null, `<i style="background:${p[2]};border:1px solid ${SLATE}"></i>${p[0]}`));
  }
  function place() {
    const card = $('gx-enf-c'), q = new URLSearchParams(location.search), kind = q.get('k'), id = q.get('id'), rec = (kind === 'a' || kind === 'y') && D.areas[id], E = D.areas.E92000001, L = String(D.latest);
    card.hidden = !(rec && rec.y[L]); area.innerHTML = ''; if (card.hidden) return;
    const name = ($('gx-name') || {}).textContent || 'This area', issued = col(rec, L, 'issued');
    add(area, 'p', 'ax-sub', `Penalty notices to parents in ${ay(L)}, kept in two separate strands because they answer different things: notices for a holiday taken in term time without the school’s agreement, and notices for other unauthorised absence from school. ${kind === 'y' ? 'The county’s figures are those of its local authorities added together. ' : ''}These are counts of notices, not of pupils, and the DfE does not publish them by pupil group or for single schools.`);
    const fl = kind === 'a' && FLAGS && FLAGS.by[id];
    if (fl) { const box = add(area, 'div', 'en-flag'); box.setAttribute('role', 'note'); add(box, 'p', 'en-flag-h', 'Flag: few notices for unauthorised absence other than holiday, and high persistent and severe absence among ' + joinAnd(fl.gs.map((g) => g.n)));
      add(box, 'p', null, `${esc(name)} ${lowWords(fl, L)}.` + (fl.cm == null ? '' : ` It had ${fl.cm === 0 ? 'no' : fl.cm < 0 ? 'fewer than 10' : num(fl.cm)} cases in attendance case management.`)
        + ' ' + fl.gs.map((g) => `Among ${g.n}, persistent absence was <b>${g.pa.toFixed(1)}%</b> and severe absence <b>${g.sa.toFixed(2)}%</b> in the autumn and spring terms of ${ay(L)}, each in the highest quarter of local authorities (which starts at ${(FLAGS.cut[g.g][0] / 100).toFixed(1)}% and ${(FLAGS.cut[g.g][1] / 100).toFixed(2)}%).`).join(' '));
      add(box, 'p', 'en-flag-n', `${FLAGS.list.length} of ${FLAGS.n} local authorities carry this flag. It sets two published facts side by side and does not show that one causes the other. <a href="/attendance/patterns/#sec-enforcement">How the flag is set, and the others that carry it</a>.`); }
    const years = Object.keys(E.y).filter((y) => +y >= 2016).concat(['2019']).filter((y, i, a) => a.indexOf(y) === i).sort(), grid = add(area, 'div', 'en-pair en-strands');
    const strand = (c, title, noun, absKey, absName, absNote) => { const box = add(grid, 'div', 'en-strand'); add(box, 'h3', 'en-st', title);
      const n = col(rec, L, c), r = per(rec, L, c, 1000), er = per(E, L, c, 1000), ab = rec[absKey] && rec[absKey][L], eab = E[absKey] && E[absKey][L], sp = spread(c, L);
      const k = add(box, 'div', 'ax-kpis en-k3'), tile = (label, v, d) => add(k, 'div', 'ax-kpi', `<div class="k">${label}</div><div class="v">${v}</div><div class="d">${d}</div>`);
      tile('Notices issued', num(n), ay(L));
      tile('For every 1,000 pupils', n === 0 ? '–' : r == null ? (n < 0 ? 'under ' + (10000 / col(rec, L, 'enrol')).toFixed(1) : '–') : r.toFixed(1), 'England ' + er.toFixed(1));
      tile(absName, ab == null ? '–' : (ab / 100).toFixed(2) + '%', 'of sessions · England ' + (eab == null ? '–' : (eab / 100).toFixed(2) + '%'));
      const others = Object.keys(D.areas).filter(isLA).map((x) => per(D.areas[x], L, c, 1000)).filter((v) => v != null), above = r == null ? null : others.filter((v) => v > r).length;
      add(box, 'p', 'ax-reading', (n === 0 ? `${esc(name)} recorded <b>no</b> penalty notices for ${noun} in ${ay(L)}` + (kind === 'a' ? `, as did ${sp.none - 1} other local authorit${sp.none - 1 === 1 ? 'y' : 'ies'}.` : '.')
        : n == null ? `No figure was supplied for ${noun}.` : n < 0 ? `${esc(name)} issued <b>fewer than 10</b> penalty notices for ${noun} in ${ay(L)}.`
        : `${esc(name)} issued <b>${num(n)}</b> penalty notices for ${noun} in ${ay(L)}: <b>${r.toFixed(1)}</b> for every 1,000 pupils, against ${er.toFixed(1)} across England.` + (kind === 'a' && above != null ? ` ${above} of the ${others.length} local authorities issued more for their size.` : ''))
        + (ab == null || eab == null ? '' : ` ${absNote} took <b>${(ab / 100).toFixed(2)}%</b> of sessions in its schools, against ${(eab / 100).toFixed(2)}% across England.`));
      lines(box, 'Notices for every 1,000 pupils', '', [{n: 'England', c: SLATE, w: 2, get: (y) => per(E, y, c, 1000)}, {n: name, c: INK, w: 3, get: (y) => per(rec, y, c, 1000)}], years, (v) => v.toFixed(1) + ' for every 1,000 pupils');
      lines(box, absName + ', % of sessions', '%', [{n: 'England', c: SLATE, w: 2, get: (y) => (E[absKey] && E[absKey][y] != null ? E[absKey][y] / 100 : null)}, {n: name, c: INK, w: 3, get: (y) => (rec[absKey] && rec[absKey][y] != null ? rec[absKey][y] / 100 : null)}], years, (v) => v.toFixed(2) + '% of sessions'); };
    strand('hols', 'Holiday in term time, not agreed by the school', 'unauthorised holiday', 'hol', 'Unauthorised holiday absence', 'Unauthorised holiday');
    strand('other', 'Other unauthorised absence from school', 'other unauthorised absence', 'oth', 'Other unauthorised absence', 'Unauthorised absence other than holiday');
    const key = add(area, 'div', 'ax-key'); add(key, 'span', null, `<i style="background:${INK};height:3px"></i>${esc(name)}`); add(key, 'span', null, `<i style="background:${SLATE};height:2px"></i>England`);
    const late = col(rec, L, 'late'), ls = spread('late', L);
    add(area, 'p', 'ax-note', `A third, much smaller strand is lateness: ${late == null ? 'no figure was supplied' : late === 0 ? 'none' : num(late)} here in ${ay(L)}, and none in ${ls.none} of ${ls.n - ls.na} local authorities. `
      + 'The DfE records one main reason for each notice, and a notice can rest on a mixture of unauthorised absences, so the two strands are a little less separate in the source than they are drawn here. Reasons have been recorded since 2016/17, when two local authorities did not supply them. No figures were collected for 2019/20, and 2020/21 was a year of partial school closures. From August 2024 a national framework set one threshold and one scale of charges for every local authority, so 2024/25 is the first year counted on the same rules everywhere. '
      + '“Other unauthorised absence” in the right-hand charts is all unauthorised absence less unauthorised holiday; it includes arriving after the register has closed and absences with no reason yet given.');
    // what became of the notices: the DfE gives outcomes for all notices together, not by reason
    if (issued >= 10) { add(area, 'h3', 'en-h', `What became of the notices issued in ${ay(L)}`);
      add(area, 'p', 'ax-sub', 'The DfE publishes payment, withdrawal and prosecution for all penalty notices together, so this one chart cannot be split between holiday and other unauthorised absence.'); fate(area, [{n: name, rec}, {n: 'England', rec: E}], L); }
    // the other measures
    const ROWS = [['repeat', 'Second penalty notices to the same parent for the same child within three years'], ['pros_limit', 'Prosecutions because the limit of two notices had been reached'], ['cm', 'Cases entering attendance case management'],
      ['cm_pros', 'Cases prosecuted after case management'], ['cm_improved', 'Cases withdrawn because attendance improved'], ['contracts', 'Parenting contracts offered'], ['contracts_acc', 'Parenting contracts accepted'],
      ['orders', 'Parenting orders granted'], ['eso', 'Education supervision orders']];
    add(area, 'h3', 'en-h', `Other legal measures, ${ay(L)}`);
    const wrap = add(area, 'div', 'ax-tablewrap'), p10 = (r, c) => { const v = per(r, L, c, 10000); return v == null ? (col(r, L, c) < 0 ? 'under ' + (10 * 10000 / col(r, L, 'enrol')).toFixed(1) : '–') : v > 0 && v < 0.05 ? 'under 0.1' : v.toFixed(1); };
    add(wrap, 'table', 'ax-table en-table en-other', '<thead><tr><th>Measure</th><th class="n">Number</th><th class="n">For every 10,000 pupils</th><th class="n">England, for every 10,000</th><th class="n">Authorities recording none</th></tr></thead><tbody>'
      + ROWS.map(([c, n]) => { const sp = spread(c, L), v = col(rec, L, c); return `<tr><td>${n}</td><td class="n">${num(v)}</td><td class="n">${v === 0 ? '–' : p10(rec, c)}</td><td class="n">${p10(E, c)}</td><td class="n">${sp.none} of ${sp.n - sp.na}</td></tr>`; }).join('') + '</tbody>');
    add(area, 'p', 'ax-note', '“None” is a recorded zero, which is different from “fewer than 10” (a count of 1 to 9, not given exactly) and from a dash in the Number column (the local authority did not supply the figure). More enforcement is not in itself better or worse: the numbers reflect how much unauthorised absence there is, and also how each authority and its schools choose to respond to it. ' + SRC()
      + ' <a href="/attendance/patterns/#sec-enforcement">Every local authority compared</a>.');
  }

  // ---------------------------------------------------------------- every local authority at once (Patterns)
  const YS = [['hol', 'Unauthorised holiday absence', 'all pupils, % of sessions'], ['oth', 'Other unauthorised absence', 'all pupils, % of sessions'], ['fsm', 'Pupils eligible for free school meals', 'overall absence'], ['nfsm', 'Pupils not eligible', 'overall absence'],
    ['sen', 'Pupils with SEN support', 'overall absence'], ['ehcp', 'Pupils with an EHC plan', 'overall absence']];
  const XS = [['hols', 'Notices for unauthorised holiday'], ['other', 'Notices for other unauthorised absence'], ['cmp', 'Cases in case management']];
  const PAIR = {hols: 'hol', other: 'oth'};          // each strand of notices opens against its own kind of absence
  let ysel = 'hol', xsel = 'hols', msel = 0, LAS = null;
  const MSN = ['Overall absence', 'Persistent absence', 'Severe absence'];
  const rank = (a) => { const o = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; };
  const corr = (a, b) => { const ma = d3.mean(a), mb = d3.mean(b); let s = 0, sa = 0, sb = 0; a.forEach((v, i) => { s += (v - ma) * (b[i] - mb); sa += (v - ma) ** 2; sb += (b[i] - mb) ** 2; }); return s / Math.sqrt(sa * sb); };
  const resid = (a, z) => { const mz = d3.mean(z), ma = d3.mean(a); let n = 0, d = 0; z.forEach((v, i) => { n += (v - mz) * (a[i] - ma); d += (v - mz) ** 2; }); const b = n / d; return a.map((v, i) => v - ma - b * (z[i] - mz)); };
  const strength = (r) => { const a = Math.abs(r); return a < 0.15 ? 'no clear pattern' : (a < 0.35 ? 'a weak' : a < 0.6 ? 'a moderate' : 'a strong') + ' tendency'; };
  function england() {
    const L = String(D.latest), xname = XS.find((x) => x[0] === xsel)[1], yrow = YS.find((y) => y[0] === ysel), xcol = xsel === 'cmp' ? 'cm' : xsel;
    const pts = LAS.map((r) => { const rec = D.areas[r.id], g = r.pg && r.pg.A, x = rec && per(rec, L, xcol, 1000), y = ysel === 'hol' || ysel === 'oth' ? (rec && rec[ysel] && rec[ysel][L] != null ? rec[ysel][L] / 100 : null) : (g && g[ysel] && g[ysel][1] && g[ysel][1][msel] != null ? g[ysel][1][msel] / 100 : null);
      return {r, x, y, n: rec ? col(rec, L, 'enrol') : 0}; }).filter((p) => p.x != null && p.y != null && p.n >= 2000);
    all.innerHTML = '';
    add(all, 'p', 'ax-sub', `Each circle is a local authority in ${ay(L)}. Across it runs how many ${xname.toLowerCase()} it had for every 1,000 pupils; up it runs ${yrow[1].toLowerCase()} (${ysel === 'hol' || ysel === 'oth' ? yrow[2] : MSN[msel].toLowerCase() + ', autumn and spring terms'}). ${LAS.length - pts.length} authorities are left out: the two smallest, and any whose count is fewer than 10 or was not supplied.`);
    const ctl = add(all, 'div', 'en-ctl'), seg = (label, opts, cur, set) => { const f = add(ctl, 'div', 'ax-field'), id = 'en-l-' + label.replace(/\W+/g, ''); add(f, 'span', null, label).id = id; const s = add(f, 'div', 'ax-seg'); s.setAttribute('role', 'group'); s.setAttribute('aria-labelledby', id);
      opts.forEach(([v, n]) => { const b = add(s, 'button', null, n); b.type = 'button'; b.setAttribute('aria-pressed', String(v === cur)); b.addEventListener('click', () => { set(v); england(); }); }); };
    seg('Enforcement', XS, xsel, (v) => { if (PAIR[v] && (ysel === 'hol' || ysel === 'oth')) ysel = PAIR[v]; xsel = v; }); seg('Set against', YS.map((y) => [y[0], y[1]]), ysel, (v) => { ysel = v; });
    if (ysel !== 'hol' && ysel !== 'oth') seg('Measure', MSN.map((n, i) => [i, n]), msel, (v) => { msel = v; });
    const el = add(all, 'div', 'ax-chart'), W = width(el), narrow = W < 560, H = narrow ? 340 : 440, m = {l: 46, r: 14, t: 12, b: 42}, s = svg(el, W, H, `${xname} for every 1,000 pupils against ${yrow[1].toLowerCase()}, by local authority`);
    const x = d3.scaleLinear([0, d3.max(pts, (p) => p.x)], [m.l, W - m.r]).nice(), y = d3.scaleLinear(d3.extent(pts, (p) => p.y), [H - m.b, m.t]).nice();
    x.ticks(narrow ? 4 : 8).forEach((t) => { s.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', GRID); s.append('text').attr('x', x(t)).attr('y', H - m.b + 16).attr('text-anchor', 'middle').text(t); });
    y.ticks(5).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID); s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text(t + '%'); });
    s.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text(xname + ' for every 1,000 pupils');
    const rsz = d3.scaleSqrt([0, 260000], [3, narrow ? 9 : 13]), fmtY = (v) => v.toFixed(ysel === 'hol' || ysel === 'oth' || msel === 2 ? 2 : 1) + '%';
    const picked = (p) => { let e = all.querySelector('.ax-picked'); if (!e) e = add(all, 'p', 'ax-picked'); e.innerHTML = `<span><b>${esc(p.r.name)}</b>: ${p.x.toFixed(1)} for every 1,000 pupils; ${fmtY(p.y)}</span> <a class="ax-btn" href="/attendance/group/?k=a&id=${p.r.id}#sec-enforcement">Open</a>`; };
    s.append('g').selectAll('circle').data(pts.slice().sort((a, b) => b.n - a.n)).join('circle').attr('cx', (p) => x(p.x)).attr('cy', (p) => y(p.y)).attr('r', (p) => rsz(p.n)).attr('fill', SLATE).attr('fill-opacity', 0.45).attr('stroke', SLATE)
      .on('pointerenter pointermove', (ev, p) => showTip(ev, `<b>${esc(p.r.name)}</b><br>${xname}: ${p.x.toFixed(1)} for every 1,000 pupils<br>${yrow[1]}: ${fmtY(p.y)}`)).on('pointerleave', hideTip).on('click', (ev, p) => picked(p));
    const key = add(all, 'div', 'ax-key'); add(key, 'span', null, `<i style="background:${SLATE};opacity:.6;border-radius:50%;width:10px;height:10px"></i>A local authority, sized by its pupils`); add(key, 'span', null, 'Tap a circle to name it.');
    // the reading: the rank correlation, and what is left once free school meals eligibility is allowed for
    const ok = pts.filter((p) => { const g = p.r.pg.A; return g.fsm && g.nfsm && g.all && g.fsm[1] && g.all[1]; }), fs = (p) => { const g = p.r.pg.A, a = g.all[1][0], f = g.fsm[1][0], n = g.nfsm[1][0]; return f === n ? 0 : (a - n) / (f - n); };
    const r0 = corr(rank(pts.map((p) => p.x)), rank(pts.map((p) => p.y))); let r1 = null;
    if (ok.length > 100) { const z = rank(ok.map(fs)); r1 = corr(resid(rank(ok.map((p) => p.x)), z), resid(rank(ok.map((p) => p.y)), z)); }
    const dir = (r) => (Math.abs(r) < 0.15 ? '' : r > 0 ? ': authorities with more of one tend to have more of the other' : ': authorities with more of one tend to have less of the other');
    add(all, 'p', 'ax-reading', `Across ${pts.length} local authorities there is <b>${strength(r0)}</b>${dir(r0)} (rank correlation ${r0 >= 0 ? '+' : '−'}${Math.abs(r0).toFixed(2)}).`
      + (r1 == null ? '' : ` Comparing authorities with a similar share of pupils eligible for free school meals, there is ${strength(r1)} (${r1 >= 0 ? '+' : '−'}${Math.abs(r1).toFixed(2)}).`));
    add(all, 'p', 'ax-note', 'Notices for holiday and notices for other unauthorised absence are separate strands and are never added together here. Read each chart as a pattern across areas and no more. A notice follows an absence, so more notices where there is more of that kind of absence is what the rules would produce; it does not show that notices raise or lower absence. The DfE does not publish who receives notices by pupil group, so nothing here shows whether families of pupils eligible for free school meals or with special educational needs are fined more or less often than others. '
      + 'The share eligible for free school meals is worked out from each authority’s published rates. ' + SRC());
    // the flagged authorities: few notices for unauthorised absence other than holiday, with high persistent and severe absence in a pupil group
    { const F = FLAGS || (FLAGS = flags(LAS)), big = LAS.filter((r) => D.areas[r.id] && D.areas[r.id].y[L] && col(D.areas[r.id], L, 'enrol') >= 2000), cnt = (r) => col(D.areas[r.id], L, 'other');
      add(all, 'h3', 'en-h', `Flagged: few notices for unauthorised absence other than holiday, with high persistent and severe absence in a pupil group, ${ay(L)}`);
      add(all, 'p', 'ax-sub', `A local authority is flagged where two things hold together. First, it recorded no penalty notices for unauthorised absence other than holiday, fewer than 10, or so few for its size that it is in the lowest quarter of authorities (${F.lowCut.toFixed(1)} or fewer for every 1,000 pupils): ${F.low} authorities. Second, for at least one pupil group both persistent absence and severe absence were in the highest quarter of authorities in the autumn and spring terms of ${ay(L)}. ${F.list.length} of ${F.n} authorities meet both. The two smallest authorities are left out.`);
      add(add(all, 'div', 'ax-tablewrap'), 'table', 'ax-table en-table en-flagt', '<thead><tr><th>Local authority</th><th class="n">Notices for other unauthorised absence</th><th>Pupil group: persistent absence, severe absence</th></tr></thead><tbody>'
        + F.list.map((f) => `<tr><td><a href="/attendance/group/?k=a&id=${f.r.id}#sec-enforcement">${esc(f.r.name)}</a></td><td class="n">${f.c === 0 ? 'None' : f.c < 0 ? 'fewer than 10' : num(f.c) + ' · ' + f.rate.toFixed(1) + ' for every 1,000'}</td><td>${f.gs.map((g) => `${g.n.replace(/^pupils /, '').replace(/^(.)/, (c) => c.toUpperCase())}: ${g.pa.toFixed(1)}%, ${g.sa.toFixed(2)}%`).join('<br>')}</td></tr>`).join('') + '</tbody>');
      add(all, 'p', 'ax-note', 'The flag sets two published facts side by side for one authority. It does not show that one causes the other, and an authority that issues few notices may rely on attendance case management or early help instead. The highest quarter starts at '
        + FG.map(([g, n]) => `${(F.cut[g][0] / 100).toFixed(1)}% persistent and ${(F.cut[g][1] / 100).toFixed(2)}% severe absence for ${n}`).join('; ') + '. Severe absence is missing where the DfE’s figure rests on fewer than 10 pupils, and such a group cannot be flagged.');
      const names = (list) => list.slice().sort((a, b) => a.name.localeCompare(b.name)).map((r) => `<a href="/attendance/group/?k=a&id=${r.id}#sec-enforcement">${esc(r.name)}</a>`).join(', ');
      add(all, 'p', 'ax-note en-names', `<b>Recorded no notices for unauthorised absence other than holiday:</b> ${names(big.filter((r) => cnt(r) === 0)) || 'no authority'}.<br><b>Recorded fewer than 10:</b> ${names(big.filter((r) => cnt(r) != null && cnt(r) < 0)) || 'no authority'}.`); }
    // the map: notices for every 1,000 pupils
    add(all, 'h3', 'en-h', `${xname} for every 1,000 pupils, ${ay(L)}`);
    const mp = add(all, 'div', 'ax-chart'), H2 = LAS.filter((r) => r.q != null).map((r) => ({r, v: D.areas[r.id] ? per(D.areas[r.id], L, xcol, 1000) : null})), cap = 480, MW = Math.min(cap, width(mp));
    const qs = d3.extent(H2, (d) => d.r.q + (d.r.r & 1) / 2), rs = d3.extent(H2, (d) => d.r.r), size = (MW - 4) / ((qs[1] - qs[0] + 1) * Math.sqrt(3)), MH = Math.ceil((rs[1] - rs[0]) * 1.5 * size + 2 * size + 4);
    const dpath = 'M' + d3.range(6).map((i) => { const t = Math.PI / 180 * (60 * i - 30); return (Math.cos(t) * (size - 0.6)).toFixed(2) + ',' + (Math.sin(t) * (size - 0.6)).toFixed(2); }).join('L') + 'Z';
    const vmax = d3.quantile(H2.map((d) => d.v).filter((v) => v != null).sort(d3.ascending), 0.97) || 1, shade = (v) => (v == null ? '#fff' : d3.interpolateRgb('#EEF0F4', INK)(Math.min(1, v / vmax)));
    const ms = svg(mp, MW, MH, `Map of local authorities shaded by ${xname.toLowerCase()} for every 1,000 pupils`); ms.style('max-width', cap + 'px').style('margin', '0 auto');
    ms.append('g').selectAll('path').data(H2).join('path').attr('d', dpath).attr('transform', (d) => `translate(${(d.r.q + (d.r.r & 1) / 2 - qs[0] + 0.5) * Math.sqrt(3) * size + 2},${(rs[1] - d.r.r) * 1.5 * size + size + 2})`).attr('fill', (d) => shade(d.v)).attr('stroke', d3.rgb(SOFT)).attr('stroke-width', 0.5)
      .on('pointerenter pointermove', (ev, d) => showTip(ev, `<b>${esc(d.r.name)}</b><br>${d.v == null ? 'No figure' : d.v.toFixed(1) + ' for every 1,000 pupils'}`)).on('pointerleave', hideTip)
      .on('click', (ev, d) => { let e = mp.querySelector('.ax-picked'); if (!e) e = add(mp, 'p', 'ax-picked'); e.innerHTML = `<span><b>${esc(d.r.name)}</b>: ${d.v == null ? 'no figure' : d.v.toFixed(1) + ' for every 1,000 pupils'}</span> <a class="ax-btn" href="/attendance/group/?k=a&id=${d.r.id}#sec-enforcement">Open</a>`; });
    const mk = add(mp, 'div', 'ax-key'); add(mk, 'span', null, `0 <i style="background:linear-gradient(90deg,#EEF0F4,${INK});width:90px;border:1px solid ${SOFT}"></i>${vmax.toFixed(0)} or more for every 1,000 pupils`); add(mk, 'span', null, 'One hexagon for each local authority, placed roughly where it sits.');
    // how many authorities use each measure at all: none is a finding, and is not the same as a few
    const MS = [['hols', 'Notices for unauthorised holiday'], ['other', 'Notices for other unauthorised absence'], ['late', 'Notices for lateness'], ['repeat', 'Second notices within three years'], ['pros', 'Prosecutions for non-payment'], ['pros_limit', 'Prosecutions at the two-notice limit'],
      ['cm', 'Attendance case management'], ['cm_pros', 'Prosecutions after case management'], ['contracts', 'Parenting contracts offered'], ['orders', 'Parenting orders granted'], ['eso', 'Education supervision orders']];
    const SEG = [['none', 'None', '#fff'], ['few', 'Fewer than 10', '#C5CCD8'], ['more', '10 or more', '#33405A'], ['na', 'No figure supplied', '#F1EEE6']];
    add(all, 'h3', 'en-h', `How many local authorities used each measure, ${ay(L)}`);
    add(all, 'p', 'ax-sub', 'For several measures the commonest answer is none. A recorded zero is shown as none; a count of 1 to 9 is shown as fewer than 10 and not given exactly.');
    const ue = add(all, 'div', 'ax-chart'), UW = width(ue), un = UW < 560, ul = un ? 0 : 270, urh = un ? 48 : 30, UH = MS.length * urh + 4, us = svg(ue, UW, UH, 'Local authorities recording none, fewer than 10, or 10 or more of each measure');
    MS.forEach(([c, n], k) => { const sp = spread(c, L), y0 = k * urh + (un ? 20 : 3), ux = d3.scaleLinear([0, sp.n], [ul, UW - 2]); let acc = 0;
      us.append('text').attr('x', un ? 0 : ul - 10).attr('y', un ? y0 - 6 : y0 + 16).attr('text-anchor', un ? 'start' : 'end').text(n);
      SEG.forEach(([key, label, fill]) => { const v = sp[key]; if (!v) return; us.append('rect').attr('x', ux(acc)).attr('y', y0).attr('width', ux(acc + v) - ux(acc)).attr('height', 22).attr('fill', fill).attr('stroke', SLATE).attr('stroke-width', 0.75)
          .on('pointerenter pointermove', (ev) => showTip(ev, `<b>${n}</b><br>${label}: ${v} of ${sp.n} local authorities`)).on('pointerleave', hideTip);
        if (ux(acc + v) - ux(acc) > 26) us.append('text').attr('x', (ux(acc) + ux(acc + v)) / 2).attr('y', y0 + 15).attr('text-anchor', 'middle').attr('pointer-events', 'none').style('fill', key === 'more' ? '#fff' : INK).text(v);
        acc += v; }); });
    const uk = add(all, 'div', 'ax-key'); SEG.forEach(([, label, fill]) => add(uk, 'span', null, `<i style="background:${fill};border:1px solid ${SLATE}"></i>${label}`));
    // highest and lowest
    const ord = H2.filter((d) => d.v != null && col(D.areas[d.r.id], L, 'enrol') >= 2000).sort((a, b) => b.v - a.v), row = (d) => `<tr><td><a href="/attendance/group/?k=a&id=${d.r.id}#sec-enforcement">${esc(d.r.name)}</a></td><td class="n">${d.v.toFixed(1)}</td><td class="n">${num(col(D.areas[d.r.id], L, xcol))}</td></tr>`;
    const wrap = add(all, 'div', 'en-pair'), tbl = (title, list) => { const b = add(wrap, 'div', 'en-mini'); add(b, 'h3', null, title); add(add(b, 'div', 'ax-tablewrap'), 'table', 'ax-table en-table', `<thead><tr><th>Local authority</th><th class="n">For every 1,000 pupils</th><th class="n">Number</th></tr></thead><tbody>${list.map(row).join('')}</tbody>`); };
    tbl('Most for their size', ord.slice(0, 8)); tbl('Fewest for their size', ord.slice(-8).reverse());
  }

  d3.json('/attendance/data/prm.json').then((j) => { D = j; j.cols.forEach((c, i) => { C[c] = i; });
    if (area) { let last = ''; const go = () => { const sig = location.search + '|' + (($('gx-name') || {}).textContent || ''); if (sig === last) return; last = sig; place(); };
      d3.json('/attendance/data/grp/a_all.json').then((rows) => { FLAGS = flags(rows); last = ''; go(); }).catch(() => {});
      const nm = $('gx-name'); if (nm) new MutationObserver(go).observe(nm, {childList: true, characterData: true, subtree: true}); addEventListener('popstate', () => setTimeout(go, 50)); go();
      let t = null; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { last = ''; go(); }, 200); }); }
    if (all) d3.json('/attendance/data/grp/a_all.json').then((rows) => { LAS = rows; england(); let t = null, w = innerWidth; addEventListener('resize', () => { if (innerWidth === w) return; w = innerWidth; clearTimeout(t); t = setTimeout(england, 200); }); });
  }).catch(() => { const c = $('gx-enf-c') || $('px-enf-c'); if (c) c.hidden = true; });
})();
