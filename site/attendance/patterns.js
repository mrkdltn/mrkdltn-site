/* Attendance Explorer: patterns across all schools.
   Data: patterns.json (free school meal groups, yearly distributions, regions, the model), dist_<phase>.json (every school),
   bench.json (periods and sources). Pooled values are [overall, unauthorised, persistent]; rates in hundredths of a point. */
(function () {
  const INK = '#0B1A2E', MUTED = '#55627A', VERD = '#2F6F66', GRID = '#EEF1F5', SOFT = '#C9D0DB';
  const SHADES = ['#1E544D', '#6FA299', '#9AA3B2', '#C98672', '#7A2617'];
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
    s.append('path').attr('d', line(bins)).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 5); s.append('path').attr('d', line(bins)).attr('fill', 'none').attr('stroke', VERD).attr('stroke-width', 2.5);
    const M = P.model && P.model.phases[phase], items = [`<i style="background:${SOFT};border-radius:50%;width:8px;height:8px"></i>${idx.length.toLocaleString('en-GB')} ${PH[phase]}`, `<i class="ln" style="border-color:${VERD}"></i>Middle school of each twentieth`];
    key(el, items);
    $('px-scat-r').innerHTML = `In the twentieth of ${PH[phase]} with the fewest pupils ${XN[xf]}, the middle school had ${MN[meas]} of <b>${pc(bins[0].v)}</b>; in the twentieth with the most, <b>${pc(bins[19].v)}</b>.`;
  }

  function ridges() {
    const el = $('px-ridge'), R = P.ridges[phase]; el.innerHTML = '';
    const yrs = P.fy.slice().reverse(), W = width(el), rh = W < 480 ? 26 : 32, m = {t: 40, r: 14, b: 30, l: 60}, H = m.t + yrs.length * rh + m.b, s = svg(el, W, H, 'Distribution of overall absence by year');
    const nb = R.years[yrs[0]].bins.length, x = d3.scaleLinear([0, nb * R.step], [m.l, W - m.r]), mx = d3.max(yrs, (p) => d3.max(R.years[p].bins) / R.years[p].n), h = d3.scaleLinear([0, mx], [0, rh * 2.2]);
    x.ticks(W < 480 ? 5 : 8).forEach((t) => { s.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', m.t - 20).attr('y2', H - m.b).attr('stroke', GRID); s.append('text').attr('x', x(t)).attr('y', H - 8).attr('text-anchor', 'middle').text((t / 100) + '%'); });
    yrs.slice().reverse().forEach((p) => { const i = yrs.indexOf(p), y0 = m.t + (i + 1) * rh, Y = R.years[p], pts2 = Y.bins.map((n, k) => [x((k + 0.5) * R.step), y0 - h(n / Y.n)]);
      const area = d3.area().x((d) => d[0]).y0(y0).y1((d) => d[1]).curve(d3.curveBasis)(pts2);
      s.append('path').attr('d', area).attr('fill', p >= '2020' ? '#D5DBE5' : '#E9EDF3').attr('fill-opacity', 0.9).attr('stroke', p >= '2020' ? INK : MUTED).attr('stroke-width', 1.2);
      s.append('line').attr('x1', x(Y.median)).attr('x2', x(Y.median)).attr('y1', y0).attr('y2', y0 - 9).attr('stroke', '#7A5C14').attr('stroke-width', 2);
      s.append('text').attr('x', m.l - 8).attr('y', y0 - 3).attr('text-anchor', 'end').attr('class', 'strong').text(ay(p)); });
    key(el, [`<i style="background:#E9EDF3;border:1px solid ${MUTED}"></i>Before the pandemic`, `<i style="background:#D5DBE5;border:1px solid ${INK}"></i>Since`, `<i style="background:#7A5C14;width:2px;height:12px"></i>The middle school`]);
    const a = R.years['2018'], b = R.years[P.fy[P.fy.length - 1]];
    $('px-ridge-r').innerHTML = `The middle school among ${PH[phase]} had overall absence of <b>${pc(a.median)}</b> in 2018/19 and <b>${pc(b.median)}</b> in ${ay(P.fy[P.fy.length - 1])}.`;
  }

  function regions() {
    const el = $('px-reg'), R = P.regions[phase], i = MI[meas], yrs = years(); el.innerHTML = '';
    const val = (n, p) => { const k = P.fy.indexOf(p), v = k < 0 ? null : R[n][k]; return v ? v[i] : null; }, names = Object.keys(R).filter((n) => n !== 'England').sort();
    const mx = d3.max(names.concat(['England']).flatMap((n) => yrs.map((p) => val(n, p))).filter((v) => v != null)), W = 220, H = 130, m = {t: 6, r: 6, b: 18, l: 30};
    const x = d3.scalePoint(yrs, [m.l, W - m.r]), y = d3.scaleLinear([0, mx * 1.05], [H - m.b, m.t]).nice(3), line = d3.line().defined((d) => d.v != null).x((d) => x(d.p)).y((d) => y(d.v));
    names.forEach((n) => { const box = el.appendChild(document.createElement('div')); box.className = 'ax-chart'; const last = P.fy[P.fy.length - 1]; box.innerHTML = `<h3>${n}</h3>`;
      const s = svg(box, W, H, n + ': ' + MN[meas] + ' by year');
      y.ticks(3).forEach((t) => { s.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', GRID); s.append('text').attr('x', m.l - 4).attr('y', y(t) + 4).attr('text-anchor', 'end').text((t / 100) + '%'); });
      [yrs[0], last].forEach((p, k) => s.append('text').attr('x', x(p)).attr('y', H - 4).attr('text-anchor', k ? 'end' : 'start').text(ay(p)));
      s.append('path').attr('d', line(yrs.map((p) => ({p, v: val('England', p)})))).attr('fill', 'none').attr('stroke', MUTED).attr('stroke-width', 1.5);
      s.append('path').attr('d', line(yrs.map((p) => ({p, v: val(n, p)})))).attr('fill', 'none').attr('stroke', INK).attr('stroke-width', 2.5);
      s.append('text').attr('class', 'strong').attr('x', W - m.r).attr('y', Math.max(12, y(val(n, last)) - 7)).attr('text-anchor', 'end').text(pc(val(n, last))); });
  }

  function model() {
    const card = $('px-model-c'), M = P.model && P.model.phases[phase]; card.hidden = !M; if (!M) return;
    $('px-model-s').textContent = `Each of the ${M.n.toLocaleString('en-GB')} ${PH[phase]} is matched to the 20 schools nearest to it on these factors. A factor counts for more where it goes more strongly with overall absence across schools in the autumn and spring terms ${ay(P.model.period)}.`;
    $('px-model').innerHTML = '<thead><tr><th>Factor</th><th class="n">Average school</th><th class="n">Weight in the match</th></tr></thead><tbody>' + M.factors.map((f, k) =>
      `<tr><td>${M.labels[k]}</td><td class="n">${f === 'log_pupils' ? Math.round(Math.exp(M.mean[k])) + ' pupils' : f === 'rural' || f === 'selective' ? Math.round(M.mean[k] * 100) + '% of schools' : M.mean[k].toFixed(1) + '%'}</td><td class="n">${Math.round(M.weights[k] * 100)}%</td></tr>`).join('') + '</tbody>';
  }

  let token = 0;
  function draw() {
    document.querySelectorAll('#px-phase button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === phase)));
    document.querySelectorAll('#px-meas button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === meas)));
    const q = new URLSearchParams(); if (phase !== 'S') q.set('phase', phase); if (meas !== 'abs') q.set('m', meas); if (xf !== 'fsm') q.set('x', xf);
    history.replaceState(null, '', location.pathname + (q.toString() ? '#' + q : ''));
    gradient(); ridges(); regions(); model();
    const t = ++token; getDist(phase).then((D) => { if (t === token) scatter(D); });
  }

  Promise.all([d3.json('/attendance/data/bench.json'), d3.json('/attendance/data/patterns.json')]).then(([b, p]) => {
    B = b; P = p; const q = new URLSearchParams(location.hash.slice(1)); if (PH[q.get('phase')]) phase = q.get('phase'); if (q.get('m') === 'pa') meas = 'pa'; if (XN[q.get('x')]) xf = q.get('x');
    $('px-x').value = xf; $('px-x').addEventListener('change', () => { xf = $('px-x').value; draw(); });
    $('px-phase').addEventListener('click', (e) => { const k = e.target.closest('button'); if (k) { phase = k.dataset.p; draw(); } });
    $('px-meas').addEventListener('click', (e) => { const k = e.target.closest('button'); if (k) { meas = k.dataset.m; draw(); } });
    $('px-date').textContent = `Full school years to ${ay(B.fy_last)}; school by school for the autumn and spring terms ${ay(B.latest)}. Published by the DfE on ${date(B.release.full_year.published)} and ${date(B.release.autumn_spring.published)}.`;
    $('px-src').textContent = `published ${date(B.release.full_year.published)} and ${date(B.release.autumn_spring.published)}`;
    let w = innerWidth; addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; draw(); } });
    draw();
  }).catch((e) => { console.error(e); $('px-date').textContent = 'The data could not be loaded. Please try again shortly.'; });
})();
