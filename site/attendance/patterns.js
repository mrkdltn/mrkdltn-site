/* Attendance Explorer: patterns across all schools.
   Data: patterns.json (free school meal groups, yearly counts of schools by band of absence, regions, the match weights), dist_<phase>.json (every school),
   bench.json (periods and sources). Pooled values are [overall, unauthorised, persistent]; rates in hundredths of a point. */
(function () {
  const INK = '#0B1A2E', MUTED = '#55627A', VERD = '#2F6F66', GRID = '#EEF1F5', SOFT = '#C9D0DB';
  // five groups in order, one navy ramp: these are categories, not readings, so they take no green or rust
  const SHADES = ['#B4BDCB', '#8C99AE', '#62728C', '#3D4C68', '#0B1A2E'];
  const PH = {P: 'primary schools', S: 'secondary schools', X: 'special schools'}, MI = {abs: 0, pa: 2}, MN = {abs: 'overall absence', pa: 'persistent absence'};
  const XN = {fsm: 'eligible for free school meals', sen: 'with SEN support', ehcp: 'with an education, health and care plan', eal: 'with a first language other than English'};
  const XF = {fsm: 'fsm_pct', sen: 'sen_pct', ehcp: 'ehcp_pct', eal: 'eal_pct'};
  const $ = (id) => document.getElementById(id);
  const pc = (v, dp) => (v == null ? '–' : (v / 100).toFixed(dp == null ? 1 : dp) + '%');
  const gap = (a, b) => Math.round(a / 10) - Math.round(b / 10), pts = (t) => (Math.abs(t) / 10).toFixed(1);
  const ay = (p) => { const y = +p.slice(0, 4); return y + '/' + String((y + 1) % 100).padStart(2, '0'); };
  const date = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'});
  const width = (el) => Math.max(280, Math.floor(el.getBoundingClientRect().width));
  const svg = (el, w, h, label) => d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', label);
  const key = (el, items) => { const k = document.createElement('div'); k.className = 'ax-key'; items.forEach((t) => { const s = document.createElement('span'); s.innerHTML = t; k.appendChild(s); }); el.appendChild(k); };
  const tip = $('ax-tip');
  const showTip = (ev, html) => { tip.innerHTML = html; tip.hidden = false; const r = tip.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(ev.clientX + 12, innerWidth - r.width - 8)) + 'px'; tip.style.top = (ev.clientY + 16 + r.height > innerHeight ? Math.max(8, ev.clientY - r.height - 12) : ev.clientY + 16) + 'px'; };
  const hideTip = () => { tip.hidden = true; };
  const tipOn = (sel, html) => sel.on('pointerenter pointermove', (ev, d) => showTip(ev, html(d))).on('pointerleave', hideTip).on('click', (ev, d) => { ev.stopPropagation(); showTip(ev, html(d)); });
  document.addEventListener('click', hideTip); addEventListener('scroll', hideTip, {passive: true});

  let B, P, phase = 'S', meas = 'abs', xf = 'fsm'; const dists = new Map();
  const getDist = (ph) => { if (!dists.has(ph)) dists.set(ph, d3.json('/attendance/data/dist_' + ph + '.json')); return dists.get(ph); };
  const years = () => d3.range(+P.fy[0], +P.fy[P.fy.length - 1] + 1).map(String);
  const axes = (s, x, y, W, H, m, yrs) => {
    y.ticks(5).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID); s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
    const gx = x('2019'); s.append('rect').attr('x', gx - x.step() * 0.38).attr('width', x.step() * 0.76).attr('y', m.t).attr('height', H - m.b - m.t).attr('fill', '#F4F5F8');
    yrs.forEach((p, i) => { if (W >= 640 || i % 2 === 0) s.append('text').attr('x', x(p)).attr('y', H - 8).attr('text-anchor', 'middle').text(W < 640 ? "'" + ay(p).slice(2) : ay(p)); }); };

  function gradient() {
    const card = $('px-grad-c'), el = $('px-grad'), g = P.gradient[phase]; card.hidden = !g; if (!g) return; el.innerHTML = '';
    const yrs = years(), i = MI[meas], W = width(el), H = Math.round(Math.min(400, Math.max(250, W * 0.46))), m = {t: 14, r: W < 560 ? 16 : 150, b: 30, l: 42}, s = svg(el, W, H, MN[meas] + ' by free school meal group');
    const val = (q, p) => { const k = P.fy.indexOf(p), v = k < 0 ? null : g.rate[q][k]; return v ? v[i] : null; };
    const x = d3.scalePoint(yrs, [m.l + 8, W - m.r - 8]), y = d3.scaleLinear([0, d3.max(g.rate.flat().filter(Boolean), (v) => v[i]) * 1.06], [H - m.b, m.t]).nice(5);
    axes(s, x, y, W, H, m, yrs);
    const line = d3.line().defined((d) => d.v != null).x((d) => x(d.p)).y((d) => y(d.v)), name = (q) => (q === 0 ? 'Fewest eligible' : q === 4 ? 'Most eligible' : ['', 'Second', 'Middle', 'Fourth'][q] + ' fifth');
    g.rate.forEach((r, q) => { const d = yrs.map((p) => ({p, v: val(q, p)}));
      s.append('path').attr('d', line(d)).attr('fill', 'none').attr('stroke', SHADES[q]).attr('stroke-width', q === 0 || q === 4 ? 3 : 2).attr('stroke-linejoin', 'round');
      tipOn(s.append('g').selectAll('circle').data(d.filter((k) => k.v != null)).join('circle').attr('cx', (k) => x(k.p)).attr('cy', (k) => y(k.v)).attr('r', 8).attr('fill', 'transparent'), (k) => `<b>${name(q)}</b> (${g.cut[q][0]}% to ${g.cut[q][1]}% eligible)<br>${ay(k.p)}: ${MN[meas]} ${pc(k.v)}`);
      const last = d.filter((k) => k.v != null).pop(); if (W >= 560 && last) s.append('text').attr('x', x(last.p) + 12).attr('y', y(last.v) + 4).attr('class', q === 0 || q === 4 ? 'strong' : null).text(name(q) + ' ' + pc(last.v)); });
    key(el, g.cut.map((c, q) => `<i class="ln" style="border-color:${SHADES[q]}"></i>${name(q)}: ${c[0]}% to ${c[1]}%`));
    const a = '2018', b = P.fy[P.fy.length - 1], g0 = gap(val(4, a), val(0, a)), g1 = gap(val(4, b), val(0, b));
    $('px-grad-h').textContent = g1 > g0 ? 'The gap by free school meals has widened' : 'The gap by free school meals';
    $('px-grad-r').innerHTML = `In ${ay(b)}, ${MN[meas]} in the fifth of ${PH[phase]} with the most pupils eligible for free school meals was <b>${pc(val(4, b))}</b>, against <b>${pc(val(0, b))}</b> in the fifth with the fewest: a gap of <b>${pts(g1)}</b> points. In ${ay(a)} the gap was ${pts(g0)} points.`;
  }

  function scatter(D) {
    const card = $('px-scat-c'), el = $('px-scat'); card.hidden = phase === 'X' && xf !== 'fsm' && xf !== 'eal' ? false : false; el.innerHTML = '';
    const ys = D[meas], xs = D[xf], idx = d3.range(ys.length).filter((i) => ys[i] != null && xs[i] != null);
    const W = width(el), H = Math.round(Math.min(460, Math.max(280, W * 0.56))), m = {t: 12, r: 14, b: 40, l: 44};
    const xd = [0, d3.quantile(idx.map((i) => xs[i]).sort(d3.ascending), 0.995)], yd = [0, d3.quantile(idx.map((i) => ys[i]).sort(d3.ascending), 0.995)];
    const x = d3.scaleLinear(xd, [m.l, W - m.r]).clamp(true), y = d3.scaleLinear(yd, [H - m.b, m.t]).clamp(true);
    const dpr = Math.min(2, devicePixelRatio || 1), cv = el.appendChild(document.createElement('canvas')); cv.width = W * dpr; cv.height = H * dpr; cv.style.aspectRatio = W + ' / ' + H;
    const c = cv.getContext('2d'); c.scale(dpr, dpr); c.fillStyle = 'rgba(85,98,122,' + (idx.length > 8000 ? 0.16 : 0.3) + ')';
    idx.forEach((i) => { c.beginPath(); c.arc(x(xs[i]), y(ys[i]), idx.length > 8000 ? 1.6 : 2.2, 0, 6.3); c.fill(); });
    const s = svg(el, W, H, MN[meas] + ' against share of pupils ' + XN[xf]);
    y.ticks(5).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID).attr('stroke-opacity', 0.7); s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
    x.ticks(W < 480 ? 5 : 8).forEach((t) => s.append('text').attr('x', x(t)).attr('y', H - m.b + 16).attr('text-anchor', 'middle').text(t + '%'));
    s.append('text').attr('x', (m.l + W - m.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Pupils ' + XN[xf]);
    const sorted = idx.slice().sort((a, b) => xs[a] - xs[b]), bins = d3.range(20).map((k) => sorted.slice(Math.floor(k * sorted.length / 20), Math.floor((k + 1) * sorted.length / 20))).map((b) => ({x: d3.median(b, (i) => xs[i]), v: d3.median(b, (i) => ys[i])}));
    const line = d3.line().x((d) => x(d.x)).y((d) => y(d.v));
    s.append('path').attr('d', line(bins)).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 5); s.append('path').attr('d', line(bins)).attr('fill', 'none').attr('stroke', INK).attr('stroke-width', 2.5);
    const M = P.model && P.model.phases[phase], items = [`<i style="background:${SOFT};border-radius:50%;width:8px;height:8px"></i>${idx.length.toLocaleString('en-GB')} ${PH[phase]}`, `<i class="ln" style="border-color:${INK}"></i>Middle school of each twentieth`];
    key(el, items);
    $('px-scat-r').innerHTML = `In the twentieth of ${PH[phase]} with the fewest pupils ${XN[xf]}, the middle school had ${MN[meas]} of <b>${pc(bins[0].v)}</b>; in the twentieth with the most, <b>${pc(bins[19].v)}</b>.`;
  }

  /* A percentile from counts of schools in equal bands of absence, by interpolation within the band it falls in.
     The top band is open-ended, so a percentile that lands there is given as that band's lower edge. */
  const quant = (Y, step, f) => { const t = f * Y.n, last = Y.bins.length - 1; let c = 0;
    for (let k = 0; k <= last; k++) { const v = Y.bins[k]; if (v && c + v >= t) return k === last ? k * step : (k + (t - c) / v) * step; c += v; } return null; };
  /* place labels at their values, then push apart any closer than 13px */
  const spreadOut = (ys, lo, hi) => { const o = ys.map((v, k) => ({v, k})).sort((p, q) => p.v - q.v); for (let j = 1; j < o.length; j++) o[j].v = Math.max(o[j].v, o[j - 1].v + 13);
    const over = o.length ? o[o.length - 1].v - hi : 0; if (over > 0) o.forEach((d) => { d.v -= over; }); for (let j = o.length - 2; j >= 0; j--) o[j].v = Math.min(o[j].v, o[j + 1].v - 13);
    const out = []; o.forEach((d) => { out[d.k] = Math.max(lo, d.v); }); return out; };

  function spread() {
    const el = $('px-ridge'), R = P.ridges[phase]; el.innerHTML = '';
    const yrs = years(), last = P.fy[P.fy.length - 1], base = R.years['2018'] ? '2018' : P.fy[0], Q = {};
    P.fy.forEach((p) => { const Y = R.years[p]; if (Y && Y.n) Q[p] = {n: Y.n, q: [0.1, 0.25, 0.5, 0.75, 0.9].map((f, k) => (k === 2 && Y.median != null ? Y.median : quant(Y, R.step, f)))}; });
    const W = width(el), narrow = W < 560, H = Math.round(Math.min(420, Math.max(300, W * 0.42))), m = {t: 14, r: narrow ? 44 : 176, b: 30, l: 42};
    const s = svg(el, W, H, 'How ' + PH[phase] + ' were spread by overall absence in each full school year');
    const x = d3.scalePoint(yrs, [m.l + 8, W - m.r - 8]), y = d3.scaleLinear([0, d3.max(P.fy, (p) => (Q[p] ? Q[p].q[4] : 0)) * 1.05], [H - m.b, m.t]).nice(5), st = x.step();
    y.ticks(5).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID); s.append('text').attr('x', m.l - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
    yrs.filter((p) => !Q[p]).forEach((p) => { s.append('rect').attr('x', x(p) - st * 0.38).attr('width', st * 0.76).attr('y', m.t).attr('height', H - m.b - m.t).attr('fill', '#F4F5F8');
      if (st >= 70) s.append('text').attr('x', x(p)).attr('y', m.t + 15).attr('text-anchor', 'middle').text('No figures'); });
    yrs.forEach((p) => { const k = +last - +p; if (st >= 56 || k % (st < 30 ? 3 : 2) === 0) s.append('text').attr('x', x(p)).attr('y', H - 8).attr('text-anchor', 'middle').attr('class', p === base || p === last ? 'strong' : null).text(st < 44 ? "'" + ay(p).slice(2) : ay(p)); });
    const d = yrs.map((p) => (Q[p] ? {p, q: Q[p].q, n: Q[p].n} : null)), band = (a, b) => d3.area().defined((k) => k != null).x((k) => x(k.p)).y0((k) => y(k.q[a])).y1((k) => y(k.q[b]))(d);
    s.append('path').attr('d', band(0, 4)).attr('fill', '#E9EDF3');
    s.append('path').attr('d', band(1, 3)).attr('fill', '#C9D0DB');
    s.append('path').attr('d', d3.line().defined((k) => k != null).x((k) => x(k.p)).y((k) => y(k.q[2]))(d)).attr('fill', 'none').attr('stroke', INK).attr('stroke-width', 2.5).attr('stroke-linejoin', 'round');
    const got = d.filter(Boolean);
    s.append('g').selectAll('circle').data(got).join('circle').attr('cx', (k) => x(k.p)).attr('cy', (k) => y(k.q[2])).attr('r', (k) => (k.p === base || k.p === last ? 4.5 : 3)).attr('fill', INK).attr('stroke', '#fff').attr('stroke-width', 1);
    /* values at the newest year (all five) and at 2018/19 (the middle half and the middle school) */
    const words = ['one in ten below', 'a quarter below', 'the middle school', 'three quarters below', 'nine in ten below'];
    const label = (p, ks, dx, short) => { if (!Q[p]) return; const q = Q[p].q, ys = spreadOut(ks.map((k) => y(q[k]) + 4), m.t + 10, H - m.b - 2);
      ks.forEach((k, j) => { const t = s.append('text').attr('x', x(p) + dx).attr('y', ys[j]); t.append('tspan').attr('class', k === 2 ? 'strong' : 'px-val').text(short ? (q[k] / 100).toFixed(1) : pc(q[k]));
        if (!short && !narrow && p === last) t.append('tspan').attr('class', k === 2 ? 'strong' : null).text(' ' + words[k]); }); };
    label(last, [0, 1, 2, 3, 4], 10, false);
    if (base !== last && !Q[String(+base + 1)]) label(base, [1, 2, 3], 9, st < 30);
    tipOn(s.append('g').selectAll('rect').data(got).join('rect').attr('x', (k) => x(k.p) - st / 2).attr('width', st).attr('y', m.t).attr('height', H - m.b - m.t).attr('fill', 'transparent'),
      (k) => `<b>${ay(k.p)}</b> · ${k.n.toLocaleString('en-GB')} ${PH[phase]}<br>The middle school: <b>${pc(k.q[2])}</b><br>The middle half: ${pc(k.q[1])} to ${pc(k.q[3])}<br>The middle eight in ten: ${pc(k.q[0])} to ${pc(k.q[4])}`);
    key(el, [`<i class="ln" style="border-color:${INK}"></i>The middle school`, `<i style="background:#C9D0DB"></i>The middle half of schools`, `<i style="background:#E9EDF3"></i>The middle eight in ten`, `<i style="background:#F4F5F8;border:1px solid #D5DBE5"></i>${yrs.filter((p) => !Q[p]).map(ay).join(', ')}: no figures published`]);
    const a = Q[base].q, b = Q[last].q, sa = gap(a[3], a[1]), sb = gap(b[3], b[1]);
    $('px-ridge-h').textContent = sb > sa ? 'Schools are further apart than in ' + ay(base) : 'How schools are spread, year by year';
    $('px-ridge-r').innerHTML = `In ${ay(last)} the middle half of ${PH[phase]} had overall absence between <b>${pc(b[1])}</b> and <b>${pc(b[3])}</b>, a spread of <b>${pts(sb)}</b> points. In ${ay(base)} the spread was <b>${pts(sa)}</b> points, from ${pc(a[1])} to ${pc(a[3])}. The middle school moved from <b>${pc(a[2])}</b> to <b>${pc(b[2])}</b>.`;
  }

  const the = (n) => (/^(North|South|East|West) /.test(n) ? 'the ' + n : n), list = (ns) => (ns.length > 1 ? ns.slice(0, -1).map(the).join(', ') + ' and ' + the(ns[ns.length - 1]) : the(ns[0]));
  const signed = (t) => (t > 0 ? '+' : t < 0 ? '−' : '') + pts(t);
  let rview = 'now';
  function regions() {
    const el = $('px-reg'), R = P.regions[phase], i = MI[meas], last = P.fy[P.fy.length - 1], base = '2018'; el.innerHTML = '';
    const val = (n, p) => { const k = P.fy.indexOf(p), v = k < 0 ? null : R[n][k]; return v ? v[i] : null; };
    /* everything in tenths of a point, rounded first, so every gap agrees with the figures as printed */
    const now = (n) => Math.round(val(n, last) / 10), chg = (n) => gap(val(n, last), val(n, base));
    const names = Object.keys(R).filter((n) => n !== 'England' && val(n, last) != null && val(n, base) != null).sort((p, q) => val(p, last) - val(q, last) || p.localeCompare(q));
    const W = width(el), wide = W >= 720, seg = $('px-rview'); seg.hidden = wide;
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === rview)));
    const V = {now: {f: now, fmt: (t) => (t / 10).toFixed(1) + '%', title: ay(last), tick: (t) => (t / 10) + '%'},
      chg: {f: chg, fmt: signed, title: 'Change since ' + ay(base) + ', percentage points', tick: (t) => signed(t).replace('.0', '')}};
    const views = wide ? ['now', 'chg'] : [rview], nw = wide ? 190 : 0, gut = 44, pw = (W - nw - gut * (views.length - 1)) / views.length, rh = wide ? 30 : 42, top = 50, H = top + names.length * rh + 26;
    const s = svg(el, W, H, MN[meas] + ' in ' + PH[phase] + ' by region in ' + ay(last) + ', and the change since ' + ay(base) + ', each against England');
    const rowY = (k) => top + k * rh + (wide ? rh / 2 : 29);
    names.forEach((n, k) => { if (wide && k % 2 === 0) s.append('rect').attr('x', 0).attr('width', W).attr('y', top + k * rh).attr('height', rh).attr('fill', '#F7F8FA');
      if (!wide && k) s.append('line').attr('x1', 0).attr('x2', W).attr('y1', top + k * rh - 1).attr('y2', top + k * rh - 1).attr('stroke', GRID);
      s.append('text').attr('class', 'px-name').attr('x', wide ? 8 : 0).attr('y', wide ? rowY(k) + 4 : top + k * rh + 14).text(n); });
    views.forEach((v, j) => { const D = V[v], x0 = nw + j * (pw + gut), e = D.f('England'), vals = names.map(D.f), lo = Math.min(e, d3.min(vals)), hi = Math.max(e, d3.max(vals)), pad = Math.max(1, (hi - lo) * 0.06);
      const x = d3.scaleLinear([lo - pad, hi + pad], [x0 + 46, x0 + pw - 46]);
      s.append('text').attr('class', 'strong').attr('x', x0).attr('y', 12).text(D.title);
      x.ticks(pw < 380 ? 3 : 5).forEach((t) => { s.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', top).attr('y2', H - 24).attr('stroke', wide ? '#E3E7EE' : GRID); s.append('text').attr('x', x(t)).attr('y', H - 8).attr('text-anchor', 'middle').text(D.tick(t)); });
      s.append('line').attr('x1', x(e)).attr('x2', x(e)).attr('y1', top - 8).attr('y2', H - 24).attr('stroke', MUTED).attr('stroke-width', 1.5);
      const et = 'England ' + D.fmt(e), ew = et.length * 6.4; s.append('text').attr('x', Math.max(x0 + ew / 2, Math.min(x0 + pw - ew / 2, x(e)))).attr('y', top - 14).attr('text-anchor', 'middle').attr('fill', MUTED).text(et);
      names.forEach((n, k) => { const t = D.f(n), dlt = t - e, col = AXc.gap(dlt), yy = rowY(k);
        if (dlt) s.append('line').attr('x1', x(e)).attr('x2', x(t)).attr('y1', yy).attr('y2', yy).attr('stroke', col).attr('stroke-width', 4);
        s.append('circle').attr('cx', x(t)).attr('cy', yy).attr('r', 5.5).attr('fill', col).attr('stroke', '#fff').attr('stroke-width', 1);
        s.append('text').attr('class', 'strong').attr('x', x(t) + (dlt < 0 ? -10 : 10)).attr('y', yy + 4).attr('text-anchor', dlt < 0 ? 'end' : 'start').text(D.fmt(t)); }); });
    const rel = (t, than) => (t === 0 ? 'the same as ' + than : pts(t) + ' points ' + (t < 0 ? 'lower' : 'higher') + ' than ' + than);
    tipOn(s.append('g').selectAll('rect').data(names).join('rect').attr('x', 0).attr('width', W).attr('y', (n, k) => top + k * rh).attr('height', rh).attr('fill', 'transparent'),
      (n) => `<b>${n}</b><br>${ay(last)}: ${MN[meas]} ${V.now.fmt(now(n))}, ${rel(now(n) - now('England'), 'England')} (${V.now.fmt(now('England'))})<br>${ay(base)}: ${pc(val(n, base))}<br>Change: ${signed(chg(n))} points; England ${signed(chg('England'))}`);
    key(el, [`<i style="background:${AXc.VERD}"></i>Below England`, `<i style="background:${AXc.RUST}"></i>Above England`, `<i style="background:${MUTED};width:2px;height:12px;vertical-align:-2px"></i>England`]);
    const ends = (f) => { const a = d3.min(names, f), b = d3.max(names, f); return {lo: a, hi: b, los: names.filter((n) => f(n) === a).sort(), his: names.filter((n) => f(n) === b).sort()}; };
    const A = ends(now), C = ends(chg), ce = chg('England'), allUp = ce > 0 && C.lo > 0, allDown = ce < 0 && C.hi < 0;
    $('px-reg-s').textContent = `Today’s schools in each region pooled for the full school year ${ay(last)}, in order of ${MN[meas]}, each set against England. The change since ${ay(base)} is in percentage points and is set against England’s change.`;
    $('px-reg-r').innerHTML = `In ${ay(last)}, ${MN[meas]} in ${PH[phase]} was lowest in ${list(A.los)} (<b>${V.now.fmt(A.lo)}</b>) and highest in ${list(A.his)} (<b>${V.now.fmt(A.hi)}</b>), against <b>${V.now.fmt(now('England'))}</b> across England. ` +
      (allUp ? `Since ${ay(base)} it has risen by <b>${pts(ce)}</b> points across England. The rise was smallest in ${list(C.los)} (${pts(C.lo)} points) and largest in ${list(C.his)} (${pts(C.hi)} points).`
        : allDown ? `Since ${ay(base)} it has fallen by <b>${pts(ce)}</b> points across England. The fall was largest in ${list(C.los)} (${pts(C.lo)} points) and smallest in ${list(C.his)} (${pts(C.hi)} points).`
        : `Since ${ay(base)} the change across England was <b>${signed(ce)}</b> points. Among regions it ran from ${signed(C.lo)} points in ${list(C.los)} to ${signed(C.hi)} points in ${list(C.his)}.`);
  }

  function model() {
    const M = P.model && P.model.phases[phase]; $('px-model-w').hidden = !M; $('px-model-s').hidden = !M; $('px-model-x').hidden = !!M; if (!M) return;
    $('px-model-s').textContent = `Each of the ${M.n.toLocaleString('en-GB')} ${PH[phase]} is matched to the ${P.model.k || 20} schools nearest to it on these factors. A factor counts for more where it goes more strongly with overall absence across schools in the autumn and spring terms ${ay(P.model.period)}.`;
    $('px-model').innerHTML = '<thead><tr><th>Factor</th><th class="n">Average school</th><th class="n">Weight in the match</th></tr></thead><tbody>' + M.factors.map((f, k) =>
      `<tr><td>${M.labels[k]}</td><td class="n">${f === 'log_pupils' ? Math.round(Math.exp(M.mean[k])) + ' pupils' : f === 'rural' || f === 'selective' ? Math.round(M.mean[k] * 100) + '% of schools' : M.mean[k].toFixed(1) + '%'}</td><td class="n">${Math.round(M.weights[k] * 100)}%</td></tr>`).join('') + '</tbody>';
  }

  /* method tabs: arrow keys, Home and End move between tabs, as in the Ofsted Explorer */
  const tabs = [...document.querySelectorAll('.px-tabs [role=tab]')];
  const showTab = (t, focus) => { tabs.forEach((b) => { const on = b === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; const pnl = $(b.getAttribute('aria-controls')); if (pnl) pnl.hidden = !on; });
    const bar = t.parentNode; if (bar.scrollWidth > bar.clientWidth) bar.scrollLeft = Math.max(0, t.offsetLeft - bar.offsetLeft - 24); if (focus) t.focus({preventScroll: true}); };
  tabs.forEach((t, k) => { t.addEventListener('click', () => showTab(t));
    t.addEventListener('keydown', (e) => { const c = e.key; if (c === 'ArrowRight' || c === 'ArrowLeft' || c === 'Home' || c === 'End') { e.preventDefault();
      showTab(tabs[c === 'Home' ? 0 : c === 'End' ? tabs.length - 1 : (k + (c === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length], true); } }); });

  // severe absence (half or more of sessions missed), England by phase: pooled from schools, never shown for one school
  function severe() {
    const el = $('px-sev'), yrs = years(); el.innerHTML = '';
    const get = (ph, p) => { const v = B.bench.E[ph] && B.bench.E[ph][p]; return v && v[4] != null ? v[4] : null; };
    const W = width(el), H = Math.round(Math.min(380, Math.max(240, W * 0.44))), m = {t: 14, r: W < 560 ? 16 : 150, b: 30, l: 42}, s = svg(el, W, H, 'Severe absence by school year');
    const phs = ['P', 'S', 'X'], all = phs.flatMap((ph) => yrs.map((p) => get(ph, p))).filter((v) => v != null);
    const x = d3.scalePoint(yrs, [m.l + 8, W - m.r - 8]), y = d3.scaleLinear([0, d3.max(all) * 1.06], [H - m.b, m.t]).nice(5);
    axes(s, x, y, W, H, m, yrs);
    const line = d3.line().defined((d) => d.v != null).x((d) => x(d.p)).y((d) => y(d.v));
    phs.slice().sort((a, b) => (a === phase) - (b === phase)).forEach((ph) => { const d = yrs.map((p) => ({p, v: get(ph, p)})), on = ph === phase;
      s.append('path').attr('d', line(d)).attr('fill', 'none').attr('stroke', on ? INK : SOFT).attr('stroke-width', on ? 3 : 2).attr('stroke-linejoin', 'round');
      tipOn(s.append('g').selectAll('circle').data(d.filter((k) => k.v != null)).join('circle').attr('cx', (k) => x(k.p)).attr('cy', (k) => y(k.v)).attr('r', on ? 3.5 : 8).attr('fill', on ? INK : 'transparent'), (k) => `<b>${PH[ph].replace(/^./, (c) => c.toUpperCase())}</b><br>${ay(k.p)}: severe absence ${pc(k.v)}`);
      const last = d.filter((k) => k.v != null).pop(); if (W >= 560 && last) s.append('text').attr('x', x(last.p) + 12).attr('y', y(last.v) + 4).attr('class', on ? 'strong' : null).text(PH[ph].replace(/^./, (c) => c.toUpperCase()).replace(' schools', '') + ' ' + pc(last.v)); });
    key(el, [`<i class="ln" style="border-color:${INK}"></i>${PH[phase].replace(/^./, (c) => c.toUpperCase())}`, `<i class="ln" style="border-color:${SOFT}"></i>The other phases`]);
    const a = get(phase, '2018'), last = P.fy[P.fy.length - 1], b = get(phase, last);
    $('px-sev-h').textContent = a && b && b >= 2 * a ? 'Severe absence has more than doubled since 2018/19' : 'Severe absence, year by year';
    $('px-sev-r').innerHTML = a == null || b == null ? '' : `In ${ay(last)}, <b>${pc(b)}</b> of pupils in ${PH[phase]} missed half or more of their sessions. In 2018/19 it was <b>${pc(a)}</b>, so the share is ${(b / a).toFixed(1)} times what it was.`;
  }

  // the school year day by day for England (the DfE's in-year data): one square a day, green below the year's average, rust above
  let PULSE = null;
  function calendar() {
    const el = $('px-cal'); if (!PULSE) { d3.json('/attendance/data/pulse.json').then((j) => { PULSE = j; calendar(); }).catch(() => { $('px-cal-c').hidden = true; }); return; }
    el.innerHTML = ''; const Pz = PULSE, D = Pz.england, ph = phase, yrsC = Pz.years.map(String).reverse(), full = yrsC[yrsC.length - 1], W = width(el), narrow = W < 520;
    const fullVals = D[full][ph].abs.filter((v) => v != null), mid = d3.mean(fullVals), sorted = fullVals.slice().sort(d3.ascending), span = Math.max(d3.quantile(sorted, 0.97) - mid, mid - d3.quantile(sorted, 0.03));
    const base = (y) => { const d = new Date(Date.UTC(+y, 8, 1)); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d; }, dow = (iso) => (new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7;
    const fmt = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
    const nW = 47, left = narrow ? 30 : 64, cw = (W - left) / nW, chh = narrow ? 13 : Math.min(18, cw), gp = Math.min(2, cw * 0.18), blockH = chh * 5, top = 36, pitch = blockH + 48, H = top + yrsC.length * pitch - 12;
    const s = svg(el, W, H, 'Calendar of overall absence in England, one square per school day');
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    yrsC.forEach((yy, yi) => { const g = s.append('g').attr('transform', `translate(0,${top + yi * pitch})`).attr('class', 'ax-cells');
      g.append('text').attr('x', 0).attr('y', -22).attr('class', 'strong').text(ay(yy));
      if (!narrow) ['Mon', '', 'Wed', '', 'Fri'].forEach((t, i) => g.append('text').attr('x', left - 8).attr('y', i * chh + chh * 0.72).attr('text-anchor', 'end').text(t));
      months.forEach((mo, mi) => { const d = new Date(Date.UTC(+yy + (mi > 3 ? 1 : 0), (8 + mi) % 12, 1)), ix = Math.floor((d - base(yy)) / 6048e5 + 0.99); if (ix < nW && (!narrow || mi % 2 === 0)) g.append('text').attr('x', left + ix * cw).attr('y', -6).text(mo); });
      for (let wk = 0; wk < nW; wk++) for (let d = 0; d < 5; d++) g.append('rect').attr('x', left + wk * cw).attr('y', d * chh).attr('width', cw - gp).attr('height', chh - gp).attr('fill', 'none').attr('stroke', GRID).attr('pointer-events', 'none');
      const cells = Pz.days[yy].map((iso, i) => ({iso, v: D[yy][ph].abs[i]})).filter((c) => c.v != null);
      tipOn(g.selectAll('rect.c').data(cells).join('rect').attr('class', 'c').attr('x', (c) => left + Math.floor((Date.parse(c.iso + 'T00:00:00Z') - base(yy)) / 6048e5) * cw).attr('y', (c) => dow(c.iso) * chh).attr('width', cw - gp).attr('height', chh - gp).attr('fill', (c) => AXc.div(c.v, mid, span)),
        (c) => `<b>${fmt(c.iso)}</b><br>Overall absence ${pc(c.v)}`); });
    key(el, [AXc.legend(mid, span, 'the average day of ' + ay(full)), 'Blank squares are holidays, or days when under 80% of the usual pupils were due in' + (phase === 'S' ? '. In secondary schools that includes most days from June, once Year 11 has left' : '')]);
    const by = [0, 1, 2, 3, 4].map((d) => d3.mean(Pz.days[full].map((iso, i) => (dow(iso) === d ? D[full][ph].abs[i] : null)).filter((v) => v != null))), midwk = d3.mean([by[1], by[2], by[3]]);
    const mAvg = (m) => d3.mean(Pz.days[full].map((iso, i) => (+iso.slice(5, 7) === m ? D[full][ph].abs[i] : null)).filter((v) => v != null));
    $('px-cal-r').innerHTML = `Across ${ay(full)} in England’s ${PH[phase]}, Fridays averaged <b>${pc(by[4])}</b> and Mondays <b>${pc(by[0])}</b>, against <b>${pc(midwk)}</b> from Tuesday to Thursday. September averaged ${pc(mAvg(9))}, December ${pc(mAvg(12))} and July ${pc(mAvg(7))}.`;
  }

  let token = 0;
  function draw() {
    document.querySelectorAll('#px-phase button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === phase)));
    document.querySelectorAll('#px-meas button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === meas)));
    const q = new URLSearchParams(); if (phase !== 'S') q.set('phase', phase); if (meas !== 'abs') q.set('m', meas); if (xf !== 'fsm') q.set('x', xf); if (rview !== 'now') q.set('rv', rview);
    history.replaceState(null, '', location.pathname + (q.toString() ? '#' + q : ''));
    gradient(); spread(); regions(); severe(); model(); calendar();
    const t = ++token; getDist(phase).then((D) => { if (t === token) scatter(D); });
  }

  Promise.all([d3.json('/attendance/data/bench.json'), d3.json('/attendance/data/patterns.json')]).then(([b, p]) => {
    B = b; P = p; const q = new URLSearchParams(location.hash.slice(1)); if (PH[q.get('phase')]) phase = q.get('phase'); if (q.get('m') === 'pa') meas = 'pa'; if (XN[q.get('x')]) xf = q.get('x'); if (q.get('rv') === 'chg') rview = 'chg';
    $('px-x').value = xf; $('px-x').addEventListener('change', () => { xf = $('px-x').value; draw(); });
    $('px-phase').addEventListener('click', (e) => { const k = e.target.closest('button'); if (k) { phase = k.dataset.p; draw(); } });
    $('px-rview').addEventListener('click', (e) => { const k = e.target.closest('button'); if (k) { rview = k.dataset.v; draw(); } });
    $('px-meas').addEventListener('click', (e) => { const k = e.target.closest('button'); if (k) { meas = k.dataset.m; draw(); } });
    $('px-date').textContent = `Full school years to ${ay(B.fy_last)}; school by school for the autumn and spring terms ${ay(B.latest)}. Published by the DfE on ${date(B.release.full_year.published)} and ${date(B.release.autumn_spring.published)}.`;
    $('px-src-fy').textContent = `full school years ${ay(P.fy[0])} to ${ay(B.fy_last)}, published ${date(B.release.full_year.published)}`;
    $('px-src-as').textContent = `autumn and spring terms ${ay(B.latest)}, published ${date(B.release.autumn_spring.published)}`;
    document.querySelectorAll('.px-latest').forEach((n) => { n.textContent = ay(B.latest); }); document.querySelectorAll('.px-fylast').forEach((n) => { n.textContent = ay(B.fy_last); });
    let w = innerWidth; addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; draw(); } });
    draw();
  }).catch((e) => { console.error(e); $('px-date').textContent = 'The data could not be loaded. Please try again shortly.'; });
})();
