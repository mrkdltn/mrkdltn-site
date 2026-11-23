/* Attendance Explorer: what saved places are for. Each saved place is shown with its latest figure, and saved
   places of one kind can be opened side by side. Everything stays in this browser. */
(function () {
  const host = document.getElementById('ax-places'); if (!host || !window.AXtools) return;
  const pc = (v) => (v == null ? '' : (v / 100).toFixed(1) + '%');
  let bench = null; const get = (u) => fetch(u).then((r) => r.json()), cache = new Map(), once = (u) => { if (!cache.has(u)) cache.set(u, get(u)); return cache.get(u); };
  const SH = {t: 16, c: 16, w: 64, y: 1, a: 8}, PH = {P: 'primary', S: 'secondary', X: 'special'};
  const figure = (p) => once('/attendance/data/bench.json').then((B) => { bench = B;
    if (p.kind === 'school') return once(`/attendance/data/sch/${(+p.id) % B.shards}.json`).then((j) => { const s = j[p.id], v = s && s.h[B.latest]; return v ? `${pc(v[1])} overall absence` : ''; });
    if (p.kind === 'group') { const [k, id] = String(p.id).split(/:(.*)/); const sh = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % SH[k];
      return once(`/attendance/data/grp/${k}${sh}.json`).then((j) => { const g = j[id]; if (!g) return ''; const ph = ['S', 'P', 'X'].find((x) => g.bench[x] && g.bench[x][B.latest]); return ph ? `${pc(g.bench[ph][B.latest][0])} in its ${PH[ph]} schools` : ''; }); }
    return once('/attendance/data/pulse.json').then((P) => { const y = String(P.years[P.years.length - 1]), v = P.ytd[p.id] && P.ytd[p.id][y] && P.ytd[p.id][y].A; return v ? `${pc(v.abs)} so far this year` : ''; });
  }).catch(() => '');
  const decorate = () => { const pins = AXtools.pins(); if (!pins.length) return;
    host.querySelectorAll('a[href]').forEach((a) => { if (a.dataset.fig) return; const p = pins.find((x) => a.getAttribute('href') === x.href); if (!p) return; a.dataset.fig = '1';
      figure(p).then((t) => { if (!t || a.querySelector('.ax-places-v')) return; const s = document.createElement('span'); s.className = 'ax-places-v'; s.textContent = ' ' + t; a.appendChild(s); }); });
    // side by side: schools together, or areas and trusts of one kind together
    const old = host.querySelector('.ax-places-cmp'); if (old) old.remove();
    const sch = pins.filter((p) => p.kind === 'school'), byKind = {}; pins.filter((p) => p.kind === 'group').forEach((p) => { const k = String(p.id).split(':')[0]; (byKind[k] = byKind[k] || []).push(String(p.id).slice(k.length + 1)); });
    const links = []; if (sch.length > 1) links.push([`Compare your ${sch.length} schools`, sch[0].href + '#vs=' + sch.slice(1, 5).map((p) => p.id).join(',')]);
    const KN = {t: 'trusts', c: 'constituencies', w: 'wards', y: 'counties', a: 'local authorities'};
    Object.entries(byKind).forEach(([k, ids]) => { if (ids.length > 1) links.push([`Compare your ${ids.length} ${KN[k]}`, `/attendance/group/?k=${k}&id=${encodeURIComponent(ids[0])}&vs=${ids.slice(1, 5).map(encodeURIComponent).join(',')}`]); });
    if (links.length) { const d = document.createElement('p'); d.className = 'ax-places-cmp'; d.innerHTML = links.map((l) => `<a href="${l[1]}">${l[0]}</a>`).join(' · '); host.appendChild(d); }
  };
  new MutationObserver(() => setTimeout(decorate, 50)).observe(host, {childList: true, subtree: false});
  setTimeout(decorate, 400);
})();
