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

  // ---------------------------------------------------------------- which fifth
  // Where a local authority sits for one enforcement category. None and fewer than 10 are their own categories. Authorities
  // with an exact figure above zero are put in five equal groups by how much they used the measure for their size. Where
  // fewer than 25 authorities used a measure, fifths would mean little and none are given. The two smallest authorities
  // (under 2,000 pupils) are left off the scale.
  const CATS = [['hols', 'Penalty notices: holiday in term time not agreed by the school'], ['other', 'Penalty notices: other unauthorised absence'], ['late', 'Penalty notices: lateness'],
    ['repeat', 'Second penalty notices within three years'], ['pros', 'Prosecutions for not paying a penalty notice'], ['pros_limit', 'Prosecutions at the two-notice limit'],
    ['cm', 'Cases entering attendance case management'], ['cm_pros', 'Prosecutions after case management'], ['cm_improved', 'Cases withdrawn because attendance improved'],
    ['contracts', 'Parenting contracts offered'], ['orders', 'Parenting orders granted'], ['eso', 'Education supervision orders']];
  const FIFTH = ['Lowest fifth', 'Second fifth', 'Middle fifth', 'Fourth fifth', 'Highest fifth'], BANDS = ['None', 'Fewer than 10'].concat(FIFTH);
  const scales = {};
  const scale = (c, y) => { const k = c + y; if (!scales[k]) { const las = Object.keys(D.areas).filter((id) => isLA(id) && D.areas[id].y[y] && col(D.areas[id], y, 'enrol') >= 2000);
      const nz = las.map((id) => per(D.areas[id], y, c, 1000)).filter((v) => v != null && v > 0).sort(d3.ascending); scales[k] = {nz, cuts: [0.2, 0.4, 0.6, 0.8].map((q) => d3.quantile(nz, q))}; } return scales[k]; };
  // band index: 0 none, 1 fewer than 10, 2 to 6 the fifths; null where there is no figure; -1 where too few authorities use the measure for fifths
  const band = (rec, c, y) => { const v = col(rec, y, c); if (v == null) return null; if (v === 0) return 0; if (v < 0) return 1; const sc = scale(c, y); if (sc.nz.length < 25) return -1; const r = per(rec, y, c, 1000); return 2 + sc.cuts.filter((q) => r > q).length; };
  const r1k = (v) => (v == null ? '–' : v > 0 && v < 0.005 ? 'under 0.01' : v >= 10 ? v.toFixed(1) : v.toFixed(2));
  const strip = (b, counts) => '<span class="en-q" aria-hidden="true">' + BANDS.map((n, i) => `<i class="${i < 2 ? 'z' : ''}${b === i ? ' on' : ''}" title="${n}">${counts ? (counts[i] || '') : ''}</i>`).join('') + '</span>';
  const bandWords = (b, c, y) => (b == null ? 'No figure' : b === -1 ? `Used by ${scale(c, y).nz.length} authorities` : BANDS[b]);

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
    // the heading says where the two kinds of notice stand against England, for the authority's size
    { const h2 = card.querySelector('h2'), label = 'Penalty notices and other legal measures'; let k = h2.previousElementSibling; if (!k || !k.classList.contains('ax-kick')) { k = document.createElement('p'); k.className = 'ax-kick'; h2.before(k); }
      const w = (c) => { const v = col(rec, L, c), r = per(rec, L, c, 1000), e = per(E, L, c, 1000); return v == null ? null : v === 0 ? 'none' : v < 0 ? 'fewer than 10' : r > e * 1.1 ? 'more' : r < e * 0.9 ? 'fewer' : 'about as many'; }, a = w('hols'), b = w('other');
      const on = a && b, cap1 = (t) => t.replace(/^./, (c) => c.toUpperCase()), vs = (x) => (x === 'none' || x === 'fewer than 10' ? '' : x === 'about as many' ? ' as across England for its size' : ' than across England for its size');
      const lead = (x) => (x === 'none' ? 'No' : cap1(x));
      k.hidden = !on; k.textContent = label; h2.textContent = !on ? label : a === 'none' && b === 'none' ? 'No penalty notices for term-time holiday or for other unauthorised absence'
        : `${lead(a)} penalty notices for term-time holiday${vs(a)}, and ${b} for other unauthorised absence${a === b || vs(a) ? '' : vs(b)}`; }
    add(area, 'p', 'ax-sub ax-keep', `Penalty notices to parents in ${ay(L)}, kept in two separate strands because they answer different things: notices for a holiday taken in term time without the school’s agreement, and notices for other unauthorised absence from school. ${kind === 'y' ? 'The county’s figures are those of its local authorities added together. ' : ''}These are counts of notices, not of pupils, and the DfE does not publish them by pupil group or for single schools.`);
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
    // every category at once: the number, the rate, the fifth of local authorities it falls in, and its region beside it
    const R = kind === 'a' && rec.reg ? D.areas[rec.reg] : null, rname = R ? D.names[rec.reg] : '';
    add(area, 'h3', 'en-h', kind === 'a' ? `Where ${esc(name)} sits among local authorities, ${ay(L)}` : `Every measure, ${ay(L)}`);
    add(area, 'p', 'ax-sub ax-keep', kind === 'a' ? `For each kind of enforcement the strip shows seven categories: none, fewer than 10, then five equal groups of the local authorities that used it, from the fewest for their size to the most. The filled box is ${esc(name)}. ${R ? `The region’s own rate is beside it, placed on the same scale.` : ''}`
      : 'Counts for the county’s local authorities added together, with the rate for every 1,000 pupils against England.');
    const wrap = add(area, 'div', 'ax-tablewrap'), rate = (r, c) => { const v = col(r, L, c); return v == null ? '–' : v === 0 ? '–' : v < 0 ? 'under ' + r1k(10000 / col(r, L, 'enrol')) : r1k(per(r, L, c, 1000)); };
    add(wrap, 'table', 'ax-table en-table en-other', `<thead><tr><th>Measure</th><th class="n">Number</th><th class="n">For every 1,000 pupils</th>${kind === 'a' ? '<th class="en-qh">Category among local authorities</th>' + (R ? `<th class="en-qh">${esc(rname)}</th>` : '') : ''}<th class="n">England, for every 1,000</th></tr></thead><tbody>`
      + CATS.map(([c, n]) => { const b = band(rec, c, L), rb = R ? band(R, c, L) : null;
        return `<tr><td>${n}</td><td class="n">${num(col(rec, L, c))}</td><td class="n">${rate(rec, c)}</td>`
          + (kind === 'a' ? `<td class="en-qc">${b === -1 || b == null ? '' : strip(b)}<span class="en-ql">${bandWords(b, c, L)}</span>${R ? `<span class="en-qr">${esc(rname)}: ${rb === 0 || rb === 1 ? BANDS[rb].toLowerCase() : rate(R, c) + (rb != null && rb >= 2 ? ', ' + BANDS[rb].toLowerCase() : '')}</span>` : ''}</td>` + (R ? `<td class="en-qc en-qreg">${rb === -1 || rb == null ? '' : strip(rb)}<span class="en-ql">${rb === 0 || rb === 1 ? BANDS[rb] : rate(R, c) + (rb != null && rb >= 2 ? ' · ' + BANDS[rb].toLowerCase() : '')}</span></td>` : '') : '')
          + `<td class="n">${rate(E, c)}</td></tr>`; }).join('') + '</tbody>');
    if (kind === 'a') add(area, 'p', 'ax-note', 'The five groups are fifths of the local authorities with an exact figure above zero for that measure, so “lowest fifth” means the fewest among those that used it at all. Where fewer than 25 authorities used a measure no fifths are given. A category describes how much a measure was used and is not a judgement of the authority.');
    add(area, 'p', 'ax-note', '“None” is a recorded zero, which is different from “fewer than 10” (a count of 1 to 9, not given exactly) and from a dash in the Number column (the local authority did not supply the figure). More enforcement is not in itself better or worse: the numbers reflect how much unauthorised absence there is, and also how each authority and its schools choose to respond to it. ' + SRC()
      + ' <a href="/attendance/patterns/#sec-enforcement">The same breakdown by region</a>.');
  }

  // ---------------------------------------------------------------- by region (Patterns)
  let csel = 'hols';
  function england() {
    const L = String(D.latest), E = D.areas.E92000001, regs = Object.keys(D.areas).filter((c) => /^E12/.test(c) && D.areas[c].y[L]).sort((a, b) => D.names[a].localeCompare(D.names[b])), cname = CATS.find((c) => c[0] === csel)[1], sc = scale(csel, L);
    all.innerHTML = '';
    add(all, 'p', 'ax-sub ax-keep', `How much each kind of enforcement was used in ${ay(L)}, region by region. Local authorities fall into seven categories for each measure: none, fewer than 10, then five equal groups of the authorities that used it, from the fewest for their size to the most. Each region’s row shows where the region as a whole would sit and how many of its local authorities are in each category.`);
    const f = add(add(all, 'div', 'en-ctl'), 'label', 'ax-field'); add(f, 'span', null, 'Measure'); const sel = add(f, 'select', 'ax-select'); CATS.forEach(([c, n]) => { const o = add(sel, 'option', null, n); o.value = c; o.selected = c === csel; });
    sel.addEventListener('change', () => { const y0 = scrollY; csel = sel.value; england(); scrollTo(0, y0); });
    const inReg = (reg) => Object.keys(D.areas).filter((id) => isLA(id) && D.areas[id].reg === reg && D.areas[id].y[L] && col(D.areas[id], L, 'enrol') >= 2000);
    const row = (code, label) => { const r = D.areas[code], v = col(r, L, csel), b = band(r, csel, L), ids = code === 'E92000001' ? Object.keys(D.areas).filter((id) => isLA(id) && D.areas[id].y[L] && col(D.areas[id], L, 'enrol') >= 2000) : inReg(code), counts = BANDS.map(() => 0); let other = 0;
      ids.forEach((id) => { const x = band(D.areas[id], csel, L); if (x == null) other++; else if (x === -1) counts[2]++; else counts[x]++; });
      const few = sc.nz.length < 25, cells = few ? `<td class="en-qc"><span class="en-ql">None ${counts[0]} · fewer than 10 ${counts[1]} · 10 or more ${counts[2]}${other ? ' · no figure ' + other : ''}</span></td>` : `<td class="en-qc">${strip(code === 'E92000001' ? null : b, counts)}<span class="en-ql">${code === 'E92000001' ? '' : bandWords(b, csel, L)}${other ? (code === 'E92000001' ? '' : ' · ') + other + ' with no figure' : ''}</span></td>`;
      return `<tr${code === 'E92000001' ? ' class="en-eng"' : ''}><td>${esc(label)}</td><td class="n">${num(v)}</td><td class="n">${v == null || v <= 0 ? '–' : r1k(per(r, L, csel, 1000))}</td>${cells}<td class="n">${ids.length}</td></tr>`; };
    add(add(all, 'div', 'ax-tablewrap'), 'table', 'ax-table en-table en-reg', `<thead><tr><th>Region</th><th class="n">Number</th><th class="n">For every 1,000 pupils</th><th class="en-qh">${sc.nz.length < 25 ? 'Its local authorities' : 'Category, and its local authorities in each'}</th><th class="n">Local authorities</th></tr></thead><tbody>`
      + regs.map((c) => row(c, D.names[c])).join('') + row('E92000001', 'England') + '</tbody>');
    const k = add(all, 'div', 'ax-key'); if (sc.nz.length >= 25) { add(k, 'span', null, strip(null, ['None', '<10', '1', '2', '3', '4', '5']).replace('class="en-q"', 'class="en-q en-qk"') + ' None, fewer than 10, then the lowest to the highest fifth'); add(k, 'span', null, `<span class="en-q"><i class="on"></i></span> where the region as a whole sits; the numbers count its local authorities`); }
    add(all, 'p', 'ax-note', (sc.nz.length < 25 ? `Only ${sc.nz.length} local authorities have an exact figure above zero for this measure, too few for fifths to mean much, so the table counts how many used it. ` : `For ${cname.toLowerCase()} the fifths divide the ${sc.nz.length} local authorities with an exact figure above zero at ${sc.cuts.map(r1k).join(', ')} for every 1,000 pupils. `)
      + 'A category describes how much a measure was used and is not a judgement of the region or its authorities. The two smallest authorities are left off the scale. ' + SRC());
    // how many authorities use each measure at all: none is a finding, and is not the same as a few
    const MS = [['hols', 'Notices for unauthorised holiday'], ['other', 'Notices for other unauthorised absence'], ['late', 'Notices for lateness'], ['repeat', 'Second notices within three years'], ['pros', 'Prosecutions for non-payment'], ['pros_limit', 'Prosecutions at the two-notice limit'],
      ['cm', 'Attendance case management'], ['cm_pros', 'Prosecutions after case management'], ['contracts', 'Parenting contracts offered'], ['orders', 'Parenting orders granted'], ['eso', 'Education supervision orders']];
    const SEG = [['none', 'None', '#fff'], ['few', 'Fewer than 10', '#C5CCD8'], ['more', '10 or more', '#33405A'], ['na', 'No figure supplied', '#F1EEE6']];
    add(all, 'h3', 'en-h', `How many local authorities used each measure, ${ay(L)}`);
    add(all, 'p', 'ax-sub', 'For several measures the commonest answer is none. A recorded zero is shown as none; a count of 1 to 9 is shown as fewer than 10 and not given exactly.');
    const ue = add(all, 'div', 'ax-chart'), UW = width(ue), un = UW < 560, ul = un ? 0 : 270, urh = un ? 48 : 30, UH = MS.length * urh + 4, us = svg(ue, UW, UH, 'Local authorities recording none, fewer than 10, or 10 or more of each measure');
    MS.forEach(([c, n], i) => { const sp = spread(c, L), y0 = i * urh + (un ? 20 : 3), ux = d3.scaleLinear([0, sp.n], [ul, UW - 2]); let acc = 0;
      us.append('text').attr('x', un ? 0 : ul - 10).attr('y', un ? y0 - 6 : y0 + 16).attr('text-anchor', un ? 'start' : 'end').text(n);
      SEG.forEach(([key, label, fill]) => { const v = sp[key]; if (!v) return; us.append('rect').attr('x', ux(acc)).attr('y', y0).attr('width', ux(acc + v) - ux(acc)).attr('height', 22).attr('fill', fill).attr('stroke', SLATE).attr('stroke-width', 0.75)
          .on('pointerenter pointermove', (ev) => showTip(ev, `<b>${n}</b><br>${label}: ${v} of ${sp.n} local authorities`)).on('pointerleave', hideTip);
        if (ux(acc + v) - ux(acc) > 26) us.append('text').attr('x', (ux(acc) + ux(acc + v)) / 2).attr('y', y0 + 15).attr('text-anchor', 'middle').attr('pointer-events', 'none').style('fill', key === 'more' ? '#fff' : INK).text(v);
        acc += v; }); });
    const uk = add(all, 'div', 'ax-key'); SEG.forEach(([, label, fill]) => add(uk, 'span', null, `<i style="background:${fill};border:1px solid ${SLATE}"></i>${label}`));
  }

  d3.json('/attendance/data/prm.json').then((j) => { D = j; j.cols.forEach((c, i) => { C[c] = i; });
    if (area) { let last = ''; const go = () => { const sig = location.search + '|' + (($('gx-name') || {}).textContent || ''); if (sig === last) return; last = sig; place(); };
      const nm = $('gx-name'); if (nm) new MutationObserver(go).observe(nm, {childList: true, characterData: true, subtree: true}); addEventListener('popstate', () => setTimeout(go, 50)); go();
      let t = null; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { last = ''; go(); }, 200); }); addEventListener('ax-redraw', () => { last = ''; go(); }); }
    if (all) { england(); addEventListener('ax-redraw', england); let t = null, w = innerWidth; addEventListener('resize', () => { if (innerWidth === w) return; w = innerWidth; clearTimeout(t); t = setTimeout(england, 200); }); }
  }).catch(() => { const c = $('gx-enf-c') || $('px-enf-c'); if (c) c.hidden = true; });
})();
